<?php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../middleware/cors.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    $pdo = Database::getInstance();
    $historyDays = 14;
    $forecastDays = 7;

    $endDate = new DateTime('now');
    $startDate = (clone $endDate)->modify('-' . ($historyDays - 1) . ' days');
    $startKey = $startDate->format('Y-m-d 00:00:00');
    $endKey = $endDate->format('Y-m-d 23:59:59');

    $salesStmt = $pdo->prepare(
        'SELECT DATE(t.createdAt) AS date, SUM(t.total) AS total
         FROM transactions t
         WHERE t.createdAt >= ? AND t.createdAt <= ?
         GROUP BY DATE(t.createdAt)
         ORDER BY DATE(t.createdAt) ASC'
    );
    $salesStmt->execute([$startKey, $endKey]);
    $salesRows = $salesStmt->fetchAll(PDO::FETCH_ASSOC);

    $salesByDate = [];
    foreach ($salesRows as $row) {
        $salesByDate[$row['date']] = (float)$row['total'];
    }

    $historicalData = [];
    $weekdayTotals = [];
    $currentDate = clone $startDate;
    while ($currentDate <= $endDate) {
        $key = $currentDate->format('Y-m-d');
        $total = $salesByDate[$key] ?? 0.0;
        $weekday = (int)$currentDate->format('w');
        if (!isset($weekdayTotals[$weekday])) {
            $weekdayTotals[$weekday] = ['total' => 0.0, 'count' => 0];
        }
        $weekdayTotals[$weekday]['total'] += $total;
        $weekdayTotals[$weekday]['count'] += 1;

        $historicalData[] = [
            'date' => $currentDate->format('M j'),
            'actual' => $total,
        ];
        $currentDate->modify('+1 day');
    }

    $recentTotals = array_slice(array_map(fn($entry) => $entry['actual'], $historicalData), -7);
    $avgDaily = count($recentTotals) > 0 ? array_sum($recentTotals) / count($recentTotals) : 0.0;
    $overallHistoricalAverage = count($historicalData) > 0 ? array_sum(array_map(fn($entry) => $entry['actual'], $historicalData)) / count($historicalData) : 0.0;

    $forecastData = [];
    for ($i = 1; $i <= $forecastDays; $i++) {
        $futureDate = (clone $endDate)->modify("+{$i} days");
        $weekday = (int)$futureDate->format('w');
        $weekdayAverage = 0.0;
        if (isset($weekdayTotals[$weekday]) && $weekdayTotals[$weekday]['count'] > 0) {
            $weekdayAverage = $weekdayTotals[$weekday]['total'] / $weekdayTotals[$weekday]['count'];
        }
        $seasonalityFactor = $overallHistoricalAverage > 0 ? ($weekdayAverage / $overallHistoricalAverage) : 1.0;
        $forecastData[] = [
            'date' => $futureDate->format('M j'),
            'forecast' => max(0, round($avgDaily * $seasonalityFactor)),
        ];
    }

    $last7Start = (clone $endDate)->modify('-6 days')->format('Y-m-d 00:00:00');
    $last7End = $endDate->format('Y-m-d 23:59:59');
    $prev7Start = (clone $endDate)->modify('-13 days')->format('Y-m-d 00:00:00');
    $prev7End = (clone $endDate)->modify('-7 days')->format('Y-m-d 23:59:59');

    $summaryStmt = $pdo->prepare(
        'SELECT SUM(total) AS total FROM transactions WHERE createdAt >= ? AND createdAt <= ?'
    );

    $summaryStmt->execute([$last7Start, $last7End]);
    $last7Row = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    $last7Total = (float)($last7Row['total'] ?? 0.0);

    $summaryStmt->execute([$prev7Start, $prev7End]);
    $prev7Row = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    $prev7Total = (float)($prev7Row['total'] ?? 0.0);

    $projectionChange = $prev7Total > 0 ? (($last7Total - $prev7Total) / $prev7Total) * 100 : 0.0;

    $stockStmt = $pdo->query(
        'SELECT il.productId, p.name AS productName, il.wholesaleQty, il.packsPerBox, il.pcsPerPack, il.retailQty, il.shelfQty, il.reorderLevel
         FROM inventory_levels il
         LEFT JOIN products p ON p.id = il.productId'
    );
    $stockRows = $stockStmt->fetchAll(PDO::FETCH_ASSOC);

    $salesByProductStmt = $pdo->prepare(
        'SELECT ti.productId, SUM(ti.quantity) AS quantity
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transactionId
         WHERE t.createdAt >= ? AND t.createdAt <= ?
         GROUP BY ti.productId'
    );
    $salesByProductStmt->execute([$startKey, $endKey]);
    $productSalesRows = $salesByProductStmt->fetchAll(PDO::FETCH_ASSOC);

    $productSales = [];
    foreach ($productSalesRows as $row) {
        $productSales[$row['productId']] = (int)$row['quantity'];
    }

    $stockForecast = [];
    foreach ($stockRows as $row) {
        $totalStock = ((int)$row['wholesaleQty'] * (int)$row['packsPerBox'] * (int)$row['pcsPerPack'])
            + ((int)$row['retailQty'] * (int)$row['pcsPerPack'])
            + (int)$row['shelfQty'];

        $salesQuantity = $productSales[$row['productId']] ?? 0;
        $avgDailySales = $salesQuantity > 0 ? round($salesQuantity / $historyDays, 1) : 0.0;
        $daysUntilStockout = $avgDailySales > 0 ? (int)floor($totalStock / $avgDailySales) : 0;
        $reorderPoint = (int)$row['reorderLevel'];
        $needsReorder = $totalStock <= $reorderPoint;
        $status = $daysUntilStockout <= 3 ? 'critical' : ($daysUntilStockout <= 7 ? 'warning' : 'healthy');

        $turnover = $totalStock > 0 && $avgDailySales > 0
            ? round(($avgDailySales * 365) / $totalStock, 2)
            : 0.0;

        $stockForecast[] = [
            'id' => $row['productId'],
            'name' => $row['productName'] ?? 'Unknown',
            'currentStock' => $totalStock,
            'avgDailySales' => $avgDailySales,
            'daysUntilStockout' => $daysUntilStockout,
            'reorderPoint' => $reorderPoint,
            'inventoryTurnover' => $turnover,
            'needsReorder' => $needsReorder,
            'status' => $status,
        ];
    }

    $response = [
        'historicalData' => $historicalData,
        'forecastData' => $forecastData,
        'projection' => [
            'projection' => round($last7Total * 1.05),
            'lastWeekActual' => $last7Total,
            'changePercent' => $projectionChange,
        ],
        'stockForecast' => $stockForecast,
    ];

    header('Content-Type: application/json');
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load forecast analytics: ' . $e->getMessage()]);
}
