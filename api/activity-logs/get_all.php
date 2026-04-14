<?php
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['user_role'] ?? null) !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized - Admin access required']);
    exit;
}

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare("
        SELECT
            al.id,
            al.userId,
            al.userName,
            COALESCE(u.role, 'admin') as userRole,
            al.action,
            LOWER(SUBSTRING_INDEX(al.action, '_', 1)) as module,
            al.details,
            '' as ipAddress,
            al.createdAt as timestamp
        FROM activity_logs al
        LEFT JOIN users u ON al.userId = u.id
        ORDER BY al.createdAt DESC
        LIMIT 1000
    ");

    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($logs as &$log) {
        $log['timestamp'] = date('c', strtotime($log['timestamp']));
    }

    echo json_encode($logs);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
