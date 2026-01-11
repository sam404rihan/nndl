-- Verify patient numbers were created
SELECT id, patient_no, created_at 
FROM patients 
ORDER BY created_at 
LIMIT 10;

-- Check number_sequences table for patient sequence
SELECT * FROM number_sequences WHERE sequence_type = 'patient';
