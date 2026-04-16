ALTER TABLE "exercises" ADD COLUMN "embedding_sketch" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "reference_pose" text;--> statement-breakpoint
ALTER TABLE "exercise_protocols" ADD COLUMN "embedding_sketch" text;--> statement-breakpoint
ALTER TABLE "wiki_pages" ADD COLUMN "embedding_sketch" text;