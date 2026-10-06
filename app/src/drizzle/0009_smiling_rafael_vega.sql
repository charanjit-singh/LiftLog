CREATE TABLE `gym_membership` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`startDate` text NOT NULL,
	`endDate` text,
	`notes` text DEFAULT '' NOT NULL
);
