<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!$data || !isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: items array is required']);
    exit;
}

if (!isset($data['supplier']) || !isset($data['invoiceNumber'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: supplier and invoiceNumber are required']);
    exit;
}

$items = $data['items'];
$supplier = trim($data['supplier']);
$invoiceNumber = trim($data['invoiceNumber']);

// Validate each item
foreach ($items as $item) {
    if (!isset($item['productId']) || !isset($item['quantity']) || !isset($item['cost'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid item: productId, quantity, and cost are required']);
        exit;
    }
    if ($item['quantity'] <= 0 || $item['cost'] < 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid item: quantity must be > 0 and cost must be >= 0']);
        exit;
    }
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    $totalItems = 0;
    foreach ($items as $item) {
        $productId = trim($item['productId']);
        $variantId = isset($item['variantId']) ? trim($item['variantId']) : null;
        $quantity = (int)$item['quantity'];
        $cost = (float)$item['cost'];
        $tier = isset($item['tier']) ? trim($item['tier']) : 'wholesale';

        // Validate tier
        if (!in_array($tier, ['wholesale', 'retail', 'shelf'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid tier: must be wholesale, retail, or shelf']);
            exit;
        }

        // Verify product exists
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found: ' . $productId]);
            exit;
        }

        // Get or create inventory level
        $stmt = $pdo->prepare("SELECT id FROM inventory_levels WHERE productId = ? AND variantId IS NULL");
        $stmt->execute([$productId]);
        $inventoryExists = $stmt->fetch();

        if (!$inventoryExists) {
            // Create new inventory level
            $stmt = $pdo->prepare("
                INSERT INTO inventory_levels (id, productId, variantId, wholesaleQty, retailQty, shelfQty, 
                                              pcsPerPack, packsPerBox, reorderLevel, wholesaleUnit, retailUnit, createdAt, updatedAt)
                VALUES (?, ?, NULL, 0, 0, 0, 1, 1, 10, 'box', 'unit', NOW(), NOW())
            ");
            $stmt->execute([bin2hex(random_bytes(8)), $productId]);
        }

        // Update inventory based on tier (with row locking)
        $stmt = $pdo->prepare("SELECT * FROM inventory_levels WHERE productId = ? AND variantId IS NULL FOR UPDATE");
        $stmt->execute([$productId]);
        $currentInventory = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tier === 'wholesale') {
            $newQty = $currentInventory['wholesaleQty'] + $quantity;
            $stmt = $pdo->prepare("UPDATE inventory_levels SET wholesaleQty = ?, updatedAt = NOW() WHERE productId = ? AND variantId IS NULL");
        } elseif ($tier === 'retail') {
            $newQty = $currentInventory['retailQty'] + $quantity;
            $stmt = $pdo->prepare("UPDATE inventory_levels SET retailQty = ?, updatedAt = NOW() WHERE productId = ? AND variantId IS NULL");
        } else {
            $newQty = $currentInventory['shelfQty'] + $quantity;
            $stmt = $pdo->prepare("UPDATE inventory_levels SET shelfQty = ?, updatedAt = NOW() WHERE productId = ? AND variantId IS NULL");
        }
        $stmt->execute([$newQty, $productId]);

        // Record stock movement
        $stmt = $pdo->prepare("
            INSERT INTO stock_movements (id, productId, variantId, movementType, fromTier, toTier, quantity, 
                                         reason, notes, createdBy, createdAt)
            VALUES (?, ?, ?, 'receiving', NULL, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            bin2hex(random_bytes(8)),
            $productId,
            $variantId,
            $tier,
            $quantity,
            'Stock received from supplier',
            'Supplier: ' . $supplier . ' | Invoice: ' . $invoiceNumber,
            $userId
        ]);

        // Create product batch record
        $batchId = bin2hex(random_bytes(8));
        $batchNumber = 'RCV-' . time() . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        $expirationDate = date('Y-m-d', strtotime('+180 days'));

        $stmt = $pdo->prepare("
            INSERT INTO product_batches (id, productId, variantId, batchNumber, expirationDate, 
                                         receivedDate, initialQty, costPrice, supplierId, invoiceNumber, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'active', NOW(), NOW())
        ");
        $stmt->execute([
            $batchId,
            $productId,
            $variantId,
            $batchNumber,
            $expirationDate,
            $quantity,
            $cost,
            $supplier,
            $invoiceNumber
        ]);

        $totalItems += $quantity;
    }

    // Log activity
    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (id, userId, action, module, description, details, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        bin2hex(random_bytes(8)),
        $userId,
        'receive_stock',
        'inventory',
        'Received ' . $totalItems . ' units across ' . count($items) . ' product(s)',
        'Supplier: ' . $supplier . ' | Invoice: ' . $invoiceNumber,
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Stock received successfully',
        'totalItems' => $totalItems,
        'itemsCount' => count($items)
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to receive stock: ' . $e->getMessage()]);
}
