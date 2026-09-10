-- Custom SQL migration file, put your code below! --
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'due' AND enumtypid = 'invoice_status'::regtype) THEN
    ALTER TYPE invoice_status ADD VALUE 'due' BEFORE 'overdue';
  END IF;
END $$;
