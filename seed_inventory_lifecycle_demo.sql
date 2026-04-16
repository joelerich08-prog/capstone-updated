-- Inventory lifecycle demo seed
-- Purpose:
-- 1. Create a small, isolated dataset to verify FEFO batch consumption
-- 2. Verify exact batch restoration for POS refunds and order cancellation
-- 3. Make stock_movements.notes easy to inspect after operations
--
-- Recommended prerequisites:
-- 1. Run schema.sql
-- 2. Apply migrations/2026-04-15_add_stock_movements_notes.sql
--
-- What this seed creates:
-- 1. Admin, cashier, and customer demo users
-- 2. One demo product for POS checkout / refund from shelf stock
-- 3. One demo product for order fulfillment / cancellation from shelf stock
-- 4. Two FEFO-ordered batches per product so you can clearly see which batch is consumed first
-- 5. One pending website order ready to move through the lifecycle
--
-- Suggested walkthrough after seeding:
-- 1. Log in as cashier: cashier.lifecycle@mystore.local / password depends on your auth setup
-- 2. In POS, sell 7 units of "Lifecycle Demo Sardines 155g"
-- 3. Inspect product_batches and stock_movements:
--    - Batch 1 should be consumed first
--    - stock_movements.notes should contain JSON allocations
-- 4. Refund that transaction as admin
--    - The exact same batches should be restored
-- 5. Log in as admin/stockman and fulfill order ORD-LIFECYCLE-0001
-- 6. Cancel that same order
--    - The exact fulfilled batches should be restored

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM stock_movements
WHERE id IN (
    'mov-life-pos-sale',
    'mov-life-pos-refund',
    'mov-life-order-sale',
    'mov-life-order-restore'
)
OR notes LIKE '%ORD-LIFECYCLE-0001%'
OR notes LIKE '%transaction_item%lifecycle%';

DELETE FROM transaction_items
WHERE id IN (
    'txi-life-pos-001'
)
OR transactionId = 'txn-life-pos-001';

DELETE FROM transactions
WHERE id = 'txn-life-pos-001'
   OR invoiceNo = 'INV-LIFECYCLE-0001';

DELETE FROM order_items
WHERE orderId = 'ord-life-web-001'
   OR id IN ('ori-life-web-001');

DELETE FROM orders
WHERE id = 'ord-life-web-001'
   OR orderNo = 'ORD-LIFECYCLE-0001';

DELETE FROM product_batches
WHERE id IN (
    'bat-life-sardines-001',
    'bat-life-sardines-002',
    'bat-life-coffee-001',
    'bat-life-coffee-002'
);

DELETE FROM inventory_levels
WHERE id IN (
    'inv-life-sardines',
    'inv-life-coffee'
);

DELETE FROM product_variants
WHERE id IN (
    'var-life-sardines-base',
    'var-life-coffee-base'
);

DELETE FROM products
WHERE id IN (
    'prd-life-sardines',
    'prd-life-coffee'
);

DELETE FROM suppliers
WHERE id = 'sup-life-demo';

DELETE FROM categories
WHERE id IN ('cat-life-demo', 'cat-life-demo-orders');

DELETE FROM users
WHERE id IN (
    'usr-life-admin',
    'usr-life-cashier',
    'usr-life-customer'
);

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categories (id, name, description, parentId, isActive)
VALUES
    ('cat-life-demo', 'Lifecycle Demo', 'Products used to verify batch-aware inventory lifecycle behavior', NULL, 1),
    ('cat-life-demo-orders', 'Lifecycle Demo Orders', 'Order workflow demo products', NULL, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    parentId = VALUES(parentId),
    isActive = VALUES(isActive);

INSERT INTO suppliers (id, name, contactPerson, phone, email, address, isActive)
VALUES
    ('sup-life-demo', 'Lifecycle Demo Supplier', 'Demo Operator', '09170009999', 'lifecycle-demo@mystore.local', 'Santa Rosa, Laguna', 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    contactPerson = VALUES(contactPerson),
    phone = VALUES(phone),
    email = VALUES(email),
    address = VALUES(address),
    isActive = VALUES(isActive);

INSERT INTO users (id, email, name, role, password_hash, avatar, isActive, createdAt, lastLogin)
VALUES
    ('usr-life-admin', 'admin.lifecycle@mystore.local', 'Lifecycle Admin', 'admin', '$2y$10$7XNTBKb9c4xmeY.mpRauZuPaUR5doK6ktxgNaXgxqTWtqF8lvEu7e', NULL, 1, '2026-04-15 08:00:00', '2026-04-15 08:00:00'),
    ('usr-life-cashier', 'cashier.lifecycle@mystore.local', 'Lifecycle Cashier', 'cashier', '$2y$10$bPQNhbx25ryWUbSLAERVK.xO1KF80mWaAu.l.EGwj/bR4Qn26ry4O', NULL, 1, '2026-04-15 08:00:00', '2026-04-15 08:00:00'),
    ('usr-life-customer', 'customer.lifecycle@mystore.local', 'Lifecycle Customer', 'customer', '$2y$10$IGARKNArkqMcqz4PVZDuAuFlquOz5lNmg8LGaquflaETVeLP4Gmfq', NULL, 1, '2026-04-15 08:00:00', '2026-04-15 08:00:00')
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    name = VALUES(name),
    role = VALUES(role),
    password_hash = VALUES(password_hash),
    avatar = VALUES(avatar),
    isActive = VALUES(isActive),
    createdAt = VALUES(createdAt),
    lastLogin = VALUES(lastLogin);

INSERT INTO products (
    id,
    sku,
    name,
    description,
    categoryId,
    supplierId,
    costPrice,
    wholesalePrice,
    retailPrice,
    images,
    isActive
)
VALUES
    (
        'prd-life-sardines',
        'LIFE-SARDINES-155G',
        'Lifecycle Demo Sardines 155g',
        'Used to demonstrate FEFO shelf consumption and exact refund restoration.',
        'cat-life-demo',
        'sup-life-demo',
        18.00,
        22.00,
        27.00,
        '[]',
        1
    ),
    (
        'prd-life-coffee',
        'LIFE-COFFEE-20G',
        'Lifecycle Demo Coffee Sachet',
        'Used to demonstrate order fulfillment and cancellation with exact batch restoration.',
        'cat-life-demo-orders',
        'sup-life-demo',
        8.50,
        10.50,
        12.00,
        '[]',
        1
    )
ON DUPLICATE KEY UPDATE
    sku = VALUES(sku),
    name = VALUES(name),
    description = VALUES(description),
    categoryId = VALUES(categoryId),
    supplierId = VALUES(supplierId),
    costPrice = VALUES(costPrice),
    wholesalePrice = VALUES(wholesalePrice),
    retailPrice = VALUES(retailPrice),
    images = VALUES(images),
    isActive = VALUES(isActive);

INSERT INTO inventory_levels (
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
    shelfRestockLevel
)
VALUES
    ('inv-life-sardines', 'prd-life-sardines', NULL, 0, 0, 16, 'case', 'can', 'pack', 1, 24, 5),
    ('inv-life-coffee', 'prd-life-coffee', NULL, 0, 0, 12, 'box', 'sachet', 'pack', 1, 24, 4)
ON DUPLICATE KEY UPDATE
    wholesaleQty = VALUES(wholesaleQty),
    retailQty = VALUES(retailQty),
    shelfQty = VALUES(shelfQty),
    wholesaleUnit = VALUES(wholesaleUnit),
    retailUnit = VALUES(retailUnit),
    shelfUnit = VALUES(shelfUnit),
    pcsPerPack = VALUES(pcsPerPack),
    packsPerBox = VALUES(packsPerBox),
    shelfRestockLevel = VALUES(shelfRestockLevel);

INSERT INTO product_batches (
    id,
    productId,
    variantId,
    batchNumber,
    expirationDate,
    manufacturingDate,
    receivedDate,
    wholesaleQty,
    retailQty,
    shelfQty,
    initialQty,
    costPrice,
    supplierId,
    invoiceNumber,
    status,
    notes
)
VALUES
    (
        'bat-life-sardines-001',
        'prd-life-sardines',
        NULL,
        'LIFE-SAR-2026-001',
        '2026-05-15',
        '2026-03-20',
        '2026-04-01',
        0,
        0,
        6,
        6,
        18.00,
        'sup-life-demo',
        'INV-LIFE-RECV-001',
        'active',
        'Older FEFO shelf batch for POS demo'
    ),
    (
        'bat-life-sardines-002',
        'prd-life-sardines',
        NULL,
        'LIFE-SAR-2026-002',
        '2026-08-30',
        '2026-04-05',
        '2026-04-10',
        0,
        0,
        10,
        10,
        18.00,
        'sup-life-demo',
        'INV-LIFE-RECV-002',
        'active',
        'Newer shelf batch for POS demo'
    ),
    (
        'bat-life-coffee-001',
        'prd-life-coffee',
        NULL,
        'LIFE-COF-2026-001',
        '2026-06-01',
        '2026-03-18',
        '2026-04-01',
        0,
        0,
        5,
        5,
        8.50,
        'sup-life-demo',
        'INV-LIFE-RECV-003',
        'active',
        'Older FEFO shelf batch for order demo'
    ),
    (
        'bat-life-coffee-002',
        'prd-life-coffee',
        NULL,
        'LIFE-COF-2026-002',
        '2026-09-20',
        '2026-04-02',
        '2026-04-12',
        0,
        0,
        7,
        7,
        8.50,
        'sup-life-demo',
        'INV-LIFE-RECV-004',
        'active',
        'Newer shelf batch for order demo'
    )
ON DUPLICATE KEY UPDATE
    batchNumber = VALUES(batchNumber),
    expirationDate = VALUES(expirationDate),
    manufacturingDate = VALUES(manufacturingDate),
    receivedDate = VALUES(receivedDate),
    wholesaleQty = VALUES(wholesaleQty),
    retailQty = VALUES(retailQty),
    shelfQty = VALUES(shelfQty),
    initialQty = VALUES(initialQty),
    costPrice = VALUES(costPrice),
    supplierId = VALUES(supplierId),
    invoiceNumber = VALUES(invoiceNumber),
    status = VALUES(status),
    notes = VALUES(notes);

INSERT INTO orders (
    id,
    orderNo,
    source,
    userId,
    customerName,
    customerPhone,
    total,
    paymentMethod,
    status,
    notes,
    createdAt
)
VALUES
    (
        'ord-life-web-001',
        'ORD-LIFECYCLE-0001',
        'website',
        'usr-life-customer',
        'Lifecycle Customer',
        '09181230001',
        84.00,
        'gcash',
        'pending',
        'Use this order to test fulfillment and cancellation batch restoration.',
        '2026-04-15 09:00:00'
    )
ON DUPLICATE KEY UPDATE
    orderNo = VALUES(orderNo),
    source = VALUES(source),
    userId = VALUES(userId),
    customerName = VALUES(customerName),
    customerPhone = VALUES(customerPhone),
    total = VALUES(total),
    paymentMethod = VALUES(paymentMethod),
    status = VALUES(status),
    notes = VALUES(notes),
    createdAt = VALUES(createdAt);

INSERT INTO order_items (
    id,
    orderId,
    productId,
    variantId,
    productName,
    variantName,
    quantity,
    unitPrice
)
VALUES
    (
        'ori-life-web-001',
        'ord-life-web-001',
        'prd-life-coffee',
        NULL,
        'Lifecycle Demo Coffee Sachet',
        NULL,
        7,
        12.00
    )
ON DUPLICATE KEY UPDATE
    orderId = VALUES(orderId),
    productId = VALUES(productId),
    variantId = VALUES(variantId),
    productName = VALUES(productName),
    variantName = VALUES(variantName),
    quantity = VALUES(quantity),
    unitPrice = VALUES(unitPrice);

COMMIT;
