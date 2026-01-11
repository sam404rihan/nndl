"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerPatient } from '@/services/patientService';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';

export default function PatientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Calculate age from DOB
  const calculateAge = (dobString: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Check for potential duplicates
  const checkDuplicates = async (emailVal: string, phoneVal: string, dobVal: string) => {
    if (!emailVal && !phoneVal && !dobVal) return;

    const { data } = await supabase
      .from('patients')
      .select('id')
      .or(`email.eq.${emailVal},contact_number.eq.${phoneVal},dob.eq.${dobVal}`)
      .limit(1);

    if (data && data.length > 0) {
      setDuplicateWarning('A patient with similar details may already exist');
    } else {
      setDuplicateWarning('');
    }
  };

  const handleEmailBlur = () => {
    if (email) checkDuplicates(email, phone, dob);
  };

  const handlePhoneBlur = () => {
    if (phone) checkDuplicates(email, phone, dob);
  };

  const handleDobChange = (value: string) => {
    setDob(value);
    if (value) checkDuplicates(email, phone, value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!confirmed) {
      alert('Please confirm that the details are accurate');
      return;
    }

    setLoading(true);
    setMsg('');

    const formData = new FormData(e.currentTarget);

    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      contact: formData.get('phone') as string,
      dob: formData.get('dob') as string,
      gender: formData.get('gender') as string,
    };

    try {
      const result = await registerPatient(data);
      setMsg('✅ Patient registered successfully');

      // Redirect to create test request for this patient
      setTimeout(() => {
        router.push(`/dashboard/patients/${result.id}/new-order`);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setMsg(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const age = calculateAge(dob);

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-slate-300 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Patient Registration</h2>
        <p className="text-slate-500 text-sm">PHI stored securely</p>
      </div>

      {msg && (
        <div className={`p-3 rounded mb-4 border-2 ${msg.includes('Error')
          ? 'bg-red-50 text-red-700 border-red-300'
          : 'bg-green-50 text-green-700 border-green-300'
          }`}>
          {msg}
        </div>
      )}

      {duplicateWarning && (
        <div className="p-3 rounded mb-4 bg-amber-50 text-amber-800 border-2 border-amber-300 flex items-start gap-2">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span className="text-sm font-semibold">{duplicateWarning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b-2 border-slate-200">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">First Name *</label>
              <input
                name="firstName"
                required
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Last Name *</label>
              <input
                name="lastName"
                required
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Date of Birth *</label>
              <input
                name="dob"
                type="date"
                required
                value={dob}
                onChange={(e) => handleDobChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {age !== null && (
                <p className="text-xs text-slate-600 font-semibold mt-1">Age: {age} years</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Gender *</label>
              <select
                name="gender"
                required
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b-2 border-slate-200">
            Contact Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Phone Number *</label>
              <input
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="10-digit mobile number"
                pattern="[0-9]{10}"
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Email</label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="Optional"
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="pt-4 border-t-2 border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">
              I confirm that the above details are accurate and complete.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            disabled={loading || !confirmed}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition"
          >
            {loading ? 'Processing...' : 'Register & Create Test Request'}
          </button>
          <p className="text-xs text-center text-slate-500 mt-3">
            After registration, you'll be redirected to create a test request
          </p>
        </div>
      </form>
    </div>
  );
}