<?php
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../includes/inventory.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$cashierId = $_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['items']) || !isset($data['paymentType']) || !isset($data['subtotal']) || !isset($data['discount']) || !isset($data['total'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$items = $data['items'];
$paymentType = $data['paymentType'];
$subtotal = (float)$data['subtotal'];
$discount = (float)$data['discount'];
$total = (float)$data['total'];
$invoiceNo = isset($data['invoiceNo']) ? trim($data['invoiceNo']) : '';

if (!in_array($paymentType, ['cash', 'gcash', 'maya'], true) || $subtotal < 0 || $discount < 0 || $total < 0 || empty($items)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    if ($invoiceNo === '') {
        $invoiceNo = 'POS-' . date('Ymd') . '-' . str_pad((string)mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
    }
    $transactionId = bin2hex(random_bytes(16));
    $createdAt = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("INSERT INTO transactions (id, invoiceNo, subtotal, discount, total, paymentType, cashierId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)");
    $stmt->execute([$transactionId, $invoiceNo, $subtotal, $discount, $total, $paymentType, $cashierId, $createdAt]);

    $transactionItems = [];

    foreach ($items as $item) {
        if (!isset($item['productId']) || !isset($item['quantity']) || !isset($item['unitPrice'])) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'Invalid item data']);
            exit;
        }

        $productId = trim($item['productId']);
        $variantId = isset($item['variantId']) ? trim($item['variantId']) : null;
        $productName = isset($item['productName']) ? trim($item['productName']) : '';
        $variantName = isset($item['variantName']) ? trim($item['variantName']) : null;
        $quantity = (int)$item['quantity'];
        $unitPrice = (float)$item['unitPrice'];
        $tier = isset($item['tier']) ? trim($item['tier']) : 'shelf';

        $tierColumns = [
            'wholesale' => 'wholesaleQty',
            'retail' => 'retailQty',
            'shelf' => 'shelfQty',
        ];

        if (!isset($tierColumns[$tier])) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'Invalid tier specified for item stock adjustment']);
            exit;
        }

        if ($quantity <= 0 || $unitPrice < 0 || $productId === '') {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'Invalid item values']);
            exit;
        }

        if ($productName === '') {
            $stmt = $pdo->prepare("SELECT name FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            $prod = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($prod) {
                $productName = $prod['name'];
            }
        }

        if ($variantId && $variantName === null) {
            $stmt = $pdo->prepare("SELECT name FROM product_variants WHERE id = ?");
            $stmt->execute([$variantId]);
            $var = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($var) {
                $variantName = $var['name'];
            }
        }

        $itemId = bin2hex(random_bytes(16));
        $itemSubtotal = $quantity * $unitPrice;

        $stmt = $pdo->prepare("INSERT INTO transaction_items (id, transactionId, productId, variantId, productName, variantName, quantity, unitPrice, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$itemId, $transactionId, $productId, $variantId, $productName, $variantName, $quantity, $unitPrice, $itemSubtotal]);

        $transactionItems[] = [
            'id' => $itemId,
            'productId' => $productId,
            'variantId' => $variantId,
            'productName' => $productName,
            'variantName' => $variantName,
            'quantity' => $quantity,
            'unitPrice' => $unitPrice,
            'subtotal' => $itemSubtotal,
        ];

        $quantityColumn = $tierColumns[$tier];
        $inventory = getOrCreateInventoryLevel($pdo, $productId, $variantId, true);
        $inventoryId = $inventory['id'];

        if ((int) $inventory[$quantityColumn] < $quantity) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'Insufficient stock for product']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE inventory_levels SET {$quantityColumn} = {$quantityColumn} - :quantity WHERE id = :id");
        $stmt->execute([
            ':quantity' => $quantity,
            ':id' => $inventoryId,
        ]);

        $batchAllocations = moveBatchStockFEFO($pdo, $productId, $variantId, $tier, null, $quantity);

        insertStockMovement($pdo, [
            'id' => bin2hex(random_bytes(16)),
            'productId' => $productId,
            'variantId' => $variantId,
            'movementType' => 'sale',
            'fromTier' => $tier,
            'toTier' => null,
            'quantity' => $quantity,
            'reason' => 'POS checkout',
            'notes' => buildBatchAllocationMovementNotes('transaction_item', $itemId, $batchAllocations),
            'performedBy' => $cashierId,
        ]);

        $stmt = $pdo->prepare("SELECT {$quantityColumn} AS quantity, reorderLevel FROM inventory_levels WHERE id = :id");
        $stmt->execute([':id' => $inventoryId]);
        $updatedInventory = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($updatedInventory && $updatedInventory['quantity'] <= $updatedInventory['reorderLevel']) {
            $alertId = bin2hex(random_bytes(16));
            $message = "Stock level for {$productName}" . ($variantName ? " ({$variantName})" : "") . " is low: {$updatedInventory['quantity']} remaining.";
            $stmt = $pdo->prepare("INSERT INTO alerts (id, type, priority, title, message, productId) VALUES (?, 'low_stock', 'high', 'Low Stock Alert', ?, ?)");
            $stmt->execute([$alertId, $message, $productId]);
        }
    }

    $pdo->commit();

    $response = [
        'id' => $transactionId,
        'invoiceNo' => $invoiceNo,
        'items' => $transactionItems,
        'subtotal' => $subtotal,
        'discount' => $discount,
        'total' => $total,
        'paymentType' => $paymentType,
        'cashierId' => $cashierId,
        'status' => 'completed',
        'createdAt' => $createdAt,
    ];

    echo json_encode($response);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Transaction failed: ' . $e->getMessage()]);
}
?>
