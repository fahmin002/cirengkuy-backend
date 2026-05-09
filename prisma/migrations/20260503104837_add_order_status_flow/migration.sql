-- AlterTable
ALTER TABLE `order` MODIFY `status` ENUM('pending', 'paid', 'cooking', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending';
