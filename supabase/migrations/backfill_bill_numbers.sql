-- Backfill existing orders with bill numbers
-- Run this once to populate bill_no for existing orders

-- First, create a temporary function for backfilling
CREATE OR REPLACE FUNCTION backfill_generate_bill_number()
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

-- Backfill existing orders
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM orders WHERE bill_no IS NULL ORDER BY created_at
  LOOP
    UPDATE orders 
    SET bill_no = backfill_generate_bill_number()
    WHERE id = r.id;
  END LOOP;
END $$;

-- Clean up temporary function
DROP FUNCTION IF EXISTS backfill_generate_bill_number();
