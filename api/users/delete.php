<?php
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['user_role'] ?? null) !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized - Admin access required']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$userId = trim((string) (($data['id'] ?? '') ?: ($_POST['id'] ?? '')));

if ($userId === '') {
    http_response_code(400);
    echo json_encode(['error' => 'User id is required']);
    exit;
}

if ($userId === ($_SESSION['user_id'] ?? '')) {
    http_response_code(400);
    echo json_encode(['error' => 'You cannot delete your own account']);
    exit;
}

try {
    $pdo = Database::getInstance();

    $stmt = $pdo->prepare('SELECT isActive FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingUser) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    if ((int) $existingUser['isActive'] === 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Deactivate the user before deleting the account']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'User cannot be deleted because the account is referenced by existing records']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
