CREATE TABLE `digest_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`showAudits` int NOT NULL DEFAULT 1,
	`showCampaigns` int NOT NULL DEFAULT 1,
	`showSuburbPages` int NOT NULL DEFAULT 1,
	`showScores` int NOT NULL DEFAULT 1,
	`showHighlights` int NOT NULL DEFAULT 1,
	`showAgencyBreakdown` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digest_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `digest_preferences_userId_unique` UNIQUE(`userId`)
);
