# Database Schema Changes Log

This document tracks all schema changes made to the database for compliance, auditing, and maintenance purposes.

---

## 2025-12-21 - Security: Automatic Audit Triggers

**Migration File**: `audit_triggers.sql`
**Status**: ⏳ Pending (Manual Application Required)
**Author**: Antigravity
**Purpose**: Implement unbypassable, database-level audit logging for all critical tables to meet strict compliance standards.

### Changes Made

#### Triggers
- Created generic `log_audit_event()` function.
- Applied `AFTER INSERT OR UPDATE OR DELETE` triggers to:
  - `patients`
  - `orders`
  - `test_results`
  - `tests`
  - `lab_settings`

### Impact
- **Security**: Actions are logged even if performed independently of the web application.
- **Compliance**: "Insert-Only" audit trail for Technicians.

### Rollback
```sql
DROP TRIGGER IF EXISTS audit_patients_trigger ON patients;
DROP TRIGGER IF EXISTS audit_orders_trigger ON orders;
DROP TRIGGER IF EXISTS audit_results_trigger ON test_results;
DROP TRIGGER IF EXISTS audit_tests_trigger ON tests;
DROP TRIGGER IF EXISTS audit_settings_trigger ON lab_settings;
DROP FUNCTION IF EXISTS log_audit_event;
```

---

## 2025-12-21 - Security: RLS Hardening (V3 Clean Slate)

**Migration File**: `secure_role_based_rls_v3_clean_slate.sql`
**Status**: ⏳ Pending (Manual Application Required)
**Author**: Antigravity
**Purpose**: Replace all existing, potentially conflicting RLS policies with a unified, clean-slate security model.

### Changes Made
- **Reset**: Dropped ALL existing policies on `patients`, `tests`, `orders`, `profiles`, `audit_logs`, `lab_settings`.
- **Policy Strategy**:
  - **Admins**: `ALL` access to most tables.
  - **Technicians**: `SELECT` on Catalog, `INSERT/SELECT` on Orders, `Insert-Own` on Audit Logs.
  - **Public**: Deny All (except specific auth/profile flows).

### Impact
- **Fix**: Resolves "Infinite Recursion" errors from previous circular policies.
- **Security**: Ensures no "hidden doors" from old patch files.

### Rollback
(Requires restoring V2 or previous state via backup, as this was a destructive reset).

## 2025-12-21 - Fix: Order Schema Consolidation

**Migration File**: `MANUAL_FIX_order_schema.sql`
**Status**: ⏳ Pending (Manual Application Required)
**Author**: Antigravity
**Purpose**: Consolidated migration to fix order creation errors by renaming `order_items` to `order_tests` and updating all related references. This migration combines multiple pending migrations into a single executable file.

### Changes Made

#### Table Renames
- Renamed `order_items` table to `order_tests`
- Renamed all related indexes

#### Column Renames
- Renamed `test_results.order_item_id` to `test_results.order_test_id`

#### Constraints Updated
- Updated foreign key: `test_results_order_test_id_fkey` references `order_tests(id)` with CASCADE delete
- Updated unique constraint: `test_results_order_test_id_key`

#### Triggers
- Created `generate_result_shell_for_test()` function
- Created trigger `trigger_generate_result_shell` on `order_tests` INSERT
- Automatically creates `test_results` shells when order tests are added

#### RLS Policies
- Updated all policies to reference `order_tests` instead of `order_items`
- Policies: SELECT, INSERT, UPDATE, DELETE for authenticated users

#### Data Migration
- Backfilled missing `test_results` for existing `order_tests`

### Impact

**Before**: 
- Order creation failed with error: `column "order_item_id" of relation "test_results" does not exist`
- Inconsistent table/column names between code and database

**After**:
- ✅ Order creation works correctly
- ✅ Automatic result shell generation on order test insertion
- ✅ Consistent naming: `order_tests` and `order_test_id` throughout
- ✅ Proper CASCADE delete behavior

### Application Instructions

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `MANUAL_FIX_order_schema.sql`
3. Paste and execute in SQL Editor
4. Verify by creating a test order

### Rollback

```sql
-- Rename back to old names
ALTER TABLE order_tests RENAME TO order_items;
ALTER TABLE test_results RENAME COLUMN order_test_id TO order_item_id;
-- Update constraints and triggers accordingly
```

---

## 2025-12-20 - Fix: Instant Result Shells

**Migration File**: `fix_result_shell_trigger.sql`
**Status**: ⏳ Pending (Manual Push Required)
**Author**: Antigravity
**Purpose**: Fix "No pending results" issue. Moves shell creation logic to `order_items` INSERT so results can be entered immediately without status workflow steps. Includes backfill.

### Changes Made
- Dropped trigger on `orders` (update).
- Added trigger on `order_items` (insert).
- Backfilled missing `test_results` for existing orders.

---

## 2025-12-20 - Fix: Tests Visibility

**Migration File**: `fix_tests_rls.sql`
**Status**: ⏳ Pending (Manual Push Required)
**Author**: Antigravity
**Purpose**: Fix missing Test Names in UI by ensuring `tests` and `order_items` tables have correct RLS Select policies.

### Changes Made
- Added `SELECT` policy for `tests` table (Authenticated users).
- Added `SELECT` policy for `order_items` table (Authenticated users).

---

## 2025-12-20 - Fix: Add Gender Column

**Migration File**: `add_gender_to_patients.sql`
**Status**: ⏳ Pending (Manual Push Required)
**Author**: Antigravity
**Purpose**: Add missing `gender` column to `patients` table and restore it in the views.

### Changes Made
- Added `gender` column to `patients` table.
- Updated `pending_results_view` to include `gender`.

---

## 2025-12-20 - Separate Orders & Results Architecture

**Migration File**: `separate_orders_results.sql`  
**Status**: ⏳ Pending (Manual Push Required)  
**Author**: Antigravity  
**Purpose**: Enforce strict separation between Orders (Intent) and Lab Results (Outcome) to align with clinical mental models and improve data security.

### Changes Made

#### Table: `test_results` (New)

**Columns Added**:
- `id` (UUID) - Primary Key
- `order_item_id` (UUID) - Link to the generic Request item
- `test_id` (UUID) - Link to the Test definition
- `result_value` (TEXT) - The clinical finding
- `unit` (TEXT) - Measurement unit
- `reference_range` (TEXT) - Normal limits
- `flag` (VARCHAR) - Abnormal flag (H, L, N)
- `status` (VARCHAR) - pending, draft, validated, completed
- `entered_by` / `validated_by` / `finalized_by` (UUIDs) - Granular attribution

**Indexes**:
- `UNIQUE(order_item_id)` - Ensures 1:1 relationship between a request item and its result.

#### Trigger: `create_result_shells`

**Purpose**: Automatically creates empty records in `test_results` when an Order status moves to `in_process`. This implements the "Shell" pattern where technicians fill in blanks rather than creating records.

#### View: `pending_results_view`

**Purpose**: A secure, flattened view for Lab Technicians to see their worklist. joins `test_results` (shells) with `patients` and `tests` data. Replaces direct access to `order_items`.
> **Note**: Excluded `gender` column from `patients` join as it is not present in the current schema.

### Impact

**Before**: 
- Results were written to `order_items`.
- "Enter Results" button existed on Orders page (Logistics).
- No clear distinction between a request and a clinical finding.

**After**:
- ✅ **Strict Separation**: Orders = Logistics, Results = Clinical Data.
- ✅ **Result Shells**: Work is "assigned" by the system via triggers.
- ✅ **Improved Audit**: Result changes are tracked independently of the Order.
- ✅ **Better RBAC**: `test_results` can be locked down to Lab Staff only.

### Rollback

```sql
DROP TRIGGER IF EXISTS trigger_create_result_shells ON orders;
DROP FUNCTION IF EXISTS create_result_shells;
DROP VIEW IF EXISTS pending_results_view;
DROP TABLE IF EXISTS test_results;
```

---

## 2025-12-19 - HIPAA-Compliant Audit Logs Enhancement

**Migration File**: `add_audit_logs_metadata_v2.sql`  
**Status**: ✅ Applied  
**Author**: System  
**Purpose**: Add comprehensive HIPAA-compliant audit logging capabilities

### Changes Made

#### Table: `audit_logs`

**New Columns Added**:
- `user_email` (VARCHAR(255)) - Denormalized user email for reporting
- `user_role` (VARCHAR(50)) - User role at time of action
- `ip_address` (INET) - IP address of the user
- `user_agent` (TEXT) - Browser/client information
- `session_id` (VARCHAR(255)) - Session identifier
- `metadata` (JSONB) - Flexible context data (patient_id, test_count, etc.)
- `old_values` (JSONB) - Previous values for UPDATE actions
- `new_values` (JSONB) - New values for UPDATE actions
- `status` (VARCHAR(20)) - Action status (success/failed/denied)
- `error_message` (TEXT) - Error details if action failed
- `retention_date` (DATE) - Auto-set to 6 years (HIPAA requirement)
- `is_phi_related` (BOOLEAN) - PHI classification flag
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `hash` (VARCHAR(64)) - Optional tamper detection hash

**Indexes Created**:
- `idx_audit_logs_performed_by` - User-based queries
- `idx_audit_logs_timestamp` - Date range queries
- `idx_audit_logs_action` - Action type filtering
- `idx_audit_logs_table_record` - Record history lookups
- `idx_audit_logs_user_timestamp` - Composite user + date queries
- `idx_audit_logs_phi_related` - PHI-specific reporting
- `idx_audit_logs_metadata` - GIN index for JSONB queries

**RLS Policies**:
- `Allow authenticated users to insert audit logs` - All authenticated users can log
- `Only admins can read audit logs` - Only admin role can view logs
- **No UPDATE/DELETE policies** - Ensures immutability

**Triggers**:
- `trigger_set_audit_log_retention` - Auto-sets retention_date to 6 years
- `trigger_populate_audit_user_info` - Auto-populates user_email and user_role from profiles

### HIPAA Compliance

This change addresses:
- **§ 164.312(b)** - Audit Controls for ePHI systems
- **§ 164.308(a)(1)(ii)(D)** - Information System Activity Review
- **§ 164.308(a)(5)(ii)(C)** - Log-in Monitoring
- **§ 164.316(b)(2)(i)** - 6-year retention requirement
- **§ 164.312(c)(2)** - Integrity controls (immutable logs)

### Impact

**Before**: 
- Audit logs were failing silently due to missing `metadata` column
- Limited tracking capabilities
- No automatic retention management

**After**:
- ✅ All audit logging now works (login, logout, patient ops, orders, user management)
- ✅ Comprehensive tracking with context data
- ✅ Automatic 6-year retention
- ✅ Immutable logs via RLS
- ✅ Performance optimized with proper indexes

### Rollback

To rollback this migration (not recommended for production):
```sql
-- Remove added columns
ALTER TABLE audit_logs 
  DROP COLUMN IF EXISTS user_email,
  DROP COLUMN IF EXISTS user_role,
  DROP COLUMN IF EXISTS ip_address,
  DROP COLUMN IF EXISTS user_agent,
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS old_values,
  DROP COLUMN IF EXISTS new_values,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS error_message,
  DROP COLUMN IF EXISTS retention_date,
  DROP COLUMN IF EXISTS is_phi_related,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS hash;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_set_audit_log_retention ON audit_logs;
DROP TRIGGER IF EXISTS trigger_populate_audit_user_info ON audit_logs;
```

---

## Template for Future Changes

```markdown
## YYYY-MM-DD - [Brief Description]

**Migration File**: `filename.sql`  
**Status**: ⏳ Pending / ✅ Applied / ❌ Rolled Back  
**Author**: [Name]  
**Purpose**: [Why this change was needed]

### Changes Made

#### Table: `table_name`

**Columns Added/Modified/Removed**:
- `column_name` (TYPE) - Description

**Indexes**:
- `index_name` - Purpose

**Constraints**:
- Description

### Impact

**Before**: [State before change]  
**After**: [State after change]

### Rollback

```sql
-- Rollback SQL
```
```

---

## Notes

- Always test migrations in development before applying to production
- Document the business reason for each schema change
- Include rollback procedures for all migrations
- Keep this log updated with every schema change
