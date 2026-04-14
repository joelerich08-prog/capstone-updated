-- System demo seed data
-- Includes:
-- 1. Store settings and POS settings
-- 2. Product variants for selected items
-- 3. Alerts and activity logs
--
-- Run this after schema.sql and seed_demo_operations.sql.
-- If you also want the chichirya catalog, run seed_chichirya_products.sql first.

START TRANSACTION;

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
    (
        'cfg-store-001',
        'My Store Grocery and Convenience',
        '123 National Highway, Barangay San Antonio',
        'Santa Rosa',
        '4026',
        '+63 49 555 0123',
        'hello@mystore.local',
        'TAX-2026-001',
        'PHP',
        'Asia/Manila',
        '07:00',
        '21:00',
        '2026-04-01 08:00:00',
        '2026-04-15 09:00:00'
    )
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
    (
        'cfg-pos-001',
        1,
        1,
        0,
        0,
        1,
        1,
        1,
        0,
        '2026-04-01 08:05:00',
        '2026-04-15 09:05:00'
    )
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

INSERT INTO alerts (
    id,
    type,
    priority,
    title,
    message,
    productId,
    isRead,
    createdAt
)
VALUES
    (
        'alt-low-coke',
        'low_stock',
        'high',
        'Low stock on Coca-Cola Mismo',
        'Coca-Cola Mismo 295ml is nearing its reorder level. Prepare the next replenishment order.',
        'prd-coke-mismo',
        0,
        '2026-04-15 08:45:00'
    ),
    (
        'alt-expiring-tuna',
        'expiring',
        'medium',
        'Century Tuna batch expiring soon',
        'The active batch for Century Tuna Hot and Spicy will expire within the next 90 days.',
        'prd-century-tuna-hotspicy',
        0,
        '2026-04-15 09:10:00'
    ),
    (
        'alt-out-cupnoodles',
        'out_of_stock',
        'critical',
        'Cup noodles out of stock',
        'Nissin Cup Noodles Beef has reached zero shelf stock and needs immediate restocking.',
        'prd-cupnoodles-beef',
        0,
        '2026-04-15 09:25:00'
    ),
    (
        'alt-system-pos',
        'system',
        'low',
        'POS settings updated',
        'POS quick add mode and mobile payments were updated from the admin settings panel.',
        NULL,
        1,
        '2026-04-15 09:40:00'
    ),
    (
        'alt-low-soysauce',
        'low_stock',
        'medium',
        'Datu Puti soy sauce is running low',
        'Datu Puti Soy Sauce 1L is below its preferred shelf stock threshold.',
        'prd-datupoti-soysauce',
        0,
        '2026-04-15 10:05:00'
    )
ON DUPLICATE KEY UPDATE
    type = VALUES(type),
    priority = VALUES(priority),
    title = VALUES(title),
    message = VALUES(message),
    productId = VALUES(productId),
    isRead = VALUES(isRead),
    createdAt = VALUES(createdAt);

INSERT INTO activity_logs (
    id,
    userId,
    userName,
    action,
    details,
    createdAt
)
VALUES
    (
        'log-20260415-001',
        'usr-admin-001',
        'Andrea Reyes',
        'Updated store settings',
        'Updated business hours and contact details in the store settings panel.',
        '2026-04-15 08:58:00'
    ),
    (
        'log-20260415-002',
        'usr-manager-001',
        'Marco Villanueva',
        'Reviewed inventory alerts',
        'Reviewed low stock and expiring item alerts for beverage and pantry categories.',
        '2026-04-15 09:15:00'
    ),
    (
        'log-20260415-003',
        'usr-stockman-001',
        'Paolo Garcia',
        'Received stock shipment',
        'Recorded incoming cases for noodles, canned goods, and condiments from suppliers.',
        '2026-04-15 09:35:00'
    ),
    (
        'log-20260415-004',
        'usr-cashier-001',
        'Jessa Cruz',
        'Processed POS sale',
        'Completed a counter sale with mixed payment items and printed a receipt.',
        '2026-04-15 10:22:00'
    ),
    (
        'log-20260415-005',
        'usr-admin-001',
        'Andrea Reyes',
        'Updated POS settings',
        'Enabled quick add mode and mobile payment options for the cashier workflow.',
        '2026-04-15 10:40:00'
    ),
    (
        'log-20260415-006',
        'usr-stockman-001',
        'Paolo Garcia',
        'Adjusted batch stock',
        'Balanced shelf and retail quantities after stock replenishment.',
        '2026-04-15 11:05:00'
    ),
    (
        'log-20260415-007',
        'usr-manager-001',
        'Marco Villanueva',
        'Monitored sales report',
        'Reviewed the day-to-date sales trend and top moving grocery items.',
        '2026-04-15 11:45:00'
    ),
    (
        'log-20260415-008',
        'usr-cashier-001',
        'Jessa Cruz',
        'Prepared customer order',
        'Marked an SMS order as ready for pickup and verified payment details.',
        '2026-04-15 12:20:00'
    )
ON DUPLICATE KEY UPDATE
    userId = VALUES(userId),
    userName = VALUES(userName),
    action = VALUES(action),
    details = VALUES(details),
    createdAt = VALUES(createdAt);

COMMIT;
