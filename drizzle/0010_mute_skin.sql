CREATE TABLE `leadops_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('scrape','outreach','full_campaign','optimization','report') NOT NULL,
	`plan` enum('local_lead_flood','b2b_outbound','fully_managed') NOT NULL DEFAULT 'local_lead_flood',
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`config` json,
	`results` json,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadops_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`segment` varchar(255),
	`platform` enum('email','linkedin','sms','multi') NOT NULL DEFAULT 'email',
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`templateSteps` json,
	`stats` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outreach_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scraped_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`phone` varchar(64),
	`website` varchar(1024),
	`address` varchar(512),
	`city` varchar(128),
	`category` varchar(128),
	`source` varchar(64) DEFAULT 'google_maps',
	`score` enum('A','B','C','unscored') DEFAULT 'unscored',
	`extraMeta` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scraped_leads_id` PRIMARY KEY(`id`)
);
