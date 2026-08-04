/*
  Warnings:

  - You are about to drop the column `updated_at` on the `t_sales_payment` table. All the data in the column will be lost.
  - Made the column `created_by_user_id` on table `t_sales_payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `t_sales_payment` DROP FOREIGN KEY `t_sales_payment_created_by_user_id_fkey`;

-- AlterTable
ALTER TABLE `t_sales_payment` DROP COLUMN `updated_at`,
    MODIFY `created_by_user_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `t_sales_payment` ADD CONSTRAINT `t_sales_payment_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `m_user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
