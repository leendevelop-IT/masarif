CREATE TABLE `transaction_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int NOT NULL,
	`action` enum('created','updated','archived','restored') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transaction_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `depositPrefix` varchar(16) DEFAULT 'INC-' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `expensePrefix` varchar(16) DEFAULT 'EXP-' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `depositStart` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `expenseStart` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `audit_user_date_idx` ON `transaction_audit_logs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_transaction_idx` ON `transaction_audit_logs` (`transactionId`);