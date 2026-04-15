<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../includes/inventory.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['productId']) || !isset($data['sourceTier']) || !isset($data['destTier']) || !isset($data['quantity'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: productId, sourceTier, destTier, and quantity are required']);
    exit;
}

$productId = trim($data['productId']);
$sourceTier = trim($data['sourceTier']);
$destTier = trim($data['destTier']);
$quantity = (int)$data['quantity'];
$variantId = isset($data['variantId']) ? trim($data['variantId']) : null;

$validTiers = ['wholesale', 'retail', 'shelf'];
if (empty($productId) || $quantity <= 0 || !in_array($sourceTier, $validTiers, true) || !in_array($destTier, $validTiers, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid productId, tier, or quantity']);
    exit;
}

if ($sourceTier === $destTier) {
    http_response_code(400);
    echo json_encode(['error' => 'Source and destination tiers must be different']);
    exit;
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    $inventory = getOrCreateInventoryLevel($pdo, $productId, $variantId, true);
    $inventoryId = $inventory['id'];

    $sourceQty = $inventory["{$sourceTier}Qty"];
    if ($sourceQty < $quantity) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Insufficient stock in source tier']);
        exit;
    }

    $updated = [
        'wholesaleQty' => $inventory['wholesaleQty'],
        'retailQty' => $inventory['retailQty'],
        'shelfQty' => $inventory['shelfQty'],
    ];

    $updated["{$sourceTier}Qty"] -= $quantity;
    $updated["{$destTier}Qty"] += $quantity;

    $stmt = $pdo->prepare("UPDATE inventory_levels SET wholesaleQty = :wholesaleQty, retailQty = :retailQty, shelfQty = :shelfQty WHERE id = :id");
    $updateParams = [
        ':wholesaleQty' => $updated['wholesaleQty'],
        ':retailQty' => $updated['retailQty'],
        ':shelfQty' => $updated['shelfQty'],
        ':id' => $inventoryId,
    ];
    $stmt->execute($updateParams);

    $movementId = bin2hex(random_bytes(16));
    insertStockMovement($pdo, [
        'id' => $movementId,
        'productId' => $productId,
        'variantId' => $variantId,
        'movementType' => 'transfer',
        'fromTier' => $sourceTier,
        'toTier' => $destTier,
        'quantity' => $quantity,
        'performedBy' => $userId,
    ]);

    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $userName = $userRow['name'] ?? 'Unknown';

    $activityId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO activity_logs (id, userId, userName, action, details) VALUES (?, ?, ?, 'transfer', ?)");
    $stmt->execute([
        $activityId,
        $userId,
        $userName,
        "Transferred {$quantity} units from {$sourceTier} to {$destTier} for product {$productId}",
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Stock transfer completed',
        'movementId' => $movementId,
        'updatedInventory' => $updated,
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Transaction failed: ' . $e->getMessage()]);
}
?>
