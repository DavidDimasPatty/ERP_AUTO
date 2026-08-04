-- CreateTable
CREATE TABLE `m_unit` (
    `unit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_code` VARCHAR(50) NOT NULL,
    `unit_name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_unit_unit_code_key`(`unit_code`),
    PRIMARY KEY (`unit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_brand` (
    `brand_id` INTEGER NOT NULL AUTO_INCREMENT,
    `brand_code` VARCHAR(50) NOT NULL,
    `brand_name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_brand_brand_code_key`(`brand_code`),
    PRIMARY KEY (`brand_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_supplier` (
    `supplier_id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier_code` VARCHAR(50) NOT NULL,
    `supplier_name` VARCHAR(150) NOT NULL,
    `address` TEXT NULL,
    `city_name` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `contact_person` VARCHAR(100) NULL,
    `payment_term_days` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_supplier_supplier_code_key`(`supplier_code`),
    PRIMARY KEY (`supplier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_customer` (
    `customer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_code` VARCHAR(50) NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL,
    `address` TEXT NULL,
    `city_name` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_customer_customer_code_key`(`customer_code`),
    PRIMARY KEY (`customer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_product` (
    `product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_code` VARCHAR(50) NOT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `brand_id` INTEGER NULL,
    `product_description` TEXT NULL,
    `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `minimum_stock` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_product_product_code_key`(`product_code`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_product_price` (
    `product_price_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `price_level_id` TINYINT NOT NULL,
    `price_amount` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_product_price_product_id_price_level_id_key`(`product_id`, `price_level_id`),
    PRIMARY KEY (`product_price_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_price_level` (
    `price_level_id` TINYINT NOT NULL,
    `price_level_code` VARCHAR(50) NOT NULL,
    `price_level_name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_price_level_price_level_code_key`(`price_level_code`),
    PRIMARY KEY (`price_level_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_role` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_code` VARCHAR(50) NOT NULL,
    `role_name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_role_role_code_key`(`role_code`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_user` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_user_username_key`(`username`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_menu` (
    `menu_id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent_menu_id` INTEGER NULL,
    `menu_code` VARCHAR(50) NOT NULL,
    `menu_name` VARCHAR(100) NOT NULL,
    `route_path` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `m_menu_menu_code_key`(`menu_code`),
    PRIMARY KEY (`menu_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_role_menu` (
    `role_id` INTEGER NOT NULL,
    `menu_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`role_id`, `menu_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_purchase` (
    `purchase_id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_number` VARCHAR(50) NOT NULL,
    `purchase_datetime` DATETIME(3) NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `supplier_name_snapshot` VARCHAR(150) NOT NULL,
    `supplier_invoice_number` VARCHAR(100) NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_by_name_snapshot` VARCHAR(150) NOT NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_purchase_purchase_number_key`(`purchase_number`),
    PRIMARY KEY (`purchase_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_purchase_detail` (
    `purchase_detail_id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_id` INTEGER NOT NULL,
    `line_number` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_code_snapshot` VARCHAR(50) NOT NULL,
    `product_name_snapshot` VARCHAR(200) NOT NULL,
    `unit_name_snapshot` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `purchase_unit_price` DECIMAL(15, 2) NOT NULL,
    `line_total` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_purchase_detail_purchase_id_product_id_key`(`purchase_id`, `product_id`),
    PRIMARY KEY (`purchase_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `m_product_stock` (
    `product_id` INTEGER NOT NULL,
    `stock_quantity` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_stock_movement` (
    `stock_movement_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `movement_type` VARCHAR(50) NOT NULL,
    `reference_number` VARCHAR(50) NOT NULL,
    `reference_id` INTEGER NOT NULL,
    `reference_detail_id` INTEGER NOT NULL,
    `quantity_in` INTEGER NOT NULL DEFAULT 0,
    `quantity_out` INTEGER NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(15, 2) NOT NULL,
    `movement_datetime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`stock_movement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_sales` (
    `sales_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sales_number` VARCHAR(50) NOT NULL,
    `sales_type` VARCHAR(50) NOT NULL,
    `sales_datetime` DATETIME(3) NOT NULL,
    `customer_id` INTEGER NULL,
    `customer_name_snapshot` VARCHAR(150) NULL,
    `cashier_user_id` INTEGER NOT NULL,
    `cashier_name_snapshot` VARCHAR(150) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `payment_status` VARCHAR(50) NOT NULL,
    `transaction_status` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_sales_sales_number_key`(`sales_number`),
    PRIMARY KEY (`sales_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_sales_detail` (
    `sales_detail_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sales_id` INTEGER NOT NULL,
    `line_number` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_code_snapshot` VARCHAR(50) NOT NULL,
    `product_name_snapshot` VARCHAR(200) NOT NULL,
    `unit_name_snapshot` VARCHAR(100) NOT NULL,
    `price_level_id` INTEGER NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `line_total` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_sales_detail_sales_id_product_id_key`(`sales_id`, `product_id`),
    PRIMARY KEY (`sales_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_sales_payment` (
    `sales_payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sales_id` INTEGER NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `payment_amount` DECIMAL(15, 2) NOT NULL,
    `tendered_amount` DECIMAL(15, 2) NOT NULL,
    `change_amount` DECIMAL(15, 2) NOT NULL,
    `reference_number` VARCHAR(100) NULL,
    `paid_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`sales_payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_sales_return` (
    `sales_return_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sales_return_number` VARCHAR(50) NOT NULL,
    `sales_id` INTEGER NOT NULL,
    `sales_number_snapshot` VARCHAR(50) NOT NULL,
    `return_datetime` DATETIME(3) NOT NULL,
    `customer_id` INTEGER NULL,
    `customer_name_snapshot` VARCHAR(150) NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_by_name_snapshot` VARCHAR(150) NOT NULL,
    `return_reason` TEXT NULL,
    `return_status` VARCHAR(50) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_sales_return_sales_return_number_key`(`sales_return_number`),
    PRIMARY KEY (`sales_return_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_sales_return_detail` (
    `sales_return_detail_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sales_return_id` INTEGER NOT NULL,
    `sales_detail_id` INTEGER NOT NULL,
    `line_number` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_code_snapshot` VARCHAR(50) NOT NULL,
    `product_name_snapshot` VARCHAR(200) NOT NULL,
    `unit_name_snapshot` VARCHAR(100) NOT NULL,
    `sold_quantity_snapshot` INTEGER NOT NULL,
    `previous_return_quantity` INTEGER NOT NULL DEFAULT 0,
    `return_quantity` INTEGER NOT NULL,
    `return_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_sales_return_detail_sales_return_id_sales_detail_id_key`(`sales_return_id`, `sales_detail_id`),
    PRIMARY KEY (`sales_return_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `m_product` ADD CONSTRAINT `m_product_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `m_unit`(`unit_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `m_product` ADD CONSTRAINT `m_product_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `m_brand`(`brand_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `m_product_price` ADD CONSTRAINT `m_product_price_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `m_product`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `m_product_price` ADD CONSTRAINT `m_product_price_price_level_id_fkey` FOREIGN KEY (`price_level_id`) REFERENCES `m_price_level`(`price_level_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `m_user` ADD CONSTRAINT `m_user_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `m_role`(`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `m_menu` ADD CONSTRAINT `m_menu_parent_menu_id_fkey` FOREIGN KEY (`parent_menu_id`) REFERENCES `m_menu`(`menu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `m_role_menu` ADD CONSTRAINT `m_role_menu_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `m_role`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `m_role_menu` ADD CONSTRAINT `m_role_menu_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `m_menu`(`menu_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_purchase` ADD CONSTRAINT `t_purchase_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `m_supplier`(`supplier_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_purchase` ADD CONSTRAINT `t_purchase_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `m_user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_purchase_detail` ADD CONSTRAINT `t_purchase_detail_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `t_purchase`(`purchase_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_purchase_detail` ADD CONSTRAINT `t_purchase_detail_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `m_product`(`product_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `m_product_stock` ADD CONSTRAINT `m_product_stock_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `m_product`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_stock_movement` ADD CONSTRAINT `t_stock_movement_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `m_product`(`product_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_stock_movement` ADD CONSTRAINT `t_stock_movement_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `m_user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales` ADD CONSTRAINT `t_sales_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `m_customer`(`customer_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales` ADD CONSTRAINT `t_sales_cashier_user_id_fkey` FOREIGN KEY (`cashier_user_id`) REFERENCES `m_user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales_detail` ADD CONSTRAINT `t_sales_detail_sales_id_fkey` FOREIGN KEY (`sales_id`) REFERENCES `t_sales`(`sales_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_sales_detail` ADD CONSTRAINT `t_sales_detail_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `m_product`(`product_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales_payment` ADD CONSTRAINT `t_sales_payment_sales_id_fkey` FOREIGN KEY (`sales_id`) REFERENCES `t_sales`(`sales_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_sales_return` ADD CONSTRAINT `t_sales_return_sales_id_fkey` FOREIGN KEY (`sales_id`) REFERENCES `t_sales`(`sales_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales_return` ADD CONSTRAINT `t_sales_return_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `m_user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales_return_detail` ADD CONSTRAINT `t_sales_return_detail_sales_return_id_fkey` FOREIGN KEY (`sales_return_id`) REFERENCES `t_sales_return`(`sales_return_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_sales_return_detail` ADD CONSTRAINT `t_sales_return_detail_sales_detail_id_fkey` FOREIGN KEY (`sales_detail_id`) REFERENCES `t_sales_detail`(`sales_detail_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `t_sales_return_detail` ADD CONSTRAINT `t_sales_return_detail_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `m_product`(`product_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
