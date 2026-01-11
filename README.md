# NNDL Lab Management System

> **A HIPAA-compliant Laboratory Information Management System (LIMS) built with security-first architecture**

This specialized LIMS enforces data security at the database level using strict Row Level Security (RLS) policies, ensuring that unauthorized access is impossible even if the frontend is compromised. Features include role-based access control, at-rest PHI encryption, comprehensive audit logging, and secure session management.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19 & TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT-based session cookies
- **Security**: 
  - PostgreSQL Row Level Security (RLS)
  - AES-256 encryption for PHI
  - Session cookies (expire on browser close)
  - Explicit cookie clearing on logout
- **Reporting**: jsPDF with QR code generation
- **Charts**: Recharts for analytics dashboards
- **Validation**: Zod for type-safe schema validation

---

## 🔐 Security & HIPAA Compliance

### 1. **Zero-Trust Database Architecture**
Database operates on "deny-by-default" policy with PostgreSQL Row Level Security (RLS):
- **Technicians**: View-only access to operational data (orders, patients, results)
- **Admins**: Full access with comprehensive audit trails
- **Anonymous/Unauthorized**: Zero data access
- Implementation: `secure_role_based_rls_v3_clean_slate.sql`

### 2. **Comprehensive Audit Logging**
Database triggers automatically capture all critical operations:
- **Tracked Actions**: `INSERT`, `UPDATE`, `DELETE` on patients, orders, results
- **Logged Data**: User ID, IP address, timestamp, old/new values, user agent
- **Integrity**: Insert-only logs prevent tampering (technicians cannot delete audit entries)
- **Compliance**: Meets HIPAA audit trail requirements
- Implementation: `audit_triggers.sql`

### 3. **Secure Session Management**
- **Session Cookies**: Expire automatically when browser closes
- **Explicit Logout**: Clears all Supabase auth cookies immediately on sign out
- **Middleware Protection**: Edge-level route protection prevents unauthorized access
- **No Persistent Sessions**: Sessions don't survive browser restart unless explicitly configured

### 4. **Role-Based Access Control**
Next.js middleware enforces route-level security:
- **Protected Routes**: `/dashboard/admin/*`, `/dashboard/tests`, `/dashboard/settings`
- **Auto-Redirect**: Unauthorized access attempts redirect to safe zones
- **Server-Side Validation**: Profile role checked before rendering sensitive pages

### 5. **PHI Encryption at Rest**
Patient identifiable information encrypted before storage:
- **Algorithm**: AES-256-CBC encryption
- **Encrypted Fields**: `first_name`, `last_name`, `contact`, `address`
- **Key Management**: Environment variable-based key storage
- **Decryption**: Only authorized clients with valid encryption keys can decrypt

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher  
- **Supabase Account**: [Create one here](https://supabase.com)

### Installation

1. **Clone & Install**
```bash
git clone <repository-url>
cd nndl
npm install
```

2. **Environment Setup**

Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Encryption (Generate a 32-character random string)
NEXT_PUBLIC_ENCRYPTION_KEY=your_32_char_encryption_key_here
```

3. **Database Configuration** ⚠️ **Critical for Security**

Execute these SQL migrations in your Supabase SQL Editor (in order):

```bash
# 1. Apply RLS policies (security layer)
supabase/migrations/secure_role_based_rls_v3_clean_slate.sql

# 2. Enable audit logging (compliance layer)
supabase/migrations/audit_triggers.sql
```

4. **Start Development Server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

5. **Build for Production**
```bash
npm ruSecurity Testing

### Verify Security Implementation

**1. Role-Based Access Control**
- Login as a **technician** account
- Attempt to navigate to `/dashboard/admin`
- **Expected**: Automatic redirect to `/dashboard`

**2. Database RLS Verification**
- Login as **technician**
- Try to query `audit_logs` table via Supabase client
- **Expected**: Access denied or only self-logs visible

**3. Audit Trail Verification**
- L✨ Core Features

### Patient Management
- ✅ Patient registration with encrypted PHI
- ✅ Advanced patient search (name, ID, contact)
- ✅ Patient demographics and history
- ✅ Secure data encryption (AES-256)

### Laboratory Operations
- ✅ Test catalog management (admin)
- ✅ Order/requisition creation
- ✅ Result entry and approval workflow
- ✅ Multi-test orders
- ✅ Turnaround time (TAT) tracking

### Financial Operations
- ✅ Payment processing and tracking
- ✅ Receipt generation with QR codes
- ✅ Revenue analytics and reporting
- ✅ Real-time financial dashboards

### Reporting & Analytics
- ✅ PDF report generation with branding
- ✅ Lab-branded receipts
- ✅ KPI dashboards (admin & technician views)
- ✅ Operational status monitoring
- ✅ Revenue snapshots
- ✅ System health metrics

### Administration
- ✅ User management (admin only)
- ✅ Role-based permissions (admin/technician)
- ✅ Audit log viewer with filtering
- ✅ Lab settings configuration
- ✅ Test catalog editor

### Security & Compliance
- ✅ HIPAA-compliant audit trails
- ✅ Row-level security (RLS)
- ✅ Encrypted PHI at rest
- ✅ Secure session management
- ✅ Automatic logout on browser close
- ✅ IP tracking and user agent logging
- ✅ Route-level access control

---

## 🔄 Development Workflow

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

---

## 🐛 Known Issues & Limitations

- Sessions expire on browser close (by design for security)
- Encryption key must remain consistent across deployments
- Audit logs are append-only and cannot be deleted via UI

---

## 📄 License

This project is proprietary and confidential.

---

**Built with Security-First Architecture** 🔒

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Comprehensive setup instructions
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Application architecture overview
- **[SCHEMA_CHANGES.md](./SCHEMA_CHANGES.md)** - Database migration
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
