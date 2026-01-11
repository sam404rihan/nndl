-- Add report_no and bill_no columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS report_no VARCHAR(12) UNIQUE,
ADD COLUMN IF NOT EXISTS bill_no VARCHAR(12) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_report_no ON orders(report_no);
CREATE INDEX IF NOT EXISTS idx_orders_bill_no ON orders(bill_no);

-- Create number_sequences table to track sequences per financial year
CREATE TABLE IF NOT EXISTS number_sequences (
  id SERIAL PRIMARY KEY,
  sequence_type VARCHAR(20) NOT NULL, -- 'report' or 'bill'
  financial_year VARCHAR(10) NOT NULL, -- e.g., 'FY26', 'FY27'
  current_letter VARCHAR(2) DEFAULT 'A', -- A-Z, then AA-ZZ
  current_number INTEGER DEFAULT 0, -- 0-999
  last_generated VARCHAR(12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_type, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_number_sequences_type_fy ON number_sequences(sequence_type, financial_year);

-- Function to increment letter (A→B→Z→AA→AB→AZ→BA→ZZ)
CREATE OR REPLACE FUNCTION increment_letter(current_letter VARCHAR(2))
RETURNS VARCHAR(2) AS $$
BEGIN
  -- Single letter: A-Z
  IF LENGTH(current_letter) = 1 THEN
    IF current_letter = 'Z' THEN
      RETURN 'AA';
    ELSE
      RETURN CHR(ASCII(current_letter) + 1);
    END IF;
  -- Double letter: AA-ZZ
  ELSE
    -- Second letter A-Y, increment it
    IF SUBSTRING(current_letter, 2, 1) < 'Z' THEN
      RETURN SUBSTRING(current_letter, 1, 1) || CHR(ASCII(SUBSTRING(current_letter, 2, 1)) + 1);
    -- Second letter is Z, increment first letter
    ELSIF SUBSTRING(current_letter, 1, 1) < 'Z' THEN
      RETURN CHR(ASCII(SUBSTRING(current_letter, 1, 1)) + 1) || 'A';
    -- ZZ reached, wrap to A (or throw error)
    ELSE
      RETURN 'A'; -- Reset after ZZ
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate report number (RT26A001 format)
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS VARCHAR(12) AS $$
DECLARE
  fy VARCHAR(10);
  current_date DATE := CURRENT_DATE;
  year_suffix VARCHAR(2);
  current_letter VARCHAR(2);
  current_number INTEGER;
  new_report_no VARCHAR(12);
BEGIN
  -- Determine financial year (April to March)
  IF EXTRACT(MONTH FROM current_date) >= 4 THEN
    year_suffix := RIGHT(EXTRACT(YEAR FROM current_date)::TEXT, 2);
  ELSE
    year_suffix := RIGHT((EXTRACT(YEAR FROM current_date) - 1)::TEXT, 2);
  END IF;
  
  fy := 'FY' || year_suffix;

  -- Insert or update sequence for report
  INSERT INTO number_sequences (sequence_type, financial_year, current_letter, current_number)
  VALUES ('report', fy, 'A', 1)
  ON CONFLICT (sequence_type, financial_year) 
  DO UPDATE SET 
    current_number = CASE 
      WHEN number_sequences.current_number >= 999 THEN 1
      ELSE number_sequences.current_number + 1
    END,
    current_letter = CASE
      WHEN number_sequences.current_number >= 999 THEN increment_letter(number_sequences.current_letter)
      ELSE number_sequences.current_letter
    END,
    updated_at = NOW()
  RETURNING number_sequences.current_letter, number_sequences.current_number INTO current_letter, current_number;

  -- Generate report number: RT + YY + LETTER + XXX (e.g., RT26A001)
  new_report_no := 'RT' || year_suffix || current_letter || LPAD(current_number::TEXT, 3, '0');

  -- Update last_generated
  UPDATE number_sequences 
  SET last_generated = new_report_no 
  WHERE sequence_type = 'report' AND financial_year = fy;

  RETURN new_report_no;
END;
$$ LANGUAGE plpgsql;

-- Function to generate bill number (BN26A001 format)
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS VARCHAR(12) AS $$
DECLARE
  fy VARCHAR(10);
  current_date DATE := CURRENT_DATE;
  year_suffix VARCHAR(2);
  current_letter VARCHAR(2);
  current_number INTEGER;
  new_bill_no VARCHAR(12);
BEGIN
  -- Determine financial year (April to March)
  IF EXTRACT(MONTH FROM current_date) >= 4 THEN
    year_suffix := RIGHT(EXTRACT(YEAR FROM current_date)::TEXT, 2);
  ELSE
    year_suffix := RIGHT((EXTRACT(YEAR FROM current_date) - 1)::TEXT, 2);
  END IF;
  
  fy := 'FY' || year_suffix;

  -- Insert or update sequence for bill
  INSERT INTO number_sequences (sequence_type, financial_year, current_letter, current_number)
  VALUES ('bill', fy, 'A', 1)
  ON CONFLICT (sequence_type, financial_year) 
  DO UPDATE SET 
    current_number = CASE 
      WHEN number_sequences.current_number >= 999 THEN 1
      ELSE number_sequences.current_number + 1
    END,
    current_letter = CASE
      WHEN number_sequences.current_number >= 999 THEN increment_letter(number_sequences.current_letter)
      ELSE number_sequences.current_letter
    END,
    updated_at = NOW()
  RETURNING number_sequences.current_letter, number_sequences.current_number INTO current_letter, current_number;

  -- Generate bill number: BN + YY + LETTER + XXX (e.g., BN26A001)
  new_bill_no := 'BN' || year_suffix || current_letter || LPAD(current_number::TEXT, 3, '0');

  -- Update last_generated
  UPDATE number_sequences 
  SET last_generated = new_bill_no 
  WHERE sequence_type = 'bill' AND financial_year = fy;

  RETURN new_bill_no;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-assign report_no and bill_no
CREATE OR REPLACE FUNCTION set_order_numbers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_no IS NULL THEN
    NEW.report_no := generate_report_number();
  END IF;
  
  IF NEW.bill_no IS NULL THEN
    NEW.bill_no := generate_bill_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_set_order_numbers ON orders;
CREATE TRIGGER trigger_set_order_numbers
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION set_order_numbers();

-- Add comments for documentation
COMMENT ON COLUMN orders.report_no IS 'Auto-generated report number in format RT{YY}{LETTER}{XXX}, resets every financial year (April 1st)';
COMMENT ON COLUMN orders.bill_no IS 'Auto-generated bill number in format BN{YY}{LETTER}{XXX}, resets every financial year (April 1st)';
COMMENT ON TABLE number_sequences IS 'Tracks sequential numbering for reports and bills per financial year';

-- Backfill existing orders with sequential numbers based on creation date
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM orders WHERE report_no IS NULL OR bill_no IS NULL ORDER BY created_at
  LOOP
    UPDATE orders 
    SET 
      report_no = COALESCE(report_no, generate_report_number()),
      bill_no = COALESCE(bill_no, generate_bill_number())
    WHERE id = r.id;
  END LOOP;
END $$;
