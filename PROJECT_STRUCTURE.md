# NNDL Lab Management System - Project Structure

## Overview
A HIPAA-compliant lab workflow management system built with Next.js 14, Supabase, and TypeScript.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Row Level Security)
- **Deployment**: Vercel (recommended)
- **Compliance**: HIPAA-compliant with field-level PHI encryption (AES-256)

## Directory Structure

```
nndl-lab-system/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── login/                    # Login page (public)
│   │   ├── dashboard/                # Protected dashboard routes
│   │   │   ├── patients/             # Patient management module
│   │   │   │   ├── register/         # Patient registration
│   │   │   │   └── [id]/             # Patient details & orders
│   │   │   ├── tests/                # Test catalog management
│   │   │   ├── orders/               # Order management & tracking
│   │   │   ├── results/              # Result entry
│   │   │   ├── profile/              # User profile
│   │   │   └── admin/                # Admin-only routes
│   │   │       ├── page.tsx          # Analytics dashboard
│   │   │       ├── users/            # User management
│   │   │       ├── audit/            # Audit log viewer
│   │   │       └── settings/         # Lab settings
│   │   ├── api/                      # API routes
│   │   │   └── create-user/          # User creation endpoint
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page (redirects to login)
│   │   └── globals.css               # Global styles
│   ├── components/                   # Reusable React components
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── GlobalContextBar.tsx  # Top navigation bar
│   │   │   ├── PrimaryKPITiles.tsx   # KPI metric tiles
│   │   │   ├── OperationalStatus.tsx # Status indicators
│   │   │   ├── ExceptionsPanel.tsx   # Alerts panel
│   │   │   ├── RevenueSnapshot.tsx   # Revenue metrics
│   │   │   └── SystemHealth.tsx      # System health
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── SignOutButton.tsx         # Logout button
│   │   ├── PatientForm.tsx           # Patient registration form
│   │   ├── PatientSearch.tsx         # Patient search
│   │   ├── PaymentModal.tsx          # Payment processing
│   │   ├── DownloadReportBtn.tsx     # Report download
│   │   └── LabOSIcon.tsx             # App icon
│   ├── lib/                          # Utility libraries
│   │   ├── supabase.ts               # Supabase client (browser)
│   │   ├── crypto.ts                 # PHI encryption (client)
│   │   ├── serverCrypto.ts           # PHI encryption (server)
│   │   ├── auditLog.ts               # Audit logging utilities
│   │   ├── tat.ts                    # Turnaround time calculations
│   │   ├── deltas.ts                 # Delta/metrics calculations
│   │   ├── utils.ts                  # General utilities
│   │   └── validation.ts             # Data validation
│   ├── services/                     # Business logic services
│   │   ├── patientService.ts         # Patient operations
│   │   ├── orderService.ts           # Order operations
│   │   ├── testService.ts            # Test catalog operations
│   │   ├── resultsService.ts         # Result operations
│   │   ├── reportService.ts          # Report generation
│   │   ├── paymentService.ts         # Payment processing
│   │   ├── receiptService.ts         # Receipt generation
│   │   ├── billingService.ts         # Billing operations
│   │   └── settingsService.ts        # Settings management
│   ├── types/                        # TypeScript type definitions
│   │   └── index.ts                  # All type definitions
│   └── middleware.ts                 # Auth & route protection (See MIDDLEWARE.md for details)
├── supabase/                         # Supabase configuration
│   └── migrations/                   # SQL migration files
│       └── audit_triggers.sql        # Audit logging triggers
├── public/                           # Static assets
├── .env.local                        # Environment variables (local)
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── postcss.config.mjs                # PostCSS configuration
├── eslint.config.mjs                 # ESLint configuration
├── package.json                      # Dependencies
├── README.md                         # Project overview
├── SETUP_GUIDE.md                    # Setup instructions
├── PROJECT_STRUCTURE.md              # This file
├── MIDDLEWARE.md                     # Middleware role and security documentation
└── SCHEMA_CHANGES.md                 # Database change log

```

## Core Modules

### 1. Patient Registration (`src/app/(dashboard)/patients/`)
- Patient CRUD operations
- Unique patient ID generation
- PHI field encryption
- Patient search functionality

## Core Modules

### 1. Patient Management (`src/app/dashboard/patients/`)
- Patient registration with PHI encryption
- Patient directory/search
- Individual patient profiles
- Order history per patient
- Edit patient information

### 2. Test Catalog (`src/app/dashboard/tests/`)
- Test catalog management (Admin only)
- Add/edit/delete tests
- Test pricing configuration
- Turnaround time settings

### 3. Order Management (`src/app/dashboard/orders/`)
- Create orders for patients
- Track order status
- Payment processing
- Order cancellation/deletion
- Status: pending → in_process → completed → delivered

### 4. Results Entry (`src/app/dashboard/results/`)
- Enter test results
- View/edit results
- Finalize results
- Revert finalized results

### 5. Reports & Receipts
- PDF report generation (via reportService)
- PDF receipt generation (via receiptService)
- Download functionality

### 6. Dashboard (`src/app/dashboard/`)
- Real-time KPI tiles
- Operational status
- Exceptions panel
- Revenue snapshot
- System health

### 7. Admin Module (`src/app/dashboard/admin/`)
- **Analytics**: Revenue trends, top tests, order status distribution
- **User Management**: Create/manage staff accounts
- **Audit Logs**: View all system audit logs
- **Settings**: Configure lab details, TAT defaults

## Database Schema (Supabase PostgreSQL)

### Tables:
1. **profiles** - User profiles with role (admin/technician)
2. **patients** - Patient demographic data (first_name, last_name, contact encrypted)
3. **tests** - Test catalog with pricing and TAT
4. **orders** - Test orders with status and payment tracking
5. **order_tests** - Junction table for orders and tests (many-to-many)
6. **test_results** - Laboratory test results linked to order_tests
7. **audit_logs** - HIPAA-compliant audit trail (trigger-based)
8. **lab_settings** - Lab configuration (name, address, default TAT)

## Security Features

### HIPAA Compliance:
- ✅ Field-level PHI encryption (AES-256 for patient names & contact)
- ✅ Row Level Security (RLS) policies on all tables
- ✅ Role-based access control (Admin/Technician)
- ✅ Automatic audit logging via database triggers
- ✅ Session timeout via middleware (session-only cookies)
- ✅ Secure data transmission (HTTPS)
- ✅ Middleware route protection (See MIDDLEWARE.md)
- ✅ Unbypassable database-level security

### RLS Policies:
- **Admin**: Full access to all tables
- **Technician**: Read/write access to operational data, no access to admin areas
- **Audit logs**: Insert-only for technicians, full access for admins

## Environment Variables

Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anonymous key (client)
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key (server)
NEXT_PUBLIC_ENCRYPTION_KEY        # 64-char hex key for PHI encryption
```

## Development Workflow

### Setup:
```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env.local with required variables

# Run development server
npm run dev
```

### Build & Deploy:
```bash
# Build for production
npm run build

# Start production server
npm start

# Or deploy to Vercel
vercel deploy
```

## Key Dependencies

- **next**: 16.x - React framework (App Router)
- **react**: 19.x - UI library
- **typescript**: 5.x - Type safety
- **@supabase/supabase-js**: 2.x - Supabase client
- **@supabase/ssr**: 0.x - Server-side rendering support
- **tailwindcss**: 3.x - Styling
- **lucide-react**: Icons
- **jspdf** & **jspdf-autotable**: PDF generation
- **recharts**: Charts and analytics
- **crypto-js**: Client-side encryption
- **date-fns**: Date utilities
- **qrcode**: QR code generation

## Workflows

### Patient Registration Flow:
1. User fills patient form → `PatientForm.tsx`
2. Data encrypted → `crypto.ts`
3. Saved to DB → `patientService.ts`
4. Audit log created → database trigger
5. Redirect to patient profile

### Order Creation Flow:
1. Select patient
2. Choose tests from catalog
3. Calculate total
4. Create order → `orderService.ts`
5. Create order_tests records
6. Auto-generate test_results shells (via trigger)
7. Audit log created

### Payment Flow:
1. View order in orders list
2. Click payment button
3. Select payment method (cash/card/UPI)
4. Mark as paid → `paymentService.ts`
5. Update order.payment_status = 'paid'
6. Revenue dashboard updates

---

For setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## Next Steps

1. ✅ Project structure initialized
2. ⏳ Configure Firebase project
3. ⏳ Set up authentication with RBAC
4. ⏳ Build patient registration module
5. ⏳ Implement test catalog and orders
6. ⏳ Create report generation system
7. ⏳ Build billing module
8. ⏳ Create analytics dashboard
9. ⏳ Deploy to Vercel with custom domain

## Support

For issues or questions, refer to:
- Firebase Documentation: https://firebase.google.com/docs
- Next.js Documentation: https://nextjs.org/docs
- HIPAA Compliance Guide: https://www.hhs.gov/hipaa
