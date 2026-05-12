/*
  Warnings:

  - The values [expired] on the enum `Order_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Order` MODIFY `status` ENUM('pending', 'paid', 'cooking', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending';
