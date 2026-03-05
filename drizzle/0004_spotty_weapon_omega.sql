CREATE TABLE `appraisal_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`suburb` varchar(128) NOT NULL,
	`propertyType` varchar(64) NOT NULL,
	`ownerName` varchar(255),
	`propertyAddress` varchar(512),
	`keyFeatures` text,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appraisal_letters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`websiteUrl` varchar(512),
	`agencyName` varchar(255),
	`source` varchar(64) NOT NULL DEFAULT 'landing_page',
	`teaserAuditResult` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_descriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`propertyAddress` varchar(512) NOT NULL,
	`suburb` varchar(128) NOT NULL,
	`propertyType` varchar(64) NOT NULL,
	`bedrooms` int,
	`bathrooms` int,
	`keyFeatures` text,
	`targetBuyer` varchar(128),
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_descriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredUserId` int,
	`referralCode` varchar(16) NOT NULL,
	`status` enum('pending','signed_up','subscribed','rewarded') NOT NULL DEFAULT 'pending',
	`rewardPaid` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` varchar(512) NOT NULL,
	`events` json NOT NULL,
	`secret` varchar(64),
	`active` int NOT NULL DEFAULT 1,
	`lastFiredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `referredByCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralCode_unique` UNIQUE(`referralCode`);