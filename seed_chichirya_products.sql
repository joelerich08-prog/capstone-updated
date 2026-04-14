-- Seed data for Filipino "chichirya" / snack products
-- Run this after schema.sql
-- Assumptions:
-- 1. The target database is already selected.
-- 2. These IDs are reserved for seed/demo data.
-- 3. This file is safe to rerun because it uses ON DUPLICATE KEY UPDATE.

START TRANSACTION;

INSERT INTO categories (id, name, description, parentId, isActive)
VALUES
    (
        'cat-snacks',
        'Snacks',
        'Packaged snack products and chichirya items',
        NULL,
        1
    ),
    (
        'cat-chichirya',
        'Chichirya',
        'Filipino chips, crackers, and puffed snack products',
        'cat-snacks',
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    parentId = VALUES(parentId),
    isActive = VALUES(isActive);

INSERT INTO suppliers (id, name, contactPerson, phone, email, address, isActive)
VALUES
    (
        'sup-snack-hub',
        'Snack Hub Distributors',
        'Ramon Dela Cruz',
        '09171234567',
        'sales@snackhub.local',
        'National Highway, San Pablo City, Laguna',
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    contactPerson = VALUES(contactPerson),
    phone = VALUES(phone),
    email = VALUES(email),
    address = VALUES(address),
    isActive = VALUES(isActive);

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
        'prd-piattos-cheese',
        'CHI-PIATTOS-CHEESE-40G',
        'Piattos Cheese',
        'Potato crisps with rich cheese flavor.',
        'cat-chichirya',
        'sup-snack-hub',
        14.00,
        18.50,
        22.00,
        '[]',
        1
    ),
    (
        'prd-nova-cheddar',
        'CHI-NOVA-CHEDDAR-40G',
        'Nova Country Cheddar',
        'Crunchy corn snack with cheddar flavor.',
        'cat-chichirya',
        'sup-snack-hub',
        13.00,
        17.50,
        20.00,
        '[]',
        1
    ),
    (
        'prd-vcut-bbq',
        'CHI-VCUT-BBQ-60G',
        'V-Cut Barbecue',
        'Ridged potato chips with barbecue seasoning.',
        'cat-chichirya',
        'sup-snack-hub',
        16.00,
        21.00,
        25.00,
        '[]',
        1
    ),
    (
        'prd-chippy-bbq',
        'CHI-CHIPPY-BBQ-45G',
        'Chippy Barbecue',
        'Corn chips with sweet barbecue flavor.',
        'cat-chichirya',
        'sup-snack-hub',
        12.50,
        16.50,
        19.00,
        '[]',
        1
    ),
    (
        'prd-clover-bits',
        'CHI-CLOVER-ORIG-55G',
        'Clover Chips Original',
        'Classic clover-shaped corn snack.',
        'cat-chichirya',
        'sup-snack-hub',
        12.00,
        16.00,
        18.00,
        '[]',
        1
    ),
    (
        'prd-rollercoaster-cheese',
        'CHI-ROLLER-CHEDDAR-85G',
        'Roller Coaster Cheddar',
        'Ring-shaped snack with cheddar cheese flavor.',
        'cat-chichirya',
        'sup-snack-hub',
        18.00,
        23.50,
        28.00,
        '[]',
        1
    ),
    (
        'prd-cracklings-original',
        'CHI-CRACKLINGS-ORIG-90G',
        'Cracklings Original',
        'Crispy wheat snack with savory seasoning.',
        'cat-chichirya',
        'sup-snack-hub',
        17.00,
        22.50,
        26.00,
        '[]',
        1
    ),
    (
        'prd-tortillos-nacho',
        'CHI-TORTILLOS-NACHO-100G',
        'Tortillos Nacho Cheese',
        'Triangle corn chips with nacho cheese flavor.',
        'cat-chichirya',
        'sup-snack-hub',
        20.00,
        26.00,
        31.00,
        '[]',
        1
    ),
    (
        'prd-oishi-prawn',
        'CHI-OISHI-PRAWN-50G',
        'Oishi Prawn Crackers',
        'Light and crispy prawn-flavored crackers.',
        'cat-chichirya',
        'sup-snack-hub',
        11.50,
        15.50,
        18.00,
        '[]',
        1
    ),
    (
        'prd-moby-caramel',
        'CHI-MOBY-CARAMEL-50G',
        'Moby Caramel Puffs',
        'Sweet caramel-coated puffed corn snack.',
        'cat-chichirya',
        'sup-snack-hub',
        13.50,
        17.50,
        21.00,
        '[]',
        1
    )
ON DUPLICATE KEY UPDATE
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
    reorderLevel
)
VALUES
    ('inv-piattos-cheese', 'prd-piattos-cheese', NULL, 18, 36, 24, 'box', 'pack', 'pack', 1, 24, 12),
    ('inv-nova-cheddar', 'prd-nova-cheddar', NULL, 16, 30, 20, 'box', 'pack', 'pack', 1, 24, 10),
    ('inv-vcut-bbq', 'prd-vcut-bbq', NULL, 14, 24, 18, 'box', 'pack', 'pack', 1, 24, 10),
    ('inv-chippy-bbq', 'prd-chippy-bbq', NULL, 20, 40, 24, 'box', 'pack', 'pack', 1, 24, 12),
    ('inv-clover-bits', 'prd-clover-bits', NULL, 22, 42, 26, 'box', 'pack', 'pack', 1, 24, 12),
    ('inv-rollercoaster-cheese', 'prd-rollercoaster-cheese', NULL, 12, 24, 16, 'box', 'pack', 'pack', 1, 20, 8),
    ('inv-cracklings-original', 'prd-cracklings-original', NULL, 10, 20, 14, 'box', 'pack', 'pack', 1, 20, 8),
    ('inv-tortillos-nacho', 'prd-tortillos-nacho', NULL, 10, 18, 12, 'box', 'pack', 'pack', 1, 18, 8),
    ('inv-oishi-prawn', 'prd-oishi-prawn', NULL, 24, 48, 30, 'box', 'pack', 'pack', 1, 24, 15),
    ('inv-moby-caramel', 'prd-moby-caramel', NULL, 18, 32, 20, 'box', 'pack', 'pack', 1, 24, 10)
ON DUPLICATE KEY UPDATE
    wholesaleQty = VALUES(wholesaleQty),
    retailQty = VALUES(retailQty),
    shelfQty = VALUES(shelfQty),
    wholesaleUnit = VALUES(wholesaleUnit),
    retailUnit = VALUES(retailUnit),
    shelfUnit = VALUES(shelfUnit),
    pcsPerPack = VALUES(pcsPerPack),
    packsPerBox = VALUES(packsPerBox),
    reorderLevel = VALUES(reorderLevel);

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
        'bat-piattos-cheese-001',
        'prd-piattos-cheese',
        NULL,
        'CHI-PIA-2026-001',
        '2026-11-30',
        '2026-03-10',
        '2026-04-10',
        18,
        36,
        24,
        78,
        14.00,
        'sup-snack-hub',
        'INV-CHI-1001',
        'active',
        'Opening stock for Piattos Cheese'
    ),
    (
        'bat-nova-cheddar-001',
        'prd-nova-cheddar',
        NULL,
        'CHI-NOV-2026-001',
        '2026-10-31',
        '2026-03-08',
        '2026-04-10',
        16,
        30,
        20,
        66,
        13.00,
        'sup-snack-hub',
        'INV-CHI-1002',
        'active',
        'Opening stock for Nova Country Cheddar'
    ),
    (
        'bat-vcut-bbq-001',
        'prd-vcut-bbq',
        NULL,
        'CHI-VCU-2026-001',
        '2026-12-15',
        '2026-03-20',
        '2026-04-10',
        14,
        24,
        18,
        56,
        16.00,
        'sup-snack-hub',
        'INV-CHI-1003',
        'active',
        'Opening stock for V-Cut Barbecue'
    ),
    (
        'bat-chippy-bbq-001',
        'prd-chippy-bbq',
        NULL,
        'CHI-CHI-2026-001',
        '2026-10-20',
        '2026-03-12',
        '2026-04-10',
        20,
        40,
        24,
        84,
        12.50,
        'sup-snack-hub',
        'INV-CHI-1004',
        'active',
        'Opening stock for Chippy Barbecue'
    ),
    (
        'bat-clover-bits-001',
        'prd-clover-bits',
        NULL,
        'CHI-CLO-2026-001',
        '2026-09-30',
        '2026-03-05',
        '2026-04-10',
        22,
        42,
        26,
        90,
        12.00,
        'sup-snack-hub',
        'INV-CHI-1005',
        'active',
        'Opening stock for Clover Chips Original'
    ),
    (
        'bat-rollercoaster-cheese-001',
        'prd-rollercoaster-cheese',
        NULL,
        'CHI-ROL-2026-001',
        '2027-01-15',
        '2026-03-25',
        '2026-04-10',
        12,
        24,
        16,
        52,
        18.00,
        'sup-snack-hub',
        'INV-CHI-1006',
        'active',
        'Opening stock for Roller Coaster Cheddar'
    ),
    (
        'bat-cracklings-original-001',
        'prd-cracklings-original',
        NULL,
        'CHI-CRA-2026-001',
        '2026-12-05',
        '2026-03-18',
        '2026-04-10',
        10,
        20,
        14,
        44,
        17.00,
        'sup-snack-hub',
        'INV-CHI-1007',
        'active',
        'Opening stock for Cracklings Original'
    ),
    (
        'bat-tortillos-nacho-001',
        'prd-tortillos-nacho',
        NULL,
        'CHI-TOR-2026-001',
        '2026-11-25',
        '2026-03-22',
        '2026-04-10',
        10,
        18,
        12,
        40,
        20.00,
        'sup-snack-hub',
        'INV-CHI-1008',
        'active',
        'Opening stock for Tortillos Nacho Cheese'
    ),
    (
        'bat-oishi-prawn-001',
        'prd-oishi-prawn',
        NULL,
        'CHI-OIS-2026-001',
        '2026-10-10',
        '2026-03-02',
        '2026-04-10',
        24,
        48,
        30,
        102,
        11.50,
        'sup-snack-hub',
        'INV-CHI-1009',
        'active',
        'Opening stock for Oishi Prawn Crackers'
    ),
    (
        'bat-moby-caramel-001',
        'prd-moby-caramel',
        NULL,
        'CHI-MOB-2026-001',
        '2026-09-15',
        '2026-03-01',
        '2026-04-10',
        18,
        32,
        20,
        70,
        13.50,
        'sup-snack-hub',
        'INV-CHI-1010',
        'active',
        'Opening stock for Moby Caramel Puffs'
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

COMMIT;
