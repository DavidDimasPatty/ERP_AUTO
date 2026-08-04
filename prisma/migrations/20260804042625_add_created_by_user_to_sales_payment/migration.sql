/*
  Warnings:

  - Migration adjusted to preserve `updated_at` and add `created_by_user_id` as NULLABLE to avoid failures on non-empty tables.

*/
-- AlterTable
-- Preserve existing `updated_at` column; add new nullable column first
ALTER TABLE `t_sales_payment`
  ADD COLUMN `created_by_user_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `t_sales_payment` ADD CONSTRAINT `t_sales_payment_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `m_user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
