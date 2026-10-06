CREATE TABLE `food_log` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`name` text NOT NULL,
	`calories` integer NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`loggedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_food` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`calories` integer NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`lastUsedAt` text NOT NULL,
	`useCount` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `smoking_log` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`loggedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `water_log` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`ml` integer NOT NULL,
	`loggedAt` text NOT NULL
);
