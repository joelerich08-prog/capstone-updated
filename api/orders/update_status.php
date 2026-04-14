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
if (!$data || !isset($data['orderId']) || !isset($data['status'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: orderId and status are required']);
    exit;
}

$orderId = trim($data['orderId']);
$status = trim($data['status']);
$validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

if ($orderId === '' || !in_array($status, $validStatuses, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid orderId or status']);
    exit;
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT id, source, status FROM orders WHERE id = ? FOR UPDATE');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        exit;
    }

    $previousStatus = $order['status'];
    if ($previousStatus === $status) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Order is already in the requested status']);
        exit;
    }

    $sourceTierMap = [
        'facebook' => 'shelf',
        'sms' => 'retail',
        'website' => 'shelf',
    ];

    $orderSource = $order['source'];
    $inventoryTier = $sourceTierMap[$orderSource] ?? 'shelf';
    $shouldAdjustStock = in_array($status, ['ready', 'completed'], true);
    $alreadyDeducted = in_array($previousStatus, ['ready', 'completed'], true);

    if ($shouldAdjustStock && !$alreadyDeducted) {
        $stmt = $pdo->prepare('SELECT id, productId, variantId, quantity FROM order_items WHERE orderId = ?');
        $stmt->execute([$orderId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$items) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'Order contains no items to fulfill']);
            exit;
        }

        foreach ($items as $item) {
            $variantCondition = $item['variantId'] ? 'variantId = :variantId' : 'variantId IS NULL';
            $params = [':productId' => $item['productId']];
            if ($item['variantId']) {
                $params[':variantId'] = $item['variantId'];
            }

            $stmt = $pdo->prepare("SELECT {$inventoryTier}Qty, reorderLevel FROM inventory_levels WHERE productId = :productId AND $variantCondition FOR UPDATE");
            $stmt->execute($params);
            $inventory = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$inventory) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['error' => 'Inventory record not found for product ' . $item['productId']]);
                exit;
            }

            if ($inventory["{$inventoryTier}Qty"] < $item['quantity']) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['error' => 'Insufficient stock in ' . $inventoryTier . ' tier for product ' . $item['productId']]);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE inventory_levels SET {$inventoryTier}Qty = {$inventoryTier}Qty - :quantity WHERE productId = :productId AND $variantCondition");
            $stmt->execute(array_merge($params, [':quantity' => $item['quantity']]));

            $movementId = bin2hex(random_bytes(16));
            $stmt = $pdo->prepare('INSERT INTO stock_movements (id, productId, variantId, movementType, fromTier, toTier, quantity, performedBy) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)');
            $stmt->execute([$movementId, $item['productId'], $item['variantId'], 'sale', $inventoryTier, $item['quantity'], $userId]);

            $stmt = $pdo->prepare("SELECT {$inventoryTier}Qty, reorderLevel FROM inventory_levels WHERE productId = :productId AND $variantCondition");
            $stmt->execute($params);
            $updatedInventory = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($updatedInventory && $updatedInventory["{$inventoryTier}Qty"] <= $updatedInventory['reorderLevel']) {
                $alertId = bin2hex(random_bytes(16));
                $stmt = $pdo->prepare('INSERT INTO alerts (id, type, priority, title, message, productId) VALUES (?, "low_stock", "high", "Low Stock Alert", ?, ?)');
                $message = "Ordered item {$item['productId']} is low on {$inventoryTier} stock: {$updatedInventory["{$inventoryTier}Qty"]} remaining";
                $stmt->execute([$alertId, $message, $item['productId']]);
            }
        }
    }

    $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
    $stmt->execute([$status, $orderId]);

    $stmt = $pdo->prepare('SELECT name FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $userName = $user['name'] ?? 'Unknown';

    $activityId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare('INSERT INTO activity_logs (id, userId, userName, action, details) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $activityId,
        $userId,
        $userName,
        'order_status_update',
        "Order {$orderId} status changed from {$previousStatus} to {$status} (source: {$orderSource})",
    ]);

    $pdo->commit();

    echo json_encode(['success' => true, 'orderId' => $orderId, 'status' => $status]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Status update failed: ' . $e->getMessage()]);
}
?>