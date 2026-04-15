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
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body']);
    exit;
}

$sku = strtoupper(trim((string) ($data['sku'] ?? '')));
$name = trim((string) ($data['name'] ?? ''));
$description = trim((string) ($data['description'] ?? ''));
$categoryId = trim((string) ($data['categoryId'] ?? ''));
$supplierId = trim((string) ($data['supplierId'] ?? ''));
$costPrice = isset($data['costPrice']) ? (float) $data['costPrice'] : null;
$wholesalePrice = isset($data['wholesalePrice']) ? (float) $data['wholesalePrice'] : null;
$retailPrice = isset($data['retailPrice']) ? (float) $data['retailPrice'] : null;
$isActive = array_key_exists('isActive', $data) ? (bool) $data['isActive'] : true;
$variants = is_array($data['variants'] ?? null) ? $data['variants'] : [];

if ($sku === '' || $name === '' || $categoryId === '') {
    http_response_code(400);
    echo json_encode(['error' => 'SKU, name, and category are required']);
    exit;
}

if ($costPrice === null || $wholesalePrice === null || $retailPrice === null) {
    http_response_code(400);
    echo json_encode(['error' => 'All prices are required']);
    exit;
}

if ($costPrice < 0 || $wholesalePrice < 0 || $retailPrice < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Prices must be zero or greater']);
    exit;
}

try {
    $pdo = Database::getInstance();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
    $stmt->execute([$categoryId]);
    if (!$stmt->fetchColumn()) {
        throw new RuntimeException('Selected category does not exist');
    }

    if ($supplierId !== '') {
        $stmt = $pdo->prepare('SELECT id FROM suppliers WHERE id = ?');
        $stmt->execute([$supplierId]);
        if (!$stmt->fetchColumn()) {
            throw new RuntimeException('Selected supplier does not exist');
        }
    } else {
        $supplierId = null;
    }

    $stmt = $pdo->prepare('SELECT id FROM products WHERE sku = ?');
    $stmt->execute([$sku]);
    if ($stmt->fetchColumn()) {
        throw new RuntimeException('A product with this SKU already exists');
    }

    $productId = bin2hex(random_bytes(16));
    $createdAt = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare(
        'INSERT INTO products (id, sku, name, description, categoryId, supplierId, costPrice, wholesalePrice, retailPrice, images, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $productId,
        $sku,
        $name,
        $description !== '' ? $description : null,
        $categoryId,
        $supplierId,
        $costPrice,
        $wholesalePrice,
        $retailPrice,
        json_encode([]),
        $isActive ? 1 : 0,
        $createdAt,
    ]);

    $variantStmt = $pdo->prepare(
        'INSERT INTO product_variants (id, productId, name, priceAdjustment, sku) VALUES (?, ?, ?, ?, ?)'
    );

    foreach ($variants as $variant) {
        $variantName = trim((string) ($variant['name'] ?? ''));
        if ($variantName === '') {
            continue;
        }

        $variantId = bin2hex(random_bytes(16));
        $priceAdjustment = isset($variant['priceAdjustment']) ? (float) $variant['priceAdjustment'] : 0.0;
        $variantSku = trim((string) ($variant['sku'] ?? ''));

        $variantStmt->execute([
            $variantId,
            $productId,
            $variantName,
            $priceAdjustment,
            $variantSku !== '' ? $variantSku : null,
        ]);
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'id' => $productId]);
} catch (RuntimeException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
