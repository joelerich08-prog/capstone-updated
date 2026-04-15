<?php

function normalizeInventoryVariantId($variantId): ?string
{
    if ($variantId === null) {
        return null;
    }

    $variantId = trim((string) $variantId);
    return $variantId === '' ? null : $variantId;
}

function fetchInventoryLevel(PDO $pdo, string $productId, ?string $variantId = null, bool $lock = false): ?array
{
    $variantId = normalizeInventoryVariantId($variantId);
    $sql = 'SELECT id, productId, variantId, wholesaleQty, retailQty, shelfQty, wholesaleUnit, retailUnit, shelfUnit, pcsPerPack, packsPerBox, reorderLevel, updatedAt
            FROM inventory_levels
            WHERE productId = :productId AND ' . ($variantId === null ? 'variantId IS NULL' : 'variantId = :variantId') . ($lock ? ' FOR UPDATE' : '');

    $stmt = $pdo->prepare($sql);
    $params = [':productId' => $productId];
    if ($variantId !== null) {
        $params[':variantId'] = $variantId;
    }

    $stmt->execute($params);
    $inventory = $stmt->fetch(PDO::FETCH_ASSOC);

    return $inventory ?: null;
}

function aggregateBatchStock(PDO $pdo, string $productId, ?string $variantId = null): array
{
    $variantId = normalizeInventoryVariantId($variantId);
    $sql = 'SELECT
                COALESCE(SUM(wholesaleQty), 0) AS wholesaleQty,
                COALESCE(SUM(retailQty), 0) AS retailQty,
                COALESCE(SUM(shelfQty), 0) AS shelfQty
            FROM product_batches
            WHERE productId = :productId';

    $params = [':productId' => $productId];
    if ($variantId === null) {
        $sql .= ' AND variantId IS NULL';
    } else {
        $sql .= ' AND variantId = :variantId';
        $params[':variantId'] = $variantId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    return [
        'wholesaleQty' => (int) ($row['wholesaleQty'] ?? 0),
        'retailQty' => (int) ($row['retailQty'] ?? 0),
        'shelfQty' => (int) ($row['shelfQty'] ?? 0),
    ];
}

function createInventoryLevel(PDO $pdo, string $productId, ?string $variantId = null): array
{
    $variantId = normalizeInventoryVariantId($variantId);
    $stock = aggregateBatchStock($pdo, $productId, $variantId);
    $inventoryId = bin2hex(random_bytes(16));

    $stmt = $pdo->prepare(
        'INSERT INTO inventory_levels (
            id,
            productId,
            variantId,
            wholesaleQty,
            retailQty,
            shelfQty,
            wholesaleUnit,
            retailUnit,
            shelfUnit,
            pcsPerPack,
            packsPerBox,
            reorderLevel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $inventoryId,
        $productId,
        $variantId,
        $stock['wholesaleQty'],
        $stock['retailQty'],
        $stock['shelfQty'],
        'box',
        'pack',
        'pack',
        1,
        1,
        0,
    ]);

    $inventory = fetchInventoryLevel($pdo, $productId, $variantId, true);
    if ($inventory) {
        return $inventory;
    }

    return [
        'id' => $inventoryId,
        'productId' => $productId,
        'variantId' => $variantId,
        'wholesaleQty' => $stock['wholesaleQty'],
        'retailQty' => $stock['retailQty'],
        'shelfQty' => $stock['shelfQty'],
        'wholesaleUnit' => 'box',
        'retailUnit' => 'pack',
        'shelfUnit' => 'pack',
        'pcsPerPack' => 1,
        'packsPerBox' => 1,
        'reorderLevel' => 0,
    ];
}

function getOrCreateInventoryLevel(PDO $pdo, string $productId, ?string $variantId = null, bool $lock = false): array
{
    $variantId = normalizeInventoryVariantId($variantId);

    $inventory = fetchInventoryLevel($pdo, $productId, $variantId, $lock);
    if ($inventory) {
        return $inventory;
    }

    if ($variantId !== null) {
        $inventory = fetchInventoryLevel($pdo, $productId, null, $lock);
        if ($inventory) {
            return $inventory;
        }
    }

    return createInventoryLevel($pdo, $productId, $variantId);
}
