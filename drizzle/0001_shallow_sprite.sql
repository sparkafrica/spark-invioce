ALTER TABLE "invoices" ADD COLUMN "pay_link_currency" "currency";--> statement-breakpoint
CREATE INDEX "activity_log_user_created_idx" ON "activity_log" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "logo";