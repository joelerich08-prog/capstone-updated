-- Combined demo seed data
-- Loads the full demo set in one shot:
-- 1. Categories and suppliers
-- 2. Users and role_permissions
-- 3. Chichirya products
-- 4. Additional Filipino grocery products
-- 5. Inventory levels and product batches
-- 6. Transactions, orders, and line items
-- 7. Store settings, POS settings, product variants, alerts, and activity logs
--
-- Run this after schema.sql on an empty database or a clean demo database.

START TRANSACTION;

INSERT INTO categories (id, name, description, parentId, isActive)
VALUES
    ('cat-snacks', 'Snacks', 'Packaged snack products and chichirya items', NULL, 1),
    ('cat-chichirya', 'Chichirya', 'Filipino chips, crackers, and puffed snack products', 'cat-snacks', 1),
    ('cat-beverages', 'Beverages', 'Soft drinks, coffee, milk, and ready-to-drink items', NULL, 1),
    ('cat-canned-goods', 'Canned Goods', 'Shelf-stable canned food items', NULL, 1),
    ('cat-instant-noodles', 'Instant Noodles', 'Cup and pack noodles for quick meals', NULL, 1),
    ('cat-condiments', 'Condiments', 'Sauces and pantry flavoring essentials', NULL, 1),
    ('cat-breakfast', 'Breakfast Essentials', 'Coffee, milk, and breakfast pantry items', NULL, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    parentId = VALUES(parentId),
    isActive = VALUES(isActive);

INSERT INTO suppliers (id, name, contactPerson, phone, email, address, isActive)
VALUES
    ('sup-snack-hub', 'Snack Hub Distributors', 'Ramon Dela Cruz', '09171234567', 'sales@snackhub.local', 'National Highway, San Pablo City, Laguna', 1),
    ('sup-pinoy-grocery', 'Pinoy Grocery Trading', 'Marissa Santos', '09170001111', 'orders@pinoygrocery.local', 'Calamba City, Laguna', 1),
    ('sup-bev-source', 'Beverage Source Depot', 'Joel Ramirez', '09170002222', 'sales@bevsource.local', 'Sta. Rosa City, Laguna', 1),
    ('sup-pantry-direct', 'Pantry Direct Wholesale', 'Liza Mendoza', '09170003333', 'support@pantrydirect.local', 'San Pablo City, Laguna', 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    contactPerson = VALUES(contactPerson),
    phone = VALUES(phone),
    email = VALUES(email),
    address = VALUES(address),
    isActive = VALUES(isActive);

INSERT INTO users (id, email, name, role, password_hash, avatar, isActive, createdAt, lastLogin)
VALUES
    ('usr-admin-001', 'admin@mystore.com', 'Andrea Reyes', 'admin', '$2y$10$7XNTBKb9c4xmeY.mpRauZuPaUR5doK6ktxgNaXgxqTWtqF8lvEu7e', NULL, 1, '2026-04-01 08:00:00', '2026-04-15 08:10:00'),
    ('usr-manager-001', 'manager@mystore.com', 'Marco Villanueva', 'manager', '$2y$10$2AKavqWzKvbPALBkim7mxu/KhHgXUj4tPZaOSqDZPUeU.YEc2U/2C', NULL, 1, '2026-04-01 08:15:00', '2026-04-15 08:20:00'),
    ('usr-stockman-001', 'stock@mystore.com', 'Paolo Garcia', 'stockman', '$2y$10$Z.JO9zsEGPBfAtF.cmWYCueJIoA/D98V6gso0vknGMZgFLvywzDtq', NULL, 1, '2026-04-01 08:30:00', '2026-04-15 07:55:00'),
    ('usr-cashier-001', 'cashier@mystore.com', 'Jessa Cruz', 'cashier', '$2y$10$bPQNhbx25ryWUbSLAERVK.xO1KF80mWaAu.l.EGwj/bR4Qn26ry4O', NULL, 1, '2026-04-01 08:45:00', '2026-04-15 09:00:00'),
    ('usr-customer-001', 'customer@mystore.com', 'Miguel Santos', 'customer', '$2y$10$IGARKNArkqMcqz4PVZDuAuFlquOz5lNmg8LGaquflaETVeLP4Gmfq', NULL, 1, '2026-04-02 10:00:00', '2026-04-14 18:30:00'),
    ('usr-customer-002', 'ana.delosreyes@example.com', 'Ana Dela Reyes', 'customer', '$2y$10$IGARKNArkqMcqz4PVZDuAuFlquOz5lNmg8LGaquflaETVeLP4Gmfq', NULL, 1, '2026-04-03 13:20:00', '2026-04-14 16:45:00')
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    name = VALUES(name),
    role = VALUES(role),
    password_hash = VALUES(password_hash),
    avatar = VALUES(avatar),
    isActive = VALUES(isActive),
    createdAt = VALUES(createdAt),
    lastLogin = VALUES(lastLogin);

INSERT INTO role_permissions (role, module, action, allowed)
VALUES
    ('admin', 'dashboard', 'view', 1), ('admin', 'dashboard', 'create', 1), ('admin', 'dashboard', 'edit', 1), ('admin', 'dashboard', 'delete', 1),
    ('admin', 'pos', 'view', 1), ('admin', 'pos', 'create', 1), ('admin', 'pos', 'edit', 1), ('admin', 'pos', 'delete', 1),
    ('admin', 'inventory', 'view', 1), ('admin', 'inventory', 'create', 1), ('admin', 'inventory', 'edit', 1), ('admin', 'inventory', 'delete', 1),
    ('admin', 'products', 'view', 1), ('admin', 'products', 'create', 1), ('admin', 'products', 'edit', 1), ('admin', 'products', 'delete', 1),
    ('admin', 'suppliers', 'view', 1), ('admin', 'suppliers', 'create', 1), ('admin', 'suppliers', 'edit', 1), ('admin', 'suppliers', 'delete', 1),
    ('admin', 'reports', 'view', 1), ('admin', 'reports', 'create', 1), ('admin', 'reports', 'edit', 1), ('admin', 'reports', 'delete', 1),
    ('admin', 'users', 'view', 1), ('admin', 'users', 'create', 1), ('admin', 'users', 'edit', 1), ('admin', 'users', 'delete', 1),
    ('admin', 'settings', 'view', 1), ('admin', 'settings', 'create', 1), ('admin', 'settings', 'edit', 1), ('admin', 'settings', 'delete', 1),
    ('manager', 'dashboard', 'view', 1), ('manager', 'dashboard', 'create', 0), ('manager', 'dashboard', 'edit', 0), ('manager', 'dashboard', 'delete', 0),
    ('manager', 'pos', 'view', 1), ('manager', 'pos', 'create', 1), ('manager', 'pos', 'edit', 1), ('manager', 'pos', 'delete', 0),
    ('manager', 'inventory', 'view', 1), ('manager', 'inventory', 'create', 1), ('manager', 'inventory', 'edit', 1), ('manager', 'inventory', 'delete', 0),
    ('manager', 'products', 'view', 1), ('manager', 'products', 'create', 1), ('manager', 'products', 'edit', 1), ('manager', 'products', 'delete', 0),
    ('manager', 'suppliers', 'view', 1), ('manager', 'suppliers', 'create', 1), ('manager', 'suppliers', 'edit', 1), ('manager', 'suppliers', 'delete', 0),
    ('manager', 'reports', 'view', 1), ('manager', 'reports', 'create', 0), ('manager', 'reports', 'edit', 0), ('manager', 'reports', 'delete', 0),
    ('manager', 'users', 'view', 1), ('manager', 'users', 'create', 0), ('manager', 'users', 'edit', 0), ('manager', 'users', 'delete', 0),
    ('manager', 'settings', 'view', 1), ('manager', 'settings', 'create', 0), ('manager', 'settings', 'edit', 0), ('manager', 'settings', 'delete', 0),
    ('stockman', 'dashboard', 'view', 1), ('stockman', 'dashboard', 'create', 0), ('stockman', 'dashboard', 'edit', 0), ('stockman', 'dashboard', 'delete', 0),
    ('stockman', 'pos', 'view', 0), ('stockman', 'pos', 'create', 0), ('stockman', 'pos', 'edit', 0), ('stockman', 'pos', 'delete', 0),
    ('stockman', 'inventory', 'view', 1), ('stockman', 'inventory', 'create', 1), ('stockman', 'inventory', 'edit', 1), ('stockman', 'inventory', 'delete', 0),
    ('stockman', 'products', 'view', 1), ('stockman', 'products', 'create', 1), ('stockman', 'products', 'edit', 1), ('stockman', 'products', 'delete', 0),
    ('stockman', 'suppliers', 'view', 1), ('stockman', 'suppliers', 'create', 0), ('stockman', 'suppliers', 'edit', 0), ('stockman', 'suppliers', 'delete', 0),
    ('stockman', 'reports', 'view', 0), ('stockman', 'reports', 'create', 0), ('stockman', 'reports', 'edit', 0), ('stockman', 'reports', 'delete', 0),
    ('stockman', 'users', 'view', 0), ('stockman', 'users', 'create', 0), ('stockman', 'users', 'edit', 0), ('stockman', 'users', 'delete', 0),
    ('stockman', 'settings', 'view', 0), ('stockman', 'settings', 'create', 0), ('stockman', 'settings', 'edit', 0), ('stockman', 'settings', 'delete', 0),
    ('cashier', 'dashboard', 'view', 1), ('cashier', 'dashboard', 'create', 0), ('cashier', 'dashboard', 'edit', 0), ('cashier', 'dashboard', 'delete', 0),
    ('cashier', 'pos', 'view', 1), ('cashier', 'pos', 'create', 1), ('cashier', 'pos', 'edit', 1), ('cashier', 'pos', 'delete', 0),
    ('cashier', 'inventory', 'view', 1), ('cashier', 'inventory', 'create', 0), ('cashier', 'inventory', 'edit', 0), ('cashier', 'inventory', 'delete', 0),
    ('cashier', 'products', 'view', 1), ('cashier', 'products', 'create', 0), ('cashier', 'products', 'edit', 0), ('cashier', 'products', 'delete', 0),
    ('cashier', 'suppliers', 'view', 0), ('cashier', 'suppliers', 'create', 0), ('cashier', 'suppliers', 'edit', 0), ('cashier', 'suppliers', 'delete', 0),
    ('cashier', 'reports', 'view', 0), ('cashier', 'reports', 'create', 0), ('cashier', 'reports', 'edit', 0), ('cashier', 'reports', 'delete', 0),
    ('cashier', 'users', 'view', 0), ('cashier', 'users', 'create', 0), ('cashier', 'users', 'edit', 0), ('cashier', 'users', 'delete', 0),
    ('cashier', 'settings', 'view', 0), ('cashier', 'settings', 'create', 0), ('cashier', 'settings', 'edit', 0), ('cashier', 'settings', 'delete', 0),
    ('customer', 'dashboard', 'view', 0), ('customer', 'dashboard', 'create', 0), ('customer', 'dashboard', 'edit', 0), ('customer', 'dashboard', 'delete', 0),
    ('customer', 'pos', 'view', 0), ('customer', 'pos', 'create', 0), ('customer', 'pos', 'edit', 0), ('customer', 'pos', 'delete', 0),
    ('customer', 'inventory', 'view', 0), ('customer', 'inventory', 'create', 0), ('customer', 'inventory', 'edit', 0), ('customer', 'inventory', 'delete', 0),
    ('customer', 'products', 'view', 1), ('customer', 'products', 'create', 0), ('customer', 'products', 'edit', 0), ('customer', 'products', 'delete', 0),
    ('customer', 'suppliers', 'view', 0), ('customer', 'suppliers', 'create', 0), ('customer', 'suppliers', 'edit', 0), ('customer', 'suppliers', 'delete', 0),
    ('customer', 'reports', 'view', 0), ('customer', 'reports', 'create', 0), ('customer', 'reports', 'edit', 0), ('customer', 'reports', 'delete', 0),
    ('customer', 'users', 'view', 0), ('customer', 'users', 'create', 0), ('customer', 'users', 'edit', 0), ('customer', 'users', 'delete', 0),
    ('customer', 'settings', 'view', 0), ('customer', 'settings', 'create', 0), ('customer', 'settings', 'edit', 0), ('customer', 'settings', 'delete', 0)
ON DUPLICATE KEY UPDATE
    allowed = VALUES(allowed);

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
    ('prd-piattos-cheese', 'CHI-PIATTOS-CHEESE-40G', 'Piattos Cheese', 'Potato crisps with rich cheese flavor.', 'cat-chichirya', 'sup-snack-hub', 14.00, 18.50, 22.00, '[]', 1),
    ('prd-nova-cheddar', 'CHI-NOVA-CHEDDAR-40G', 'Nova Country Cheddar', 'Crunchy corn snack with cheddar flavor.', 'cat-chichirya', 'sup-snack-hub', 13.00, 17.50, 20.00, '[]', 1),
    ('prd-vcut-bbq', 'CHI-VCUT-BBQ-60G', 'V-Cut Barbecue', 'Ridged potato chips with barbecue seasoning.', 'cat-chichirya', 'sup-snack-hub', 16.00, 21.00, 25.00, '[]', 1),
    ('prd-chippy-bbq', 'CHI-CHIPPY-BBQ-45G', 'Chippy Barbecue', 'Corn chips with sweet barbecue flavor.', 'cat-chichirya', 'sup-snack-hub', 12.50, 16.50, 19.00, '[]', 1),
    ('prd-clover-bits', 'CHI-CLOVER-ORIG-55G', 'Clover Chips Original', 'Classic clover-shaped corn snack.', 'cat-chichirya', 'sup-snack-hub', 12.00, 16.00, 18.00, '[]', 1),
    ('prd-rollercoaster-cheese', 'CHI-ROLLER-CHEDDAR-85G', 'Roller Coaster Cheddar', 'Ring-shaped snack with cheddar cheese flavor.', 'cat-chichirya', 'sup-snack-hub', 18.00, 23.50, 28.00, '[]', 1),
    ('prd-cracklings-original', 'CHI-CRACKLINGS-ORIG-90G', 'Cracklings Original', 'Crispy wheat snack with savory seasoning.', 'cat-chichirya', 'sup-snack-hub', 17.00, 22.50, 26.00, '[]', 1),
    ('prd-tortillos-nacho', 'CHI-TORTILLOS-NACHO-100G', 'Tortillos Nacho Cheese', 'Triangle corn chips with nacho cheese flavor.', 'cat-chichirya', 'sup-snack-hub', 20.00, 26.00, 31.00, '[]', 1),
    ('prd-oishi-prawn', 'CHI-OISHI-PRAWN-50G', 'Oishi Prawn Crackers', 'Light and crispy prawn-flavored crackers.', 'cat-chichirya', 'sup-snack-hub', 11.50, 15.50, 18.00, '[]', 1),
    ('prd-moby-caramel', 'CHI-MOBY-CARAMEL-50G', 'Moby Caramel Puffs', 'Sweet caramel-coated puffed corn snack.', 'cat-chichirya', 'sup-snack-hub', 13.50, 17.50, 21.00, '[]', 1),
    ('prd-coke-mismo', 'BEV-COKE-MISMO-295ML', 'Coca-Cola Mismo 295ml', 'Ready-to-drink soft drink in a small PET bottle.', 'cat-beverages', 'sup-bev-source', 12.00, 15.00, 18.00, '[]', 1),
    ('prd-kopiko-brown', 'BRK-KOPIKO-BROWN-30G', 'Kopiko Brown Twin Pack', 'Sweet 3-in-1 coffee mix twin pack sachet.', 'cat-breakfast', 'sup-pantry-direct', 13.50, 16.50, 20.00, '[]', 1),
    ('prd-bearbrand-sachet', 'BRK-BEARBRAND-33G', 'Bear Brand Fortified Sachet 33g', 'Powdered milk drink sachet.', 'cat-breakfast', 'sup-pantry-direct', 11.00, 14.00, 16.00, '[]', 1),
    ('prd-luckymepc-chilimansi', 'NDL-PC-CHILIMANSI-80G', 'Lucky Me Pancit Canton Chilimansi', 'Dry instant noodles with chilimansi flavor.', 'cat-instant-noodles', 'sup-pinoy-grocery', 13.00, 16.50, 19.00, '[]', 1),
    ('prd-cupnoodles-beef', 'NDL-CUP-BEEF-60G', 'Nissin Cup Noodles Beef', 'Instant cup noodles with beef flavor broth.', 'cat-instant-noodles', 'sup-pinoy-grocery', 18.00, 23.00, 27.00, '[]', 1),
    ('prd-century-tuna-hotspicy', 'CAN-TUNA-HOTSPICY-180G', 'Century Tuna Hot and Spicy 180g', 'Canned tuna flakes in oil with spicy seasoning.', 'cat-canned-goods', 'sup-pinoy-grocery', 34.00, 40.00, 45.00, '[]', 1),
    ('prd-argentina-cornedbeef', 'CAN-CB-ARG-150G', 'Argentina Corned Beef 150g', 'Affordable canned corned beef staple.', 'cat-canned-goods', 'sup-pinoy-grocery', 26.00, 31.00, 35.00, '[]', 1),
    ('prd-vienna-sausage', 'CAN-VIENNA-130G', 'Purefoods Vienna Sausage 130g', 'Classic canned sausage for meals and baon.', 'cat-canned-goods', 'sup-pinoy-grocery', 29.00, 34.00, 39.00, '[]', 1),
    ('prd-datupoti-soysauce', 'CON-SOY-DP-1L', 'Datu Puti Soy Sauce 1L', 'All-purpose soy sauce for cooking and dipping.', 'cat-condiments', 'sup-pantry-direct', 42.00, 49.00, 56.00, '[]', 1),
    ('prd-ufc-bananacatsup', 'CON-UFC-BANANA-550G', 'UFC Banana Catsup 550g', 'Sweet banana ketchup for fried dishes and merienda.', 'cat-condiments', 'sup-pantry-direct', 36.00, 42.00, 48.00, '[]', 1)
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
    ('inv-moby-caramel', 'prd-moby-caramel', NULL, 18, 32, 20, 'box', 'pack', 'pack', 1, 24, 10),
    ('inv-coke-mismo', 'prd-coke-mismo', NULL, 25, 60, 24, 'case', 'bottle', 'pack', 1, 24, 20),
    ('inv-kopiko-brown', 'prd-kopiko-brown', NULL, 20, 50, 30, 'box', 'pack', 'pack', 1, 24, 18),
    ('inv-bearbrand-sachet', 'prd-bearbrand-sachet', NULL, 18, 40, 24, 'box', 'sachet', 'pack', 1, 24, 16),
    ('inv-luckymepc-chilimansi', 'prd-luckymepc-chilimansi', NULL, 22, 48, 30, 'box', 'pack', 'pack', 1, 24, 18),
    ('inv-cupnoodles-beef', 'prd-cupnoodles-beef', NULL, 16, 30, 18, 'case', 'cup', 'pack', 1, 12, 10),
    ('inv-century-tuna-hotspicy', 'prd-century-tuna-hotspicy', NULL, 14, 28, 18, 'case', 'can', 'pack', 1, 12, 10),
    ('inv-argentina-cornedbeef', 'prd-argentina-cornedbeef', NULL, 16, 32, 18, 'case', 'can', 'pack', 1, 12, 10),
    ('inv-vienna-sausage', 'prd-vienna-sausage', NULL, 14, 26, 16, 'case', 'can', 'pack', 1, 12, 8),
    ('inv-datupoti-soysauce', 'prd-datupoti-soysauce', NULL, 12, 24, 12, 'case', 'bottle', 'pack', 1, 12, 8),
    ('inv-ufc-bananacatsup', 'prd-ufc-bananacatsup', NULL, 12, 24, 12, 'case', 'bottle', 'pack', 1, 12, 8)
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
    ('bat-piattos-cheese-001', 'prd-piattos-cheese', NULL, 'CHI-PIA-2026-001', '2026-11-30', '2026-03-10', '2026-04-10', 18, 36, 24, 78, 14.00, 'sup-snack-hub', 'INV-CHI-1001', 'active', 'Opening stock for Piattos Cheese'),
    ('bat-nova-cheddar-001', 'prd-nova-cheddar', NULL, 'CHI-NOV-2026-001', '2026-10-31', '2026-03-08', '2026-04-10', 16, 30, 20, 66, 13.00, 'sup-snack-hub', 'INV-CHI-1002', 'active', 'Opening stock for Nova Country Cheddar'),
    ('bat-vcut-bbq-001', 'prd-vcut-bbq', NULL, 'CHI-VCU-2026-001', '2026-12-15', '2026-03-20', '2026-04-10', 14, 24, 18, 56, 16.00, 'sup-snack-hub', 'INV-CHI-1003', 'active', 'Opening stock for V-Cut Barbecue'),
    ('bat-chippy-bbq-001', 'prd-chippy-bbq', NULL, 'CHI-CHI-2026-001', '2026-10-20', '2026-03-12', '2026-04-10', 20, 40, 24, 84, 12.50, 'sup-snack-hub', 'INV-CHI-1004', 'active', 'Opening stock for Chippy Barbecue'),
    ('bat-clover-bits-001', 'prd-clover-bits', NULL, 'CHI-CLO-2026-001', '2026-09-30', '2026-03-05', '2026-04-10', 22, 42, 26, 90, 12.00, 'sup-snack-hub', 'INV-CHI-1005', 'active', 'Opening stock for Clover Chips Original'),
    ('bat-rollercoaster-cheese-001', 'prd-rollercoaster-cheese', NULL, 'CHI-ROL-2026-001', '2027-01-15', '2026-03-25', '2026-04-10', 12, 24, 16, 52, 18.00, 'sup-snack-hub', 'INV-CHI-1006', 'active', 'Opening stock for Roller Coaster Cheddar'),
    ('bat-cracklings-original-001', 'prd-cracklings-original', NULL, 'CHI-CRA-2026-001', '2026-12-05', '2026-03-18', '2026-04-10', 10, 20, 14, 44, 17.00, 'sup-snack-hub', 'INV-CHI-1007', 'active', 'Opening stock for Cracklings Original'),
    ('bat-tortillos-nacho-001', 'prd-tortillos-nacho', NULL, 'CHI-TOR-2026-001', '2026-11-25', '2026-03-22', '2026-04-10', 10, 18, 12, 40, 20.00, 'sup-snack-hub', 'INV-CHI-1008', 'active', 'Opening stock for Tortillos Nacho Cheese'),
    ('bat-oishi-prawn-001', 'prd-oishi-prawn', NULL, 'CHI-OIS-2026-001', '2026-10-10', '2026-03-02', '2026-04-10', 24, 48, 30, 102, 11.50, 'sup-snack-hub', 'INV-CHI-1009', 'active', 'Opening stock for Oishi Prawn Crackers'),
    ('bat-moby-caramel-001', 'prd-moby-caramel', NULL, 'CHI-MOB-2026-001', '2026-09-15', '2026-03-01', '2026-04-10', 18, 32, 20, 70, 13.50, 'sup-snack-hub', 'INV-CHI-1010', 'active', 'Opening stock for Moby Caramel Puffs'),
    ('bat-coke-mismo-001', 'prd-coke-mismo', NULL, 'BEV-COKE-2026-001', '2026-12-31', '2026-03-30', '2026-04-08', 25, 60, 24, 109, 12.00, 'sup-bev-source', 'PIN-OPS-2001', 'active', 'Soft drink opening stock'),
    ('bat-kopiko-brown-001', 'prd-kopiko-brown', NULL, 'BRK-KOPIKO-2026-001', '2027-02-28', '2026-03-15', '2026-04-08', 20, 50, 30, 100, 13.50, 'sup-pantry-direct', 'PIN-OPS-2002', 'active', 'Coffee mix opening stock'),
    ('bat-bearbrand-sachet-001', 'prd-bearbrand-sachet', NULL, 'BRK-BEAR-2026-001', '2027-01-31', '2026-03-10', '2026-04-08', 18, 40, 24, 82, 11.00, 'sup-pantry-direct', 'PIN-OPS-2003', 'active', 'Milk sachet opening stock'),
    ('bat-luckymepc-chilimansi-001', 'prd-luckymepc-chilimansi', NULL, 'NDL-PC-2026-001', '2027-03-15', '2026-03-20', '2026-04-08', 22, 48, 30, 100, 13.00, 'sup-pinoy-grocery', 'PIN-OPS-2004', 'active', 'Pancit Canton opening stock'),
    ('bat-cupnoodles-beef-001', 'prd-cupnoodles-beef', NULL, 'NDL-CUP-2026-001', '2027-02-15', '2026-03-18', '2026-04-08', 16, 30, 18, 64, 18.00, 'sup-pinoy-grocery', 'PIN-OPS-2005', 'active', 'Cup noodles opening stock'),
    ('bat-century-tuna-hotspicy-001', 'prd-century-tuna-hotspicy', NULL, 'CAN-TUNA-2026-001', '2027-04-30', '2026-03-12', '2026-04-08', 14, 28, 18, 60, 34.00, 'sup-pinoy-grocery', 'PIN-OPS-2006', 'active', 'Century Tuna opening stock'),
    ('bat-argentina-cornedbeef-001', 'prd-argentina-cornedbeef', NULL, 'CAN-CB-2026-001', '2027-03-31', '2026-03-14', '2026-04-08', 16, 32, 18, 66, 26.00, 'sup-pinoy-grocery', 'PIN-OPS-2007', 'active', 'Corned beef opening stock'),
    ('bat-vienna-sausage-001', 'prd-vienna-sausage', NULL, 'CAN-VIENNA-2026-001', '2027-05-31', '2026-03-16', '2026-04-08', 14, 26, 16, 56, 29.00, 'sup-pinoy-grocery', 'PIN-OPS-2008', 'active', 'Vienna sausage opening stock'),
    ('bat-datupoti-soysauce-001', 'prd-datupoti-soysauce', NULL, 'CON-SOY-2026-001', '2027-06-30', '2026-03-05', '2026-04-08', 12, 24, 12, 48, 42.00, 'sup-pantry-direct', 'PIN-OPS-2009', 'active', 'Soy sauce opening stock'),
    ('bat-ufc-bananacatsup-001', 'prd-ufc-bananacatsup', NULL, 'CON-UFC-2026-001', '2027-04-15', '2026-03-08', '2026-04-08', 12, 24, 12, 48, 36.00, 'sup-pantry-direct', 'PIN-OPS-2010', 'active', 'Banana catsup opening stock')
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

INSERT INTO transactions (
    id,
    invoiceNo,
    subtotal,
    discount,
    total,
    paymentType,
    cashierId,
    customerId,
    status,
    createdAt
)
VALUES
    ('txn-20260415-001', 'INV-20260415-0001', 72.00, 0.00, 72.00, 'cash', 'usr-cashier-001', NULL, 'completed', '2026-04-15 09:05:00'),
    ('txn-20260415-002', 'INV-20260415-0002', 92.00, 7.00, 85.00, 'gcash', 'usr-cashier-001', 'usr-customer-001', 'completed', '2026-04-15 10:18:00'),
    ('txn-20260415-003', 'INV-20260415-0003', 101.00, 0.00, 101.00, 'maya', 'usr-cashier-001', 'usr-customer-002', 'completed', '2026-04-15 11:42:00'),
    ('txn-20260415-004', 'INV-20260415-0004', 139.00, 9.00, 130.00, 'cash', 'usr-cashier-001', NULL, 'completed', '2026-04-15 13:07:00')
ON DUPLICATE KEY UPDATE
    subtotal = VALUES(subtotal),
    discount = VALUES(discount),
    total = VALUES(total),
    paymentType = VALUES(paymentType),
    cashierId = VALUES(cashierId),
    customerId = VALUES(customerId),
    status = VALUES(status),
    createdAt = VALUES(createdAt);

INSERT INTO transaction_items (id, transactionId, productId, variantId, productName, variantName, quantity, unitPrice, subtotal)
VALUES
    ('txi-20260415-001', 'txn-20260415-001', 'prd-luckymepc-chilimansi', NULL, 'Lucky Me Pancit Canton Chilimansi', NULL, 2, 19.00, 38.00),
    ('txi-20260415-002', 'txn-20260415-001', 'prd-coke-mismo', NULL, 'Coca-Cola Mismo 295ml', NULL, 1, 18.00, 18.00),
    ('txi-20260415-003', 'txn-20260415-001', 'prd-bearbrand-sachet', NULL, 'Bear Brand Fortified Sachet 33g', NULL, 1, 16.00, 16.00),
    ('txi-20260415-004', 'txn-20260415-003', 'prd-kopiko-brown', NULL, 'Kopiko Brown Twin Pack', NULL, 2, 20.00, 40.00),
    ('txi-20260415-005', 'txn-20260415-003', 'prd-century-tuna-hotspicy', NULL, 'Century Tuna Hot and Spicy 180g', NULL, 1, 45.00, 45.00),
    ('txi-20260415-006', 'txn-20260415-003', 'prd-bearbrand-sachet', NULL, 'Bear Brand Fortified Sachet 33g', NULL, 1, 16.00, 16.00),
    ('txi-20260415-007', 'txn-20260415-002', 'prd-cupnoodles-beef', NULL, 'Nissin Cup Noodles Beef', NULL, 2, 27.00, 54.00),
    ('txi-20260415-008', 'txn-20260415-002', 'prd-coke-mismo', NULL, 'Coca-Cola Mismo 295ml', NULL, 1, 18.00, 18.00),
    ('txi-20260415-009', 'txn-20260415-002', 'prd-kopiko-brown', NULL, 'Kopiko Brown Twin Pack', NULL, 1, 20.00, 20.00),
    ('txi-20260415-011', 'txn-20260415-004', 'prd-argentina-cornedbeef', NULL, 'Argentina Corned Beef 150g', NULL, 1, 35.00, 35.00),
    ('txi-20260415-012', 'txn-20260415-004', 'prd-datupoti-soysauce', NULL, 'Datu Puti Soy Sauce 1L', NULL, 1, 56.00, 56.00),
    ('txi-20260415-013', 'txn-20260415-004', 'prd-ufc-bananacatsup', NULL, 'UFC Banana Catsup 550g', NULL, 1, 48.00, 48.00)
ON DUPLICATE KEY UPDATE
    transactionId = VALUES(transactionId),
    productId = VALUES(productId),
    variantId = VALUES(variantId),
    productName = VALUES(productName),
    variantName = VALUES(variantName),
    quantity = VALUES(quantity),
    unitPrice = VALUES(unitPrice),
    subtotal = VALUES(subtotal);

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
    ('ord-20260415-001', 'ORD-20260415-0001', 'website', 'usr-customer-001', 'Miguel Santos', '09181234567', 119.00, 'gcash', 'pending', 'Please deliver after 5 PM.', '2026-04-15 08:30:00'),
    ('ord-20260415-002', 'ORD-20260415-0002', 'facebook', NULL, 'Ana Dela Reyes', '09182345678', 104.00, 'cash', 'preparing', 'For same-day pickup.', '2026-04-15 09:50:00'),
    ('ord-20260415-003', 'ORD-20260415-0003', 'sms', NULL, 'Rico Navarro', '09183456789', 157.00, 'maya', 'ready', 'Customer will pick up before lunch.', '2026-04-15 10:40:00')
ON DUPLICATE KEY UPDATE
    source = VALUES(source),
    userId = VALUES(userId),
    customerName = VALUES(customerName),
    customerPhone = VALUES(customerPhone),
    total = VALUES(total),
    paymentMethod = VALUES(paymentMethod),
    status = VALUES(status),
    notes = VALUES(notes),
    createdAt = VALUES(createdAt);

INSERT INTO order_items (id, orderId, productId, variantId, productName, variantName, quantity, unitPrice)
VALUES
    ('ori-20260415-001', 'ord-20260415-001', 'prd-coke-mismo', NULL, 'Coca-Cola Mismo 295ml', NULL, 2, 18.00),
    ('ori-20260415-002', 'ord-20260415-001', 'prd-luckymepc-chilimansi', NULL, 'Lucky Me Pancit Canton Chilimansi', NULL, 2, 19.00),
    ('ori-20260415-003', 'ord-20260415-001', 'prd-century-tuna-hotspicy', NULL, 'Century Tuna Hot and Spicy 180g', NULL, 1, 45.00),
    ('ori-20260415-004', 'ord-20260415-002', 'prd-kopiko-brown', NULL, 'Kopiko Brown Twin Pack', NULL, 2, 20.00),
    ('ori-20260415-005', 'ord-20260415-002', 'prd-bearbrand-sachet', NULL, 'Bear Brand Fortified Sachet 33g', NULL, 1, 16.00),
    ('ori-20260415-006', 'ord-20260415-002', 'prd-ufc-bananacatsup', NULL, 'UFC Banana Catsup 550g', NULL, 1, 48.00),
    ('ori-20260415-008', 'ord-20260415-003', 'prd-argentina-cornedbeef', NULL, 'Argentina Corned Beef 150g', NULL, 1, 35.00),
    ('ori-20260415-009', 'ord-20260415-003', 'prd-datupoti-soysauce', NULL, 'Datu Puti Soy Sauce 1L', NULL, 1, 56.00),
    ('ori-20260415-010', 'ord-20260415-003', 'prd-vienna-sausage', NULL, 'Purefoods Vienna Sausage 130g', NULL, 1, 39.00),
    ('ori-20260415-011', 'ord-20260415-003', 'prd-cupnoodles-beef', NULL, 'Nissin Cup Noodles Beef', NULL, 1, 27.00)
ON DUPLICATE KEY UPDATE
    orderId = VALUES(orderId),
    productId = VALUES(productId),
    variantId = VALUES(variantId),
    productName = VALUES(productName),
    variantName = VALUES(variantName),
    quantity = VALUES(quantity),
    unitPrice = VALUES(unitPrice);

INSERT INTO store_settings (
    id,
    name,
    address,
    city,
    postalCode,
    phone,
    email,
    taxId,
    currency,
    timezone,
    businessHoursOpen,
    businessHoursClose,
    createdAt,
    updatedAt
)
VALUES
    ('cfg-store-001', 'My Store Grocery and Convenience', '123 National Highway, Barangay San Antonio', 'Santa Rosa', '4026', '+63 49 555 0123', 'hello@mystore.local', 'TAX-2026-001', 'PHP', 'Asia/Manila', '07:00', '21:00', '2026-04-01 08:00:00', '2026-04-15 09:00:00')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    address = VALUES(address),
    city = VALUES(city),
    postalCode = VALUES(postalCode),
    phone = VALUES(phone),
    email = VALUES(email),
    taxId = VALUES(taxId),
    currency = VALUES(currency),
    timezone = VALUES(timezone),
    businessHoursOpen = VALUES(businessHoursOpen),
    businessHoursClose = VALUES(businessHoursClose),
    createdAt = VALUES(createdAt),
    updatedAt = VALUES(updatedAt);

INSERT INTO pos_settings (
    id,
    quickAddMode,
    showProductImages,
    autoPrintReceipt,
    requireCustomerInfo,
    enableCashPayment,
    enableGCashPayment,
    enableMayaPayment,
    enableCardPayment,
    createdAt,
    updatedAt
)
VALUES
    ('cfg-pos-001', 1, 1, 0, 0, 1, 1, 1, 0, '2026-04-01 08:05:00', '2026-04-15 09:05:00')
ON DUPLICATE KEY UPDATE
    quickAddMode = VALUES(quickAddMode),
    showProductImages = VALUES(showProductImages),
    autoPrintReceipt = VALUES(autoPrintReceipt),
    requireCustomerInfo = VALUES(requireCustomerInfo),
    enableCashPayment = VALUES(enableCashPayment),
    enableGCashPayment = VALUES(enableGCashPayment),
    enableMayaPayment = VALUES(enableMayaPayment),
    enableCardPayment = VALUES(enableCardPayment),
    createdAt = VALUES(createdAt),
    updatedAt = VALUES(updatedAt);

INSERT INTO product_variants (id, productId, name, priceAdjustment, sku)
VALUES
    ('var-coke-mismo-1', 'prd-coke-mismo', '250ml Bottle', 0.00, 'BEV-COKE-MISMO-250ML'),
    ('var-coke-mismo-2', 'prd-coke-mismo', '330ml Bottle', 3.00, 'BEV-COKE-MISMO-330ML'),
    ('var-kopiko-brown-1', 'prd-kopiko-brown', 'Single Sachet', 0.00, 'BRK-KOPIKO-BROWN-SINGLE'),
    ('var-kopiko-brown-2', 'prd-kopiko-brown', 'Twin Pack', 6.00, 'BRK-KOPIKO-BROWN-TWIN'),
    ('var-luckymepc-1', 'prd-luckymepc-chilimansi', 'Original Pack', 0.00, 'NDL-PC-CHILIMANSI-ORIG'),
    ('var-luckymepc-2', 'prd-luckymepc-chilimansi', 'Extra Chilimansi', 1.50, 'NDL-PC-CHILIMANSI-XTRA'),
    ('var-century-tuna-1', 'prd-century-tuna-hotspicy', 'Regular Can', 0.00, 'CAN-TUNA-HOTSPICY-REG'),
    ('var-century-tuna-2', 'prd-century-tuna-hotspicy', 'Family Size', 18.00, 'CAN-TUNA-HOTSPICY-FAM'),
    ('var-datu-puti-1', 'prd-datupoti-soysauce', '1 Liter Bottle', 0.00, 'CON-SOY-DP-1L'),
    ('var-datu-puti-2', 'prd-datupoti-soysauce', '500ml Bottle', -12.00, 'CON-SOY-DP-500ML')
ON DUPLICATE KEY UPDATE
    productId = VALUES(productId),
    name = VALUES(name),
    priceAdjustment = VALUES(priceAdjustment),
    sku = VALUES(sku);

INSERT INTO alerts (id, type, priority, title, message, productId, isRead, createdAt)
VALUES
    ('alt-low-coke', 'low_stock', 'high', 'Low stock on Coca-Cola Mismo', 'Coca-Cola Mismo 295ml is nearing its reorder level. Prepare the next replenishment order.', 'prd-coke-mismo', 0, '2026-04-15 08:45:00'),
    ('alt-expiring-tuna', 'expiring', 'medium', 'Century Tuna batch expiring soon', 'The active batch for Century Tuna Hot and Spicy will expire within the next 90 days.', 'prd-century-tuna-hotspicy', 0, '2026-04-15 09:10:00'),
    ('alt-out-cupnoodles', 'out_of_stock', 'critical', 'Cup noodles out of stock', 'Nissin Cup Noodles Beef has reached zero shelf stock and needs immediate restocking.', 'prd-cupnoodles-beef', 0, '2026-04-15 09:25:00'),
    ('alt-system-pos', 'system', 'low', 'POS settings updated', 'POS quick add mode and mobile payments were updated from the admin settings panel.', NULL, 1, '2026-04-15 09:40:00'),
    ('alt-low-soysauce', 'low_stock', 'medium', 'Datu Puti soy sauce is running low', 'Datu Puti Soy Sauce 1L is below its preferred shelf stock threshold.', 'prd-datupoti-soysauce', 0, '2026-04-15 10:05:00')
ON DUPLICATE KEY UPDATE
    type = VALUES(type),
    priority = VALUES(priority),
    title = VALUES(title),
    message = VALUES(message),
    productId = VALUES(productId),
    isRead = VALUES(isRead),
    createdAt = VALUES(createdAt);

INSERT INTO activity_logs (id, userId, userName, action, details, createdAt)
VALUES
    ('log-20260415-001', 'usr-admin-001', 'Andrea Reyes', 'Updated store settings', 'Updated business hours and contact details in the store settings panel.', '2026-04-15 08:58:00'),
    ('log-20260415-002', 'usr-manager-001', 'Marco Villanueva', 'Reviewed inventory alerts', 'Reviewed low stock and expiring item alerts for beverage and pantry categories.', '2026-04-15 09:15:00'),
    ('log-20260415-003', 'usr-stockman-001', 'Paolo Garcia', 'Received stock shipment', 'Recorded incoming cases for noodles, canned goods, and condiments from suppliers.', '2026-04-15 09:35:00'),
    ('log-20260415-004', 'usr-cashier-001', 'Jessa Cruz', 'Processed POS sale', 'Completed a counter sale with mixed payment items and printed a receipt.', '2026-04-15 10:22:00'),
    ('log-20260415-005', 'usr-admin-001', 'Andrea Reyes', 'Updated POS settings', 'Enabled quick add mode and mobile payment options for the cashier workflow.', '2026-04-15 10:40:00'),
    ('log-20260415-006', 'usr-stockman-001', 'Paolo Garcia', 'Adjusted batch stock', 'Balanced shelf and retail quantities after stock replenishment.', '2026-04-15 11:05:00'),
    ('log-20260415-007', 'usr-manager-001', 'Marco Villanueva', 'Monitored sales report', 'Reviewed the day-to-date sales trend and top moving grocery items.', '2026-04-15 11:45:00'),
    ('log-20260415-008', 'usr-cashier-001', 'Jessa Cruz', 'Prepared customer order', 'Marked an SMS order as ready for pickup and verified payment details.', '2026-04-15 12:20:00')
ON DUPLICATE KEY UPDATE
    userId = VALUES(userId),
    userName = VALUES(userName),
    action = VALUES(action),
    details = VALUES(details),
    createdAt = VALUES(createdAt);

COMMIT;
