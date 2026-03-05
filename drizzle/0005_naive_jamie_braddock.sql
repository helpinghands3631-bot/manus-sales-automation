CREATE TABLE `email_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(512) NOT NULL,
	`bodyHtml` text NOT NULL,
	`bodyText` text,
	`emailType` varchar(64) NOT NULL DEFAULT 'offer',
	`drip` int NOT NULL DEFAULT 0,
	`status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`leadId` int,
	`scheduledAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_queue_id` PRIMARY KEY(`id`)
);
