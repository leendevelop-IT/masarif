CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`type` enum('deposit','expense') NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#0F9D82',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_user_name_type_unique` UNIQUE(`userId`,`name`,`type`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`reminderDate` varchar(16) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int NOT NULL,
	`recordNumber` varchar(64) NOT NULL,
	`type` enum('deposit','expense') NOT NULL,
	`transactionDate` varchar(10) NOT NULL,
	`customerName` varchar(160),
	`amountBeforeTax` double NOT NULL,
	`taxRate` double NOT NULL DEFAULT 0,
	`taxAmount` double NOT NULL DEFAULT 0,
	`totalAmount` double NOT NULL,
	`attachmentName` varchar(255),
	`attachmentMime` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`language` enum('ar','en') NOT NULL DEFAULT 'ar',
	`theme` enum('light','dark') NOT NULL DEFAULT 'light',
	`taxEnabled` boolean NOT NULL DEFAULT true,
	`taxRate` double NOT NULL DEFAULT 15,
	`numberingMode` enum('auto','manual') NOT NULL DEFAULT 'auto',
	`pinEnabled` boolean NOT NULL DEFAULT false,
	`pinHash` varchar(128),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `category_user_type_idx` ON `categories` (`userId`,`type`);--> statement-breakpoint
CREATE INDEX `reminder_user_date_idx` ON `reminders` (`userId`,`reminderDate`);--> statement-breakpoint
CREATE INDEX `transaction_user_date_idx` ON `transactions` (`userId`,`transactionDate`);--> statement-breakpoint
CREATE INDEX `transaction_user_type_idx` ON `transactions` (`userId`,`type`);