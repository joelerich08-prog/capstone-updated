-- MySQL Schema for Inventory Management System
-- Generated based on TypeScript interfaces in lib/types/index.ts
-- Uses InnoDB engine, appropriate keys, and TIMESTAMP for dates

-- Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'stockman', 'cashier', 'customer') NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    isActive TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL
) ENGINE=InnoDB;

-- Categories table (supports hierarchical categories)
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parentId VARCHAR(36),
    isActive TINYINT(1) DEFAULT 1,
    FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Suppliers table
CREATE TABLE suppliers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contactPerson VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    isActive TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

-- Products table
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    categoryId VARCHAR(36) NOT NULL,
    supplierId VARCHAR(36),
    costPrice DECIMAL(10,2) NOT NULL,
    wholesalePrice DECIMAL(10,2) NOT NULL,
    retailPrice DECIMAL(10,2) NOT NULL,
    images JSON, -- Array of image URLs
    isActive TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id),
    FOREIGN KEY (supplierId) REFERENCES suppliers(id)
) ENGINE=InnoDB;

-- Product variants table
CREATE TABLE product_variants (
    id VARCHAR(36) PRIMARY KEY,
    productId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    priceAdjustment DECIMAL(10,2) DEFAULT 0,
    sku VARCHAR(100),
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Inventory levels table (three-tier inventory)
CREATE TABLE inventory_levels (
    id VARCHAR(36) PRIMARY KEY,
    productId VARCHAR(36) NOT NULL,
    variantId VARCHAR(36),
    wholesaleQty INT NOT NULL DEFAULT 0,
    retailQty INT NOT NULL DEFAULT 0,
    shelfQty INT NOT NULL DEFAULT 0,
    wholesaleUnit VARCHAR(50) NOT NULL,
    retailUnit VARCHAR(50) NOT NULL,
    shelfUnit ENUM('pack') DEFAULT 'pack',
    pcsPerPack INT NOT NULL,
    packsPerBox INT NOT NULL,
    shelfRestockLevel INT NOT NULL DEFAULT 0,
    wholesaleReorderLevel INT NOT NULL DEFAULT 0,
    retailRestockLevel INT NOT NULL DEFAULT 0,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inventory (productId, variantId)
) ENGINE=InnoDB;

-- Product batches table (for expiry tracking)
CREATE TABLE product_batches (
    id VARCHAR(36) PRIMARY KEY,
    productId VARCHAR(36) NOT NULL,
    variantId VARCHAR(36),
    batchNumber VARCHAR(100) NOT NULL,
    expirationDate DATE NOT NULL,
    manufacturingDate DATE,
    receivedDate DATE NOT NULL,
    wholesaleQty INT NOT NULL DEFAULT 0,
    retailQty INT NOT NULL DEFAULT 0,
    shelfQty INT NOT NULL DEFAULT 0,
    initialQty INT NOT NULL,
    costPrice DECIMAL(10,2) NOT NULL,
    supplierId VARCHAR(36) NOT NULL,
    invoiceNumber VARCHAR(100),
    status ENUM('active', 'expiring_soon', 'expired', 'disposed') DEFAULT 'active',
    notes TEXT,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id)
) ENGINE=InnoDB;

-- Transactions table (POS sales)
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    invoiceNo VARCHAR(100) UNIQUE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    paymentType ENUM('cash', 'gcash', 'maya') NOT NULL,
    cashierId VARCHAR(36) NOT NULL,
    customerId VARCHAR(36),
    status ENUM('completed', 'refunded', 'cancelled') DEFAULT 'completed',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cashierId) REFERENCES users(id),
    FOREIGN KEY (customerId) REFERENCES users(id)
) ENGINE=InnoDB;

-- Transaction items table
CREATE TABLE transaction_items (
    id VARCHAR(36) PRIMARY KEY,
    transactionId VARCHAR(36) NOT NULL,
    productId VARCHAR(36) NOT NULL,
    variantId VARCHAR(36),
    productName VARCHAR(255) NOT NULL,
    variantName VARCHAR(255),
    quantity INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id),
    FOREIGN KEY (variantId) REFERENCES product_variants(id)
) ENGINE=InnoDB;

-- Orders table (online orders)
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    orderNo VARCHAR(100) UNIQUE NOT NULL,
    source ENUM('facebook', 'sms', 'website') NOT NULL,
    userId VARCHAR(36), -- For logged-in users
    customerName VARCHAR(255) NOT NULL,
    customerPhone VARCHAR(20) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    paymentMethod ENUM('cash', 'gcash', 'maya'),
    status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;

-- Order items table
CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    orderId VARCHAR(36) NOT NULL,
    productId VARCHAR(36) NOT NULL,
    variantId VARCHAR(36),
    productName VARCHAR(255) NOT NULL,
    variantName VARCHAR(255),
    quantity INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id),
    FOREIGN KEY (variantId) REFERENCES product_variants(id)
) ENGINE=InnoDB;

-- Store settings table
CREATE TABLE store_settings (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postalCode VARCHAR(20) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    taxId VARCHAR(100) NOT NULL,
    currency VARCHAR(20) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    businessHoursOpen VARCHAR(10) NOT NULL,
    businessHoursClose VARCHAR(10) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- POS settings table
CREATE TABLE pos_settings (
    id VARCHAR(36) PRIMARY KEY,
    quickAddMode TINYINT(1) DEFAULT 0,
    showProductImages TINYINT(1) DEFAULT 0,
    autoPrintReceipt TINYINT(1) DEFAULT 0,
    requireCustomerInfo TINYINT(1) DEFAULT 0,
    enableCashPayment TINYINT(1) DEFAULT 0,
    enableGCashPayment TINYINT(1) DEFAULT 0,
    enableMayaPayment TINYINT(1) DEFAULT 0,
    enableCardPayment TINYINT(1) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Printer devices table
CREATE TABLE printer_devices (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('receipt', 'label', 'report') NOT NULL,
    connectionType ENUM('usb', 'network', 'bluetooth') NOT NULL,
    ipAddress VARCHAR(100),
    port INT,
    isDefault TINYINT(1) DEFAULT 0,
    status ENUM('online', 'offline', 'error') DEFAULT 'offline',
    paperSize VARCHAR(50) NOT NULL,
    lastUsed TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Stock movements table
CREATE TABLE stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    productId VARCHAR(36) NOT NULL,
    variantId VARCHAR(36),
    movementType ENUM('receive', 'breakdown', 'transfer', 'sale', 'adjustment', 'damage', 'return') NOT NULL,
    fromTier ENUM('wholesale', 'retail', 'shelf'),
    toTier ENUM('wholesale', 'retail', 'shelf'),
    quantity INT NOT NULL,
    reason TEXT,
    notes TEXT,
    performedBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id),
    FOREIGN KEY (variantId) REFERENCES product_variants(id),
    FOREIGN KEY (performedBy) REFERENCES users(id)
) ENGINE=InnoDB;

-- Alerts table
CREATE TABLE alerts (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('low_stock', 'out_of_stock', 'expiring', 'expired', 'system') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    productId VARCHAR(36),
    isRead TINYINT(1) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id)
) ENGINE=InnoDB;

-- Activity logs table
CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    userName VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;

-- Role permissions table (RBAC)
CREATE TABLE role_permissions (
    role ENUM('admin', 'manager', 'stockman', 'cashier', 'customer') NOT NULL,
    module ENUM('dashboard', 'pos', 'inventory', 'products', 'suppliers', 'reports', 'users', 'settings') NOT NULL,
    action ENUM('view', 'create', 'edit', 'delete') NOT NULL,
    allowed TINYINT(1) DEFAULT 0,
    PRIMARY KEY (role, module, action)
) ENGINE=InnoDB;

-- Indexes for performance
CREATE INDEX idx_products_category ON products(categoryId);
CREATE INDEX idx_products_supplier ON products(supplierId);
CREATE INDEX idx_inventory_levels_product ON inventory_levels(productId);
CREATE INDEX idx_product_batches_product ON product_batches(productId);
CREATE INDEX idx_product_batches_expiration ON product_batches(expirationDate);
CREATE INDEX idx_transactions_cashier ON transactions(cashierId);
CREATE INDEX idx_transactions_created ON transactions(createdAt);
CREATE INDEX idx_orders_user ON orders(userId);
CREATE INDEX idx_orders_created ON orders(createdAt);
CREATE INDEX idx_stock_movements_product ON stock_movements(productId);
CREATE INDEX idx_stock_movements_created ON stock_movements(createdAt);
CREATE INDEX idx_alerts_product ON alerts(productId);
CREATE INDEX idx_alerts_created ON alerts(createdAt);
CREATE INDEX idx_activity_logs_user ON activity_logs(userId);
CREATE INDEX idx_activity_logs_created ON activity_logs(createdAt);
