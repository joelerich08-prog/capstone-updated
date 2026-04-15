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

// Validate input
if (!$data || !isset($data['productId']) || !isset($data['tier']) || !isset($data['quantityChange']) || !isset($data['reason'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: productId, tier, quantityChange, and reason are required']);
    exit;
}

$productId = trim($data['productId']);
$tier = trim($data['tier']);
$quantityChange = (int)$data['quantityChange'];
$reason = trim($data['reason']);
$notes = isset($data['notes']) ? trim($data['notes']) : '';
$variantId = isset($data['variantId']) ? trim($data['variantId']) : null;

// Validate tier
if (!in_array($tier, ['wholesale', 'retail', 'shelf'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid tier: must be wholesale, retail, or shelf']);
    exit;
}

if ($quantityChange === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: quantityChange cannot be zero']);
    exit;
}

if (empty($reason)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: reason is required']);
    exit;
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    // Get inventory with row locking
    $inventory = getOrCreateInventoryLevel($pdo, $productId, $variantId, true);
    $inventoryId = $inventory['id'];

    // Get current stock for the tier
    $currentStock = 0;
    if ($tier === 'wholesale') {
        $currentStock = $inventory['wholesaleQty'];
    } elseif ($tier === 'retail') {
        $currentStock = $inventory['retailQty'];
    } else {
        $currentStock = $inventory['shelfQty'];
    }

    // Check if we have enough stock for removal
    if ($quantityChange < 0 && abs($quantityChange) > $currentStock) {
        http_response_code(400);
        echo json_encode(['error' => 'Insufficient stock: cannot remove ' . abs($quantityChange) . ' units, only ' . $currentStock . ' available']);
        exit;
    }

    // Calculate new quantity
    $newQty = $currentStock + $quantityChange;

    // Update inventory based on tier
    if ($tier === 'wholesale') {
        $stmt = $pdo->prepare("UPDATE inventory_levels SET wholesaleQty = ?, updatedAt = NOW() WHERE id = ?");
    } elseif ($tier === 'retail') {
        $stmt = $pdo->prepare("UPDATE inventory_levels SET retailQty = ?, updatedAt = NOW() WHERE id = ?");
    } else {
        $stmt = $pdo->prepare("UPDATE inventory_levels SET shelfQty = ?, updatedAt = NOW() WHERE id = ?");
    }
    $stmt->execute([$newQty, $inventoryId]);

    // Record stock movement
    $stmt = $pdo->prepare("
        INSERT INTO stock_movements (id, productId, variantId, movementType, fromTier, toTier, quantity, 
                                     reason, notes, createdBy, createdAt)
        VALUES (?, ?, ?, 'adjustment', ?, NULL, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        bin2hex(random_bytes(8)),
        $productId,
        $variantId,
        $tier,
        abs($quantityChange),
        $reason,
        $notes,
        $userId
    ]);

    // Log activity
    $action = $quantityChange > 0 ? 'Added' : 'Removed';
    $tierNames = ['wholesale' => 'Wholesale', 'retail' => 'Retail', 'shelf' => 'Store Shelf'];
    $tierName = $tierNames[$tier];

    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (id, userId, action, module, description, details, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        bin2hex(random_bytes(8)),
        $userId,
        'adjust_stock',
        'inventory',
        $action . ' ' . abs($quantityChange) . ' unit(s) ' . ($quantityChange > 0 ? 'to' : 'from') . ' ' . $tierName,
        'Product ID: ' . $productId . ' | Reason: ' . $reason . ' | Notes: ' . $notes
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Stock adjusted successfully',
        'productId' => $productId,
        'tier' => $tier,
        'previousQuantity' => $currentStock,
        'newQuantity' => $newQty,
        'change' => $quantityChange
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to adjust stock: ' . $e->getMessage()]);
}
