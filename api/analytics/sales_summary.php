<?php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../middleware/cors.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$startDate = isset($_GET['startDate']) ? trim($_GET['startDate']) : null;
$endDate = isset($_GET['endDate']) ? trim($_GET['endDate']) : null;
$period = isset($_GET['period']) ? trim($_GET['period']) : '14';

if ($startDate && $endDate) {
    $startDate = date('Y-m-d 00:00:00', strtotime($startDate));
    $endDate = date('Y-m-d 23:59:59', strtotime($endDate));
} elseif (in_array($period, ['7', '14', '30'], true)) {
    $days = (int)$period;
    $startDate = date('Y-m-d 00:00:00', strtotime("-" . ($days - 1) . " days"));
    $endDate = date('Y-m-d 23:59:59');
} else {
    $startDate = date('Y-m-d 00:00:00', strtotime('-13 days'));
    $endDate = date('Y-m-d 23:59:59');
}

try {
    $pdo = Database::getInstance();

    $dailyStmt = $pdo->prepare(
        'SELECT DATE(createdAt) AS date, SUM(total) AS sales, COUNT(*) AS transactions
         FROM transactions
         WHERE createdAt >= ? AND createdAt <= ?
         GROUP BY DATE(createdAt)
         ORDER BY DATE(createdAt) ASC'
    );
    $dailyStmt->execute([$startDate, $endDate]);
    $dailyRows = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

    $paymentStmt = $pdo->prepare(
        'SELECT LOWER(paymentType) AS paymentType, SUM(total) AS total, COUNT(*) AS count
         FROM transactions
         WHERE createdAt >= ? AND createdAt <= ?
         GROUP BY LOWER(paymentType)'
    );
    $paymentStmt->execute([$startDate, $endDate]);
    $paymentRows = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

    $startDateObj = new DateTime($startDate);
    $endDateObj = new DateTime($endDate);
    $interval = $startDateObj->diff($endDateObj);
    $days = (int)$interval->days + 1;

    $previousStart = (clone $startDateObj)->modify("-{$days} days")->format('Y-m-d 00:00:00');
    $previousEnd = (clone $startDateObj)->modify('-1 day')->format('Y-m-d 23:59:59');

    $previousStmt = $pdo->prepare(
        'SELECT SUM(total) AS total FROM transactions WHERE createdAt >= ? AND createdAt <= ?'
    );
    $previousStmt->execute([$previousStart, $previousEnd]);
    $previousRow = $previousStmt->fetch(PDO::FETCH_ASSOC);
    $previousPeriodSales = (float)($previousRow['total'] ?? 0);

    $salesData = [];
    $current = new DateTime($startDate);
    while ($current <= $endDateObj) {
        $key = $current->format('Y-m-d');
        $row = array_filter($dailyRows, fn($entry) => $entry['date'] === $key);
        $entry = array_values($row)[0] ?? null;
        $salesData[] = [
            'date' => $current->format('M j'),
            'sales' => $entry ? (float)$entry['sales'] : 0,
            'transactions' => $entry ? (int)$entry['transactions'] : 0,
        ];
        $current->modify('+1 day');
    }

    $paymentTypes = [
        'cash' => 'Cash',
        'gcash' => 'GCash',
        'maya' => 'Maya',
    ];

    $paymentData = [];
    foreach ($paymentTypes as $key => $label) {
        $paymentData[$key] = [
            'type' => $label,
            'total' => 0.0,
            'count' => 0,
        ];
    }

    foreach ($paymentRows as $paymentRow) {
        $type = $paymentRow['paymentType'];
        if (!isset($paymentData[$type])) {
            continue;
        }
        $paymentData[$type]['total'] = (float)$paymentRow['total'];
        $paymentData[$type]['count'] = (int)$paymentRow['count'];
    }

    $response = [
        'salesData' => $salesData,
        'paymentData' => array_values($paymentData),
        'totalSales' => array_reduce($salesData, fn($carry, $item) => $carry + $item['sales'], 0.0),
        'totalTransactions' => array_reduce($salesData, fn($carry, $item) => $carry + $item['transactions'], 0),
        'previousPeriodSales' => $previousPeriodSales,
    ];

    header('Content-Type: application/json');
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load sales analytics: ' . $e->getMessage()]);
}
