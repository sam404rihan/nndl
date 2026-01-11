-- Add patient_no column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_no VARCHAR(12) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_patients_patient_no ON patients(patient_no);

-- Function to generate patient number (PT26A001 format)
CREATE OR REPLACE FUNCTION generate_patient_number()
RETURNS VARCHAR(12) AS $$
DECLARE
  current_fy VARCHAR(2);
  current_month INT;
  current_year INT;
  seq_record RECORD;
  new_letter VARCHAR(2);
  new_number INT;
  patient_number VARCHAR(12);
BEGIN
  -- Get current month and year
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Determine financial year (April to March)
  -- If month is Jan-Mar, use previous year
  IF current_month < 4 THEN
    current_fy := RIGHT((current_year - 1)::TEXT, 2);
  ELSE
    current_fy := RIGHT(current_year::TEXT, 2);
  END IF;
  
  -- Get or create sequence record for this financial year
  SELECT * INTO seq_record 
  FROM number_sequences 
  WHERE sequence_type = 'patient' 
    AND financial_year = current_fy
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new sequence for this financial year
    INSERT INTO number_sequences (sequence_type, financial_year, current_letter, current_number)
    VALUES ('patient', current_fy, 'A', 1)
    RETURNING * INTO seq_record;
  END IF;
  
  new_letter := seq_record.current_letter;
  new_number := seq_record.current_number;
  
  -- Check if we need to increment the letter
  IF new_number > 999 THEN
    new_letter := increment_letter(new_letter);
    new_number := 1;
  END IF;
  
  -- Format: PT{YY}{LETTER}{XXX}
  patient_number := 'PT' || current_fy || new_letter || LPAD(new_number::TEXT, 3, '0');
  
  -- Update sequence
  UPDATE number_sequences
  SET current_letter = new_letter,
      current_number = new_number + 1,
      last_generated = patient_number
  WHERE sequence_type = 'patient' 
    AND financial_year = current_fy;
  
  RETURN patient_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to set patient number on insert
CREATE OR REPLACE FUNCTION set_patient_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_no IS NULL THEN
    NEW.patient_no := generate_patient_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_patient_number ON patients;
CREATE TRIGGER trigger_set_patient_number
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION set_patient_number();

-- Backfill existing patients with patient numbers
DO $$
DECLARE
  patient_record RECORD;
  new_patient_no VARCHAR(12);
BEGIN
  FOR patient_record IN 
    SELECT id FROM patients WHERE patient_no IS NULL ORDER BY created_at
  LOOP
    new_patient_no := generate_patient_number();
    UPDATE patients SET patient_no = new_patient_no WHERE id = patient_record.id;
  END LOOP;
END $$;
