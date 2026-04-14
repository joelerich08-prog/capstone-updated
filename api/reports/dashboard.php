<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

// Check if user is logged in (optional, but good practice)
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Database connection
$host = 'localhost';
$db = 'capstone_project'; // Adjust to your database name
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

try {
    $today = date('Y-m-d');

    // Today's sales
    $stmt = $pdo->prepare("SELECT SUM(total) as todaySales FROM transactions WHERE DATE(createdAt) = ? AND status = 'completed'");
    $stmt->execute([$today]);
    $sales = $stmt->fetch(PDO::FETCH_ASSOC);
    $todaySales = (float)($sales['todaySales'] ?? 0);

    // Today's transactions count
    $stmt = $pdo->prepare("SELECT COUNT(*) as todayTransactions FROM transactions WHERE DATE(createdAt) = ? AND status = 'completed'");
    $stmt->execute([$today]);
    $trans = $stmt->fetch(PDO::FETCH_ASSOC);
    $todayTransactions = (int)$trans['todayTransactions'];

    // Today's profit
    $stmt = $pdo->prepare("
        SELECT SUM((ti.unitPrice - p.costPrice) * ti.quantity) as todayProfit
        FROM transaction_items ti
        JOIN transactions t ON ti.transactionId = t.id
        JOIN products p ON ti.productId = p.id
        WHERE DATE(t.createdAt) = ? AND t.status = 'completed'
    ");
    $stmt->execute([$today]);
    $profit = $stmt->fetch(PDO::FETCH_ASSOC);
    $todayProfit = (float)($profit['todayProfit'] ?? 0);

    // Low stock count
    $stmt = $pdo->prepare("SELECT COUNT(*) as lowStockCount FROM inventory_levels WHERE shelfQty <= reorderLevel");
    $stmt->execute();
    $lowStock = $stmt->fetch(PDO::FETCH_ASSOC);
    $lowStockCount = (int)$lowStock['lowStockCount'];

    // Pending orders count
    $stmt = $pdo->prepare("SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'pending'");
    $stmt->execute();
    $pending = $stmt->fetch(PDO::FETCH_ASSOC);
    $pendingOrders = (int)$pending['pendingOrders'];

    // Top 5 selling items today
    $stmt = $pdo->prepare("
        SELECT p.id, p.name, SUM(ti.quantity) as totalSold
        FROM transaction_items ti
        JOIN transactions t ON ti.transactionId = t.id
        JOIN products p ON ti.productId = p.id
        WHERE DATE(t.createdAt) = ? AND t.status = 'completed'
        GROUP BY p.id, p.name
        ORDER BY totalSold DESC
        LIMIT 5
    ");
    $stmt->execute([$today]);
    $topItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format response
    $response = [
        'todaySales' => $todaySales,
        'todayTransactions' => $todayTransactions,
        'todayProfit' => $todayProfit,
        'lowStockCount' => $lowStockCount,
        'pendingOrders' => $pendingOrders,
        'topItems' => $topItems
    ];

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed: ' . $e->getMessage()]);
}
?>