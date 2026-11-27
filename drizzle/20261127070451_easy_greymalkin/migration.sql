DROP INDEX "verification_identifier_idx";--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");