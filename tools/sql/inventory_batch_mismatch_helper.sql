-- Inventory vs batch mismatch helper
-- Purpose:
-- 1. Show products/variants where inventory_levels and summed product_batches disagree
-- 2. Generate review-friendly SQL suggestions without applying them automatically
--
-- Usage:
--   mysql -u root capstone_project < tools/sql/inventory_batch_mismatch_helper.sql
--
-- Notes:
-- 1. This does NOT update anything.
-- 2. Review the "suggested_sql" output and choose the correction that matches real stock.
-- 3. Prefer correcting batch quantities if your physical stock and expiry tracking are batch-driven.

SELECT
    inv.id AS inventory_id,
    inv.productId,
    COALESCE(p.name, inv.productId) AS product_name,
    inv.variantId,
    COALESCE(pv.name, 'Base product') AS variant_name,
    inv.wholesaleQty AS inventory_wholesale,
    COALESCE(batch_totals.wholesaleQty, 0) AS batch_wholesale,
    inv.retailQty AS inventory_retail,
    COALESCE(batch_totals.retailQty, 0) AS batch_retail,
    inv.shelfQty AS inventory_shelf,
    COALESCE(batch_totals.shelfQty, 0) AS batch_shelf,
    inv.wholesaleQty - COALESCE(batch_totals.wholesaleQty, 0) AS wholesale_diff,
    inv.retailQty - COALESCE(batch_totals.retailQty, 0) AS retail_diff,
    inv.shelfQty - COALESCE(batch_totals.shelfQty, 0) AS shelf_diff
FROM inventory_levels inv
LEFT JOIN products p
    ON p.id = inv.productId
LEFT JOIN product_variants pv
    ON pv.id = inv.variantId
LEFT JOIN (
    SELECT
        productId,
        NULLIF(TRIM(variantId), '') AS variantId,
        SUM(CASE WHEN status != 'disposed' THEN wholesaleQty ELSE 0 END) AS wholesaleQty,
        SUM(CASE WHEN status != 'disposed' THEN retailQty ELSE 0 END) AS retailQty,
        SUM(CASE WHEN status != 'disposed' THEN shelfQty ELSE 0 END) AS shelfQty
    FROM product_batches
    GROUP BY productId, NULLIF(TRIM(variantId), '')
) batch_totals
    ON batch_totals.productId = inv.productId
   AND (
        (batch_totals.variantId IS NULL AND NULLIF(TRIM(inv.variantId), '') IS NULL)
        OR batch_totals.variantId = NULLIF(TRIM(inv.variantId), '')
   )
WHERE inv.wholesaleQty <> COALESCE(batch_totals.wholesaleQty, 0)
   OR inv.retailQty <> COALESCE(batch_totals.retailQty, 0)
   OR inv.shelfQty <> COALESCE(batch_totals.shelfQty, 0)
ORDER BY product_name, variant_name;

SELECT
    inv.id AS inventory_id,
    COALESCE(p.name, inv.productId) AS product_name,
    COALESCE(pv.name, 'Base product') AS variant_name,
    CONCAT(
        '-- Review first for ', COALESCE(p.name, inv.productId), ' / ', COALESCE(pv.name, 'Base product'), '\n',
        'UPDATE inventory_levels SET ',
        'wholesaleQty = ', COALESCE(batch_totals.wholesaleQty, 0), ', ',
        'retailQty = ', COALESCE(batch_totals.retailQty, 0), ', ',
        'shelfQty = ', COALESCE(batch_totals.shelfQty, 0),
        ' WHERE id = ''', inv.id, ''';'
    ) AS suggested_inventory_sync_sql
FROM inventory_levels inv
LEFT JOIN products p
    ON p.id = inv.productId
LEFT JOIN product_variants pv
    ON pv.id = inv.variantId
LEFT JOIN (
    SELECT
        productId,
        NULLIF(TRIM(variantId), '') AS variantId,
        SUM(CASE WHEN status != 'disposed' THEN wholesaleQty ELSE 0 END) AS wholesaleQty,
        SUM(CASE WHEN status != 'disposed' THEN retailQty ELSE 0 END) AS retailQty,
        SUM(CASE WHEN status != 'disposed' THEN shelfQty ELSE 0 END) AS shelfQty
    FROM product_batches
    GROUP BY productId, NULLIF(TRIM(variantId), '')
) batch_totals
    ON batch_totals.productId = inv.productId
   AND (
        (batch_totals.variantId IS NULL AND NULLIF(TRIM(inv.variantId), '') IS NULL)
        OR batch_totals.variantId = NULLIF(TRIM(inv.variantId), '')
   )
WHERE inv.wholesaleQty <> COALESCE(batch_totals.wholesaleQty, 0)
   OR inv.retailQty <> COALESCE(batch_totals.retailQty, 0)
   OR inv.shelfQty <> COALESCE(batch_totals.shelfQty, 0)
ORDER BY product_name, variant_name;

SELECT
    pb.productId,
    COALESCE(p.name, pb.productId) AS product_name,
    pb.variantId,
    COALESCE(pv.name, 'Base product') AS variant_name,
    pb.id AS batch_id,
    pb.batchNumber,
    pb.expirationDate,
    pb.wholesaleQty,
    pb.retailQty,
    pb.shelfQty,
    pb.status
FROM product_batches pb
LEFT JOIN products p
    ON p.id = pb.productId
LEFT JOIN product_variants pv
    ON pv.id = pb.variantId
WHERE EXISTS (
    SELECT 1
    FROM inventory_levels inv
    LEFT JOIN (
        SELECT
            productId,
            NULLIF(TRIM(variantId), '') AS variantId,
            SUM(CASE WHEN status != 'disposed' THEN wholesaleQty ELSE 0 END) AS wholesaleQty,
            SUM(CASE WHEN status != 'disposed' THEN retailQty ELSE 0 END) AS retailQty,
            SUM(CASE WHEN status != 'disposed' THEN shelfQty ELSE 0 END) AS shelfQty
        FROM product_batches
        GROUP BY productId, NULLIF(TRIM(variantId), '')
    ) batch_totals
        ON batch_totals.productId = inv.productId
       AND (
            (batch_totals.variantId IS NULL AND NULLIF(TRIM(inv.variantId), '') IS NULL)
            OR batch_totals.variantId = NULLIF(TRIM(inv.variantId), '')
       )
    WHERE inv.productId = pb.productId
      AND (
            (NULLIF(TRIM(inv.variantId), '') IS NULL AND NULLIF(TRIM(pb.variantId), '') IS NULL)
            OR NULLIF(TRIM(inv.variantId), '') = NULLIF(TRIM(pb.variantId), '')
      )
      AND (
            inv.wholesaleQty <> COALESCE(batch_totals.wholesaleQty, 0)
         OR inv.retailQty <> COALESCE(batch_totals.retailQty, 0)
         OR inv.shelfQty <> COALESCE(batch_totals.shelfQty, 0)
      )
)
ORDER BY product_name, variant_name, pb.expirationDate, pb.receivedDate;

-- Helper query for transfer panel candidates
SELECT
    inv.id AS inventory_id,
    inv.productId,
    COALESCE(p.name, inv.productId) AS product_name,
    NULLIF(TRIM(inv.variantId), '') AS normalized_variant_id,
    COALESCE(pv.name, 'Base product') AS variant_name,
    inv.retailQty AS inventory_retail,
    inv.shelfQty AS inventory_shelf,
    COALESCE(batch_totals.retailQty, 0) AS batch_retail,
    COALESCE(batch_totals.shelfQty, 0) AS batch_shelf,
    inv.retailQty - COALESCE(batch_totals.retailQty, 0) AS retail_diff,
    inv.shelfQty - COALESCE(batch_totals.shelfQty, 0) AS shelf_diff,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM product_variants pv2 WHERE pv2.productId = inv.productId
      ) THEN 'product has variants'
      ELSE 'product has no variants'
    END AS product_variant_support,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM inventory_levels base_inv WHERE base_inv.productId = inv.productId AND NULLIF(TRIM(base_inv.variantId), '') IS NULL)
      THEN 'base inventory row exists'
      ELSE 'no base inventory row'
    END AS base_row_status,
    CASE
      WHEN NULLIF(TRIM(inv.variantId), '') IS NULL THEN 'base row' ELSE 'variant row' END AS row_type,
    CASE
      WHEN NULLIF(TRIM(inv.variantId), '') IS NULL THEN
        'selectedVariant = __base__ or blank'
      ELSE
        'selectedVariant = variant id'
    END AS transfer_panel_selection_hint
FROM inventory_levels inv
LEFT JOIN products p
    ON p.id = inv.productId
LEFT JOIN product_variants pv
    ON pv.id = inv.variantId
LEFT JOIN (
    SELECT
        productId,
        NULLIF(TRIM(variantId), '') AS variantId,
        SUM(CASE WHEN status != 'disposed' THEN wholesaleQty ELSE 0 END) AS wholesaleQty,
        SUM(CASE WHEN status != 'disposed' THEN retailQty ELSE 0 END) AS retailQty,
        SUM(CASE WHEN status != 'disposed' THEN shelfQty ELSE 0 END) AS shelfQty
    FROM product_batches
    GROUP BY productId, NULLIF(TRIM(variantId), '')
) batch_totals
    ON batch_totals.productId = inv.productId
   AND (
        (batch_totals.variantId IS NULL AND NULLIF(TRIM(inv.variantId), '') IS NULL)
        OR batch_totals.variantId = NULLIF(TRIM(inv.variantId), '')
   )
WHERE inv.retailQty > 0
ORDER BY product_name, variant_name;
