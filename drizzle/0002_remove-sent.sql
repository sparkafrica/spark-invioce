-- Custom SQL migration file, put your code below! --
UPDATE invoices SET status = 'draft' WHERE status = 'sent';
ALTER TYPE invoice_status RENAME TO invoice_status_old;
CREATE TYPE invoice_status AS ENUM ('draft', 'paid', 'part_paid', 'overdue', 'voided');
ALTER TABLE invoices ALTER COLUMN status TYPE invoice_status USING status::text::invoice_status;
DROP TYPE invoice_status_old;
