# NNDL Lab Management System (Secure Architecture)

> **Abstract**: This project is a specialized Laboratory Information Management System (LIMS) designed with a "Security-First" architecture to meet HIPAA compliance standards. Unlike traditional web apps, it enforces data security at the database level using strict Row Level Security (RLS) policies, ensuring that unauthorized access is mathematically impossible even if the frontend interface is compromised. It features role-based access control (Admin vs. Technician), at-rest PHI encryption, and unbypassable audit logging triggers.

## 🏗️ Architecture

The system utilizes a modern, serverless stack:

- **Frontend**: Next.js 14 (App Router) with TypeScript & Tailwind CSS.
- **Backend-as-a-Service**: **Supabase** (PostgreSQL).
- **Authentication**: Supabase Auth (JWT-based).
- **Authorization**: **PostgreSQL Row Level Security (RLS)** + Next.js Middleware.
- **Security**: AES-256 for Patient PII (At Rest).
- **Audit**: Database Triggers + Application Logging.

---

## 🔐 Security & Compliance Features

### 1. Zero-Trust Database (RLS)
The database operates on a "deny-by-default" policy.
- **Technicians** can only view specific operational data (Orders, Patients).
- **Admins** have full visibility but are audited.
- **Unauthorized Users** (or Anon API calls) receive zero data.
*Implemented via `secure_role_based_rls_v3_clean_slate.sql`.*

### 2. Unbypassable Audit Trails
Every critical action (`INSERT`, `UPDATE`, `DELETE`) on `patients`, `orders`, and `results` is captured by database triggers.
- Logs include: User ID, IP Address (if available), Old Values, and New Values.
- Techs cannot delete their own tracks (Audit Logs are Insert-Only for them).
*Implemented via `audit_triggers.sql`.*

### 3. Role-Based Middleware
 The application protects sensitive routes at the Edge using Next.js Middleware.
- **Admin Areas** (`/dashboard/admin`, `/tests`, `/settings`) are blocked for Technicians.
- **Redirection**: Unauthorized attempts are instantly redirected to the safe Dashboard.
- **Session Security**: Session-only cookies that expire on browser close for HIPAA compliance.
- **Real-time Role Verification**: Every request validates user role from the database.

**For complete middleware documentation, see [MIDDLEWARE.md](./MIDDLEWARE.md)**.

### 4. Patient Privacy (Encryption)
Sensitive fields (`first_name`, `last_name`, `contact`) are encrypted using AES-256 before entering the database.
- Keys are managed via Environment Variables.
- Data is decryptable only by authorized clients with the key.

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js 18+
- Supabase Project

### 2. Environment Variables
Create `.env.local` and populate:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ENCRYPTION_KEY=your_aes_secret_key
# Service role key required for Server Actions/API Routes only (optional for client-only mode)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup (Crucial)
Run the migration scripts in the SQL Editor of your Supabase Dashboard to secure the database:

1.  **RLS Setup**: Apply `supabase/migrations/secure_role_based_rls_v3_clean_slate.sql`.
2.  **Audit System**: Apply `supabase/migrations/audit_triggers.sql`.

### 5. Run Development Server
```bash
npm run dev
```

---

## 👥 User Roles

| Feature | Admin | Technician |
| :--- | :---: | :---: |
| **View Dashboard** | ✅ | ✅ |
| **Manage Patients** | ✅ | ✅ (Add/View) |
| **Create Orders** | ✅ | ✅ |
| **Enter Results** | ✅ | ✅ (Until Finalized) |
| **Approve Results** | ✅ | ❌ |
| **Access Analytics** | ✅ | ❌ |
| **Manage Staff** | ✅ | ❌ |
| **Audit Logs** | ✅ | ❌ |
| **Edit Test Catalog**| ✅ | ❌ |

---

## 🧪 Testing Security

**To verify the security Architecture:**
1.  **Login as Technician**: Try to navigate to `/dashboard/admin`. *Result: Redirected to Dashboard.*
2.  **Direct DB Access**: Try to query `audit_logs` using the technician's token. *Result: Access Denied (Read-Only allows querying self-logs only, or restricted based on policy).*
3.  **Audit Check**: Update a Patient Record. Check `audit_logs` table (as Admin). *Result: Entry created by DB Trigger.*

## 📚 Additional Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Step-by-step setup instructions
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed project structure
- **[SCHEMA_CHANGES.md](./SCHEMA_CHANGES.md)** - Database schema change history
- **[MIDDLEWARE.md](./MIDDLEWARE.md)** - Comprehensive middleware documentation and security architecture

---

## 📋 Features Implemented

- ✅ Patient Registration & Management (with PHI encryption)
- ✅ Test Catalog Management
- ✅ Order/Test Request Management
- ✅ Result Entry & Management
- ✅ Payment Processing & Tracking
- ✅ Report Generation (PDF download)
- ✅ Receipt Generation
- ✅ Dashboard with KPIs and Analytics
- ✅ Admin Analytics Dashboard
- ✅ User Management (Admin only)
- ✅ Audit Log Viewer (Admin only)
- ✅ Lab Settings Management
- ✅ Role-Based Access Control (Admin/Technician)
- ✅ Middleware Route Protection
- ✅ Real-time Revenue Tracking

---

**Built with Security by Design.**
