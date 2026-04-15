<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    $pdo = Database::getInstance();

    $stmt = $pdo->query(
        'SELECT
            sm.id,
            sm.productId,
            sm.variantId,
            p.name AS productName,
            pv.name AS variantName,
            sm.movementType,
            sm.fromTier,
            sm.toTier,
            sm.quantity,
            sm.reason,
            COALESCE(u.name, sm.performedBy) AS performedBy,
            sm.createdAt
        FROM stock_movements sm
        INNER JOIN products p ON sm.productId = p.id
        LEFT JOIN product_variants pv ON sm.variantId = pv.id
        LEFT JOIN users u ON sm.performedBy = u.id
        ORDER BY sm.createdAt DESC'
    );

    $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($movements);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch stock movements', 'details' => $e->getMessage()]);
}
?>
