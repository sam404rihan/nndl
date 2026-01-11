# Setup Guide - NNDL Lab Management System

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Supabase account (free tier works for development)
- Git for version control

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Enter project details:
   - Name: "nndl-lab-system"
   - Database Password (save this securely)
   - Region: Choose closest to your users
4. Click "Create new project"
5. Wait for project to be provisioned (~2 minutes)

### 1.2 Get Project Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for client-side)
   - **service_role key** (for server-side admin operations)

**⚠️ IMPORTANT**: Never commit the service_role key to version control!

## Step 2: Local Project Setup

### 2.1 Install Dependencies
```bash
cd nndl-lab-system
npm install
```

### 2.2 Configure Environment Variables

Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Encryption (for PHI fields)
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXT_PUBLIC_ENCRYPTION_KEY=your_64_character_hex_key_here
```

### 2.3 Generate Encryption Key

Generate a secure encryption key for PHI encryption:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output to `NEXT_PUBLIC_ENCRYPTION_KEY` in `.env.local`

## Step 3: Database Setup

### 3.1 Apply Database Schema

Run the following SQL scripts in Supabase SQL Editor (in order):

1. **Create Tables** (if not using Supabase's auto-generated schema)
2. **Apply RLS Policies**: `supabase/migrations/secure_role_based_rls_v3_clean_slate.sql`
3. **Setup Audit Triggers**: `supabase/migrations/audit_triggers.sql`

### 3.2 Create Initial Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. After user is created, go to SQL Editor and run:

```sql
-- Insert admin profile
INSERT INTO profiles (id, email, role)
VALUES (
  'paste-user-id-here',  -- Get from Authentication → Users
  'admin@example.com',
  'admin'
);
```

### 3.3 Seed Test Data (Optional)

You can add sample tests to the catalog:

```sql
INSERT INTO tests (name, code, price, turnaround_time)
VALUES 
  ('Complete Blood Count', 'CBC', 500, 24),
  ('Lipid Profile', 'LIPID', 800, 24),
  ('Thyroid Function Test', 'TFT', 600, 48),
  ('Blood Glucose', 'GLU', 200, 12);
```

## Step 4: Run the Application

### 4.1 Development Mode
```bash
npm run dev
```
Access at: `http://localhost:3000`

### 4.2 Production Build
```bash
npm run build
npm start
```

## Step 5: Verify Setup

### 5.1 Test Login
1. Navigate to `/login`
2. Login with admin credentials
3. Verify dashboard loads

### 5.2 Test Role-Based Access
1. Try accessing `/dashboard/admin` as admin (should work)
2. Create a technician user and test access restrictions

### 5.3 Test Audit Logging
1. Create/Update a patient record
2. Check `audit_logs` table in Supabase for entry
3. Verify trigger-based logging is working

## Troubleshooting

### Issue: "Row Level Security" errors
**Solution**: Ensure all RLS policies are applied correctly via SQL Editor

### Issue: Encryption errors
**Solution**: Verify `NEXT_PUBLIC_ENCRYPTION_KEY` is exactly 64 hex characters

### Issue: Authentication fails
**Solution**: Check Supabase project URL and anon key are correct

### Issue: Admin routes not accessible
**Solution**: Verify user's role in `profiles` table is set to 'admin'

## HIPAA Compliance Checklist

For HIPAA compliance when deploying to production:

- [ ] Sign Business Associate Agreement (BAA) with Supabase
- [ ] Enable encryption at rest (enabled by default in Supabase)
- [ ] Configure audit logging (via database triggers)
- [ ] Implement session timeout (already in middleware)
- [ ] Use HTTPS in production (required)
- [ ] Regular security audits
- [ ] Staff HIPAA training
- [ ] Incident response plan
- [ ] Regular backups (Supabase handles this)

## Next Steps

- Configure lab settings via `/dashboard/admin/settings`
- Add staff users via `/dashboard/admin/users`
- Set up test catalog via `/dashboard/tests`
- Train staff on system usage
- Review audit logs regularly via `/dashboard/admin/audit`

---

For additional help, refer to:
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- [SCHEMA_CHANGES.md](./SCHEMA_CHANGES.md)
- [Supabase Documentation](https://supabase.com/docs)

1. **Never commit `.env.local` or service account keys**
2. **Rotate encryption keys periodically**
3. **Enable 2FA for all admin accounts**
4. **Regular security audits**
5. **Monitor Firebase usage and quotas**
6. **Backup Firestore data regularly**
7. **Review audit logs monthly**

## Support

- Firebase Support: https://firebase.google.com/support
- Vercel Support: https://vercel.com/support
- HIPAA Compliance: https://www.hhs.gov/hipaa

## Next Steps

After setup is complete, proceed to:
1. Configure test catalog
2. Set up user accounts
3. Train staff on system usage
4. Conduct security audit
5. Go live!
