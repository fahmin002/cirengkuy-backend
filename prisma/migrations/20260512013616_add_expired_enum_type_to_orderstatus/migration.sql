-- AlterTable
ALTER TABLE `Order` MODIFY `status` ENUM('pending', 'paid', 'cooking', 'ready', 'completed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending';
