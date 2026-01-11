-- Enable the pg_net extension if we ever need to send webhooks, but mostly we just need PL/pgSQL
-- Function to automatically log changes to audit_logs
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  action_type TEXT;
  record_identifier TEXT;
  meta_payload JSONB;
BEGIN
  -- Attempt to get the current authenticated user ID
  -- If triggered by system/service_role without auth.uid(), it might be null
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  -- Determine Action
  IF (TG_OP = 'INSERT') THEN
    action_type := 'CREATE';
    record_identifier := NEW.id::TEXT;
    meta_payload := jsonb_build_object('new', row_to_json(NEW));
  ELSIF (TG_OP = 'UPDATE') THEN
    action_type := 'UPDATE';
    record_identifier := NEW.id::TEXT;
    meta_payload := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
  ELSIF (TG_OP = 'DELETE') THEN
    action_type := 'DELETE';
    record_identifier := OLD.id::TEXT;
    meta_payload := jsonb_build_object('old', row_to_json(OLD));
  END IF;

  -- Insert into audit_logs
  -- We use security definer privilege in this function to ensure we can write to audit_logs
  -- regardless of current user permissions (though RLS usually allows insert)
  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    metadata,
    timestamp
  ) VALUES (
    action_type,
    TG_TABLE_NAME,
    record_identifier,
    current_user_id, -- Can be null if system action
    meta_payload,
    now()
  );

  RETURN NULL; -- Trigger is AFTER, so return value doesn't matter
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Triggers to Critical Tables

-- 1. Patients
DROP TRIGGER IF EXISTS audit_patients_trigger ON patients;
CREATE TRIGGER audit_patients_trigger
AFTER INSERT OR UPDATE OR DELETE ON patients
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 2. Orders
DROP TRIGGER IF EXISTS audit_orders_trigger ON orders;
CREATE TRIGGER audit_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 3. Test Results (CRITICAL)
DROP TRIGGER IF EXISTS audit_results_trigger ON test_results;
CREATE TRIGGER audit_results_trigger
AFTER INSERT OR UPDATE OR DELETE ON test_results
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 4. Tests (Catalog Changes)
DROP TRIGGER IF EXISTS audit_tests_trigger ON tests;
CREATE TRIGGER audit_tests_trigger
AFTER INSERT OR UPDATE OR DELETE ON tests
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 5. Lab Settings (Configuration Changes)
DROP TRIGGER IF EXISTS audit_settings_trigger ON lab_settings;
CREATE TRIGGER audit_settings_trigger
AFTER INSERT OR UPDATE OR DELETE ON lab_settings
FOR EACH ROW EXECUTE FUNCTION log_audit_event();
