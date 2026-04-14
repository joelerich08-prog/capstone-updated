<?php
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$pdo = Database::getInstance();

try {
    // Get all orders with their items
    $stmt = $pdo->prepare("
        SELECT 
            o.*,
            GROUP_CONCAT(
                JSON_OBJECT(
                    'id', oi.id,
                    'productId', oi.productId,
                    'productName', oi.productName,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unitPrice,
                    'discount', 0,
                    'total', (oi.quantity * oi.unitPrice)
                )
            ) as itemsJson
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.orderId
        GROUP BY o.id
        ORDER BY o.createdAt DESC
        LIMIT 1000
    ");
    $stmt->execute();
    $orders = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $items = [];
        if ($row['itemsJson']) {
            $itemsArray = json_decode('[' . $row['itemsJson'] . ']', true);
            $items = $itemsArray ?: [];
        }
        
    $orders[] = [
        'id' => $row['id'],
        'orderNo' => $row['orderNo'],
        'userId' => $row['userId'] ?? null,
        'customerName' => $row['customerName'],
        'customerPhone' => $row['customerPhone'],
        'items' => $items,
        'total' => (float)$row['total'],
        'status' => $row['status'] ?? 'pending',
        'source' => $row['source'],
        'notes' => $row['notes'] ?? null,
        'createdAt' => $row['createdAt']
    ];
    }

    echo json_encode($orders);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch orders: ' . $e->getMessage()]);
}
