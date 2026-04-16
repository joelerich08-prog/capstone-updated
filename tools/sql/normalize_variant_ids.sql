-- Normalize empty-string variant IDs to NULL for inventory consistency
-- Run this against the capstone_project database.

START TRANSACTION;

UPDATE inventory_levels
SET variantId = NULL
WHERE variantId = '';

UPDATE product_batches
SET variantId = NULL
WHERE variantId = '';

COMMIT;

-- Verify cleanup
SELECT
    COUNT(*) AS inv_rows,
    SUM(CASE WHEN variantId = '' THEN 1 ELSE 0 END) AS inv_empty_var,
    SUM(CASE WHEN variantId IS NULL THEN 1 ELSE 0 END) AS inv_null_var
FROM inventory_levels;

SELECT
    COUNT(*) AS pb_rows,
    SUM(CASE WHEN variantId = '' THEN 1 ELSE 0 END) AS pb_empty_var,
    SUM(CASE WHEN variantId IS NULL THEN 1 ELSE 0 END) AS pb_null_var
FROM product_batches;
