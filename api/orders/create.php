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

if (!isset($data['customerName']) || !isset($data['customerPhone']) || !isset($data['total']) || !isset($data['orderSource'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input: customerName, customerPhone, total, and orderSource are required']);
    exit;
}

$customerName = trim($data['customerName']);
$customerPhone = trim($data['customerPhone']);
$total = (float)$data['total'];
$orderSource = trim($data['orderSource']);
$notes = isset($data['notes']) ? trim($data['notes']) : null;
$items = $data['items'];

// Validate
if (strlen($customerName) < 2) {
    http_response_code(400);
    echo json_encode(['error' => 'Customer name must be at least 2 characters']);
    exit;
}

if ($total <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Order total must be greater than 0']);
    exit;
}

if (!in_array($orderSource, ['facebook', 'sms', 'website'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid orderSource: must be facebook, sms, or website']);
    exit;
}

// Validate items
foreach ($items as $item) {
    if (!isset($item['productId']) || !isset($item['quantity']) || !isset($item['unitPrice'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid item: productId, quantity, and unitPrice are required']);
        exit;
    }
    if ($item['quantity'] <= 0 || $item['unitPrice'] <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid item: quantity and unitPrice must be positive']);
        exit;
    }
}

$pdo = Database::getInstance();

try {
    $pdo->beginTransaction();

    // Create order
    $orderId = bin2hex(random_bytes(8));
    $orderNo = 'ORD-' . str_pad((int)date('ymd'), 6, '0', STR_PAD_LEFT) . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

    $stmt = $pdo->prepare("
        INSERT INTO orders (id, orderNo, userId, customerName, customerPhone, total, status, orderSource, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())
    ");
    $stmt->execute([
        $orderId,
        $orderNo,
        $userId,
        $customerName,
        $customerPhone,
        $total,
        $orderSource,
        $notes
    ]);

    // Create order items
    foreach ($items as $item) {
        $itemId = bin2hex(random_bytes(8));
        $itemStmt = $pdo->prepare("
            INSERT INTO order_items (id, orderId, productId, productName, quantity, unitPrice, discount, total, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $itemStmt->execute([
            $itemId,
            $orderId,
            trim($item['productId']),
            isset($item['productName']) ? trim($item['productName']) : '',
            (int)$item['quantity'],
            (float)$item['unitPrice'],
            isset($item['discount']) ? (float)$item['discount'] : 0,
            (float)$item['total']
        ]);
    }

    // Log activity
    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (id, userId, action, module, description, details, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        bin2hex(random_bytes(8)),
        $userId,
        'create_order',
        'orders',
        'Created order ' . $orderNo,
        'Customer: ' . $customerName . ' | Source: ' . $orderSource . ' | Total: ' . $total,
    ]);

    $pdo->commit();

    echo json_encode([
        'id' => $orderId,
        'orderNo' => $orderNo,
        'userId' => $userId,
        'customerName' => $customerName,
        'customerPhone' => $customerPhone,
        'items' => $items,
        'total' => $total,
        'status' => 'pending',
        'orderSource' => $orderSource,
        'notes' => $notes,
        'createdAt' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create order: ' . $e->getMessage()]);
}
