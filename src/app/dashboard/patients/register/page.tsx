"use client";

import PatientForm from '@/components/PatientForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPatientPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/dashboard/patients"
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition"
      >
        <ArrowLeft size={20} /> Back to Directory
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">New Patient Registration</h1>
        <p className="text-slate-500">Enter patient details below. PHI stored securely.</p>
      </header>

      {/* The Form Component we built earlier */}
      <PatientForm />
    </div>
  );
}