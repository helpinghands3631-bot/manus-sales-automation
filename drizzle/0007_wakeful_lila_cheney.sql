CREATE TABLE `crmContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`company` varchar(255),
	`suburb` varchar(128),
	`state` varchar(64),
	`source` varchar(64) DEFAULT 'manual',
	`status` enum('new','contacted','qualified','proposal','won','lost') NOT NULL DEFAULT 'new',
	`websiteUrl` varchar(512),
	`auditScore` int,
	`notes` text,
	`lastContactedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crmContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailThreads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int,
	`contactEmail` varchar(320) NOT NULL,
	`contactName` varchar(255),
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`direction` enum('outbound','inbound') NOT NULL DEFAULT 'outbound',
	`status` enum('queued','sent','delivered','replied','bounced','failed') NOT NULL DEFAULT 'queued',
	`offerType` varchar(64),
	`sentAt` timestamp,
	`repliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailThreads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenueRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('stripe','paypal','apple_pay','manual','refund') NOT NULL DEFAULT 'stripe',
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'AUD',
	`description` varchar(512),
	`planName` varchar(64),
	`customerEmail` varchar(320),
	`customerName` varchar(255),
	`stripePaymentId` varchar(255),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenueRecords_id` PRIMARY KEY(`id`)
);
