<?php
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$dateStr = isset($_GET['date']) ? trim($_GET['date']) : null;
$startDate = isset($_GET['startDate']) ? trim($_GET['startDate']) : null;
$endDate = isset($_GET['endDate']) ? trim($_GET['endDate']) : null;

if ($dateStr && !$startDate && !$endDate) {
    $startDate = $dateStr . ' 00:00:00';
    $endDate = $dateStr . ' 23:59:59';
} elseif ($startDate && !$endDate) {
    $startDate = $startDate . ' 00:00:00';
    $endDate = date('Y-m-d 23:59:59', strtotime($startDate . ' +1 day'));
} elseif ($startDate && $endDate) {
    $startDate = $startDate . ' 00:00:00';
    $endDate = $endDate . ' 23:59:59';
}

$pdo = Database::getInstance();

try {
    if ($startDate && $endDate) {
        $stmt = $pdo->prepare("SELECT 
            t.*, 
            GROUP_CONCAT(
                JSON_OBJECT(
                    'id', ti.id,
                    'productId', ti.productId,
                    'productName', ti.productName,
                    'variantId', ti.variantId,
                    'variantName', ti.variantName,
                    'quantity', ti.quantity,
                    'unitPrice', ti.unitPrice,
                    'discount', 0,
                    'total', ti.subtotal,
                    'subtotal', ti.subtotal
                )
            ) as itemsJson
        FROM transactions t
        LEFT JOIN transaction_items ti ON t.id = ti.transactionId
        WHERE t.createdAt >= ? AND t.createdAt <= ?
        GROUP BY t.id
        ORDER BY t.createdAt DESC");
        $stmt->execute([$startDate, $endDate]);
    } else {
        $stmt = $pdo->prepare("SELECT 
            t.*, 
            GROUP_CONCAT(
                JSON_OBJECT(
                    'id', ti.id,
                    'productId', ti.productId,
                    'productName', ti.productName,
                    'variantId', ti.variantId,
                    'variantName', ti.variantName,
                    'quantity', ti.quantity,
                    'unitPrice', ti.unitPrice,
                    'discount', 0,
                    'total', ti.subtotal,
                    'subtotal', ti.subtotal
                )
            ) as itemsJson
        FROM transactions t
        LEFT JOIN transaction_items ti ON t.id = ti.transactionId
        GROUP BY t.id
        ORDER BY t.createdAt DESC");
        $stmt->execute();
    }

    $transactions = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $items = [];
        if ($row['itemsJson']) {
            $itemsArray = json_decode('[' . $row['itemsJson'] . ']', true);
            $items = $itemsArray ?: [];
        }

        $transactions[] = [
            'id' => $row['id'],
            'invoiceNo' => $row['invoiceNo'],
            'items' => $items,
            'subtotal' => (float)$row['subtotal'],
            'discount' => (float)$row['discount'],
            'total' => (float)$row['total'],
            'paymentType' => $row['paymentType'],
            'cashierId' => $row['cashierId'],
            'customerId' => $row['customerId'] ?? null,
            'status' => $row['status'] ?? 'completed',
            'createdAt' => $row['createdAt']
        ];
    }

    echo json_encode($transactions);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch transaction history: ' . $e->getMessage()]);
}
