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
if (!$data || !isset($data['productId']) || !isset($data['wholesaleQuantity'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: productId and wholesaleQuantity required']);
    exit;
}

$productId = trim($data['productId']);
$wholesaleQuantity = (int)$data['wholesaleQuantity'];
$variantId = isset($data['variantId']) ? trim($data['variantId']) : null;

if (empty($productId) || $wholesaleQuantity <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid productId or wholesaleQuantity']);
    exit;
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    $variantCondition = $variantId ? 'variantId = :variantId' : 'variantId IS NULL';
    $stmt = $pdo->prepare("SELECT wholesaleQty, packsPerBox FROM inventory_levels WHERE productId = :productId AND $variantCondition FOR UPDATE");
    $params = [':productId' => $productId];
    if ($variantId) {
        $params[':variantId'] = $variantId;
    }
    $stmt->execute($params);
    $inventory = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$inventory) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Inventory not found for product']);
        exit;
    }

    if ($inventory['wholesaleQty'] < $wholesaleQuantity) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Insufficient wholesale quantity']);
        exit;
    }

    $packsPerBox = $inventory['packsPerBox'];
    $retailQtyToAdd = $wholesaleQuantity * $packsPerBox;

    $stmt = $pdo->prepare("UPDATE inventory_levels SET wholesaleQty = wholesaleQty - :wholesaleQty, retailQty = retailQty + :retailQty WHERE productId = :productId AND $variantCondition");
    $updateParams = [
        ':wholesaleQty' => $wholesaleQuantity,
        ':retailQty' => $retailQtyToAdd,
        ':productId' => $productId,
    ];
    if ($variantId) {
        $updateParams[':variantId'] = $variantId;
    }
    $stmt->execute($updateParams);

    $movementId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO stock_movements (id, productId, variantId, movementType, fromTier, toTier, quantity, performedBy) VALUES (?, ?, ?, 'breakdown', 'wholesale', 'retail', ?, ?)");
    $stmt->execute([$movementId, $productId, $variantId, $wholesaleQuantity, $userId]);

    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $userName = $userRow['name'] ?? 'Unknown';

    $stmt = $pdo->prepare("SELECT supplierId, costPrice FROM products WHERE id = ?");
    $stmt->execute([$productId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }

    if (empty($product['supplierId'])) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Product supplier is required to create batch']);
        exit;
    }

    $batchId = bin2hex(random_bytes(16));
    $batchNumber = 'BREAKDOWN-' . date('Ymd-His');
    $expirationDate = date('Y-m-d', strtotime('+6 months'));
    $receivedDate = date('Y-m-d');

    $stmt = $pdo->prepare("INSERT INTO product_batches (id, productId, variantId, batchNumber, expirationDate, receivedDate, wholesaleQty, retailQty, shelfQty, initialQty, costPrice, supplierId, invoiceNumber, status, notes) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, 'active', 'Generated from breakdown')");
    $stmt->execute([
        $batchId,
        $productId,
        $variantId,
        $batchNumber,
        $expirationDate,
        $receivedDate,
        $retailQtyToAdd,
        $retailQtyToAdd,
        $product['costPrice'],
        $product['supplierId'],
        'BREAKDOWN-' . date('YmdHis'),
    ]);

    $activityId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO activity_logs (id, userId, userName, action, details) VALUES (?, ?, ?, 'breakdown', ?)");
    $stmt->execute([
        $activityId,
        $userId,
        $userName,
        "Broke down {$wholesaleQuantity} wholesale unit(s) into {$retailQtyToAdd} retail unit(s) for product {$productId}",
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Stock breakdown completed',
        'movementId' => $movementId,
        'batchId' => $batchId,
        'retailQtyAdded' => $retailQtyToAdd,
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Transaction failed: ' . $e->getMessage()]);
}
?>