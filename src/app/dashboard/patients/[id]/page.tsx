"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { ArrowLeft, User, Phone, Mail, Calendar, FileText, X } from 'lucide-react';

export default function PatientProfilePage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<any>(null);
    const [testRequests, setTestRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedRequestForModal, setSelectedRequestForModal] = useState<any>(null);

    useEffect(() => {
        loadPatientData();
    }, [patientId]);

    const loadPatientData = async () => {
        // Load patient details
        const { data: patientData } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (patientData) {
            setPatient({
                ...patientData,
                first_name: decryptData(patientData.first_name),
                last_name: decryptData(patientData.last_name),
                contact: decryptData(patientData.contact_number),
                patient_no: patientData.patient_no
            });
        }

        // Load test requests (orders)
        const { data: requestsData } = await supabase
            .from('orders')
            .select('*, order_tests(*, tests(name))')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        setTestRequests(requestsData || []);
        setLoading(false);
    };

    const getAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getStatusColor = (status: string) => {
        if (status === 'delivered') return 'bg-green-100 text-green-800 border-green-300';
        if (status === 'completed') return 'bg-blue-100 text-blue-800 border-blue-300';
        if (status === 'in_process') return 'bg-purple-100 text-purple-800 border-purple-300';
        return 'bg-slate-100 text-slate-700 border-slate-300';
    };

    // Get unique dates when tests were taken
    const getTestDates = () => {
        const dates = testRequests.map(req => new Date(req.created_at).toDateString());
        return Array.from(new Set(dates)); // Return unique dates
    };

    // Filter requests by selected date
    const getFilteredRequests = () => {
        if (!selectedDate) return testRequests;
        return testRequests.filter(req =>
            new Date(req.created_at).toDateString() === selectedDate
        );
    };

    const filteredRequests = getFilteredRequests();
    const testDates = getTestDates();

    if (loading) {
        return <div className="p-8">Loading patient profile...</div>;
    }

    if (!patient) {
        return (
            <div className="p-8">
                <p>Patient not found</p>
                <Link href="/dashboard/patients" className="text-blue-600 hover:underline">
                    Back to Patients
                </Link>
            </div>
        );
    }

    const age = getAge(patient.dob);

    return (
        <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
            {/* Header */}
            <div className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{
                background: 'rgba(255, 255, 255, 0.98)',
                borderColor: 'rgba(0,0,0,0.06)'
            }}>
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <Link
                        href="/dashboard/patients"
                        className="flex items-center gap-2 mb-3 text-sm font-semibold transition-all hover:gap-3"
                        style={{ color: '#6B7280' }}
                    >
                        <ArrowLeft size={18} /> Back to Patient Directory
                    </Link>

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-extrabold" style={{ 
                                color: '#1F2937',
                                letterSpacing: '-0.03em'
                            }}>
                                {patient.first_name} {patient.last_name}
                            </h1>
                            <p className="text-sm font-mono mt-2 px-3 py-1 rounded-lg inline-block" style={{
                                background: '#F3F4F6',
                                color: '#6B7280'
                            }}>
                                Patient ID: {patient.patient_no || patient.id.slice(0, 8)}
                            </p>
                        </div>
                        <Link
                            href={`/dashboard/patients/${patient.id}/new-order`}
                            className="px-6 py-3 rounded-xl font-bold transition-all hover:shadow-xl hover:-translate-y-0.5"
                            style={{
                                background: '#4A6FA5',
                                color: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                        >
                            + New Test Request
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Patient Details Card */}
                    <div className="lg:col-span-1">
                        <div className="overflow-hidden transition-all hover:shadow-xl" style={{
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            {/* Card Header */}
                            <div className="px-5 py-4" style={{
                                background: 'linear-gradient(135deg, #4A6FA5 0%, #52A397 100%)',
                            }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        backdropFilter: 'blur(10px)'
                                    }}>
                                        {patient.first_name[0]}{patient.last_name[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold" style={{ color: 'white' }}>
                                            Patient Information
                                        </h2>
                                        <p className="text-xs opacity-90" style={{ color: 'white' }}>
                                            Complete profile details
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-2.5">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                                        <User size={14} />
                                        <span>Full Name</span>
                                    </div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>
                                        {patient.first_name} {patient.last_name}
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                                        <Calendar size={14} />
                                        <span>Date of Birth</span>
                                    </div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>
                                        {new Date(patient.dob).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    {age && <p className="text-sm font-semibold mt-1" style={{ color: '#6B7280' }}>{age} years old</p>}
                                </div>

                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Gender</div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>{patient.gender || 'Not specified'}</p>
                                </div>

                                <div className="pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                                        <Phone size={14} />
                                        <span>Phone Number</span>
                                    </div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>{patient.contact}</p>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                                        <Mail size={14} />
                                        <span>Email</span>
                                    </div>
                                    <p className="text-base font-bold break-all" style={{ color: '#1F2937' }}>{patient.email || 'Not provided'}</p>
                                </div>

                                <div className="pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                    <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Registered</div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>
                                        {new Date(patient.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Request History */}
                    <div className="lg:col-span-2">
                        <div className="overflow-hidden transition-all hover:shadow-xl" style={{
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <div className="px-6 py-5 border-b" style={{
                                background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                                borderColor: 'rgba(0,0,0,0.06)'
                            }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{
                                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                        }}>
                                            <FileText className="w-5 h-5" style={{ color: 'white' }} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1F2937' }}>
                                                Test Request History
                                                {selectedDate && (
                                                    <span className="text-xs font-bold px-3 py-1 rounded-lg" style={{
                                                        background: '#EFF6FF',
                                                        color: '#1E40AF'
                                                    }}>
                                                        {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </h2>
                                            <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                                                {filteredRequests.length} request(s) {selectedDate ? 'on this date' : 'total'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowCalendar(!showCalendar)}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:shadow-md"
                                            style={{
                                                background: 'white',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                color: '#6B7280'
                                            }}
                                        >
                                            <Calendar size={16} />
                                            Filter by Date
                                        </button>

                                        {showCalendar && (
                                            <div className="absolute right-0 top-full mt-2 p-4 min-w-[320px] z-20" style={{
                                                background: 'white',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                                border: '1px solid rgba(0,0,0,0.08)'
                                            }}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-bold" style={{ color: '#1F2937' }}>Select Date</span>
                                                    {selectedDate && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedDate(null);
                                                                setShowCalendar(false);
                                                            }}
                                                            className="text-xs font-bold hover:underline"
                                                            style={{ color: '#4A6FA5' }}
                                                        >
                                                            Clear Filter
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {Array.from(new Set(testDates)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map((date) => {
                                                        const isSelected = selectedDate === date;
                                                        return (
                                                            <button
                                                                key={date}
                                                                onClick={() => {
                                                                    setSelectedDate(date);
                                                                    setShowCalendar(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 rounded-lg transition-all"
                                                                style={{
                                                                    background: isSelected ? '#4A6FA5' : '#F3F4F6',
                                                                    color: isSelected ? 'white' : '#1F2937',
                                                                    border: isSelected ? '1px solid #4A6FA5' : '1px solid rgba(0,0,0,0.05)'
                                                                }}
                                                            >
                                                                <div className="font-bold text-sm">
                                                                    {new Date(date).toLocaleDateString('en-IN', {
                                                                        weekday: 'short',
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    })}
                                                                </div>
                                                                <div className="text-xs mt-1" style={{
                                                                    color: isSelected ? 'rgba(255,255,255,0.8)' : '#6B7280'
                                                                }}>
                                                                    {testRequests.filter(r => new Date(r.created_at).toDateString() === date).length} request(s)
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {filteredRequests.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{
                                        background: '#F3F4F6'
                                    }}>
                                        <FileText className="w-10 h-10" style={{ color: '#9CA3AF' }} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
                                        {selectedDate ? 'No Requests on This Date' : 'No Test Requests Yet'}
                                    </h3>
                                    <p className="text-sm" style={{ color: '#6B7280' }}>
                                        {selectedDate ? 'Try selecting a different date' : 'Create a new test request to get started'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y max-h-[380px] overflow-y-auto pr-2" style={{
                                    borderColor: 'rgba(0,0,0,0.05)',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#CBD5E1 #F1F5F9'
                                }}>
                                    <style jsx>{`
                                        div::-webkit-scrollbar {
                                            width: 8px;
                                        }
                                        div::-webkit-scrollbar-track {
                                            background: #F1F5F9;
                                            border-radius: 4px;
                                        }
                                        div::-webkit-scrollbar-thumb {
                                            background: #CBD5E1;
                                            border-radius: 4px;
                                        }
                                        div::-webkit-scrollbar-thumb:hover {
                                            background: #94A3B8;
                                        }
                                    `}</style>
                                    {filteredRequests.map((request) => (
                                        <div key={request.id} className="relative hover:bg-slate-50/50 transition-all group pb-16">
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-2.5">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2.5">
                                                            <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-lg" style={{
                                                                background: '#EFF6FF',
                                                                color: '#1E40AF'
                                                            }}>
                                                                {request.id.slice(0, 8).toUpperCase()}
                                                            </span>
                                                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase ${getStatusColor(request.status)}`}>
                                                                {request.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                                                            Created: {new Date(request.created_at).toLocaleString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedRequestForModal(request)}
                                                        className="text-sm font-bold px-4 py-2.5 rounded-lg transition-all hover:shadow-md"
                                                        style={{
                                                            background: '#4A6FA5',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                </div>

                                                {/* Tests in this request */}
                                                <div className="mb-2.5">
                                                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Tests Requested</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {request.order_tests?.slice(0, 3).map((item: any) => (
                                                            <span
                                                                key={item.id}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                                style={{
                                                                    background: 'rgba(74, 111, 165, 0.08)',
                                                                    color: '#4A6FA5',
                                                                    border: '1px solid rgba(74, 111, 165, 0.15)'
                                                                }}
                                                            >
                                                                {item.tests?.name || 'Unknown Test'}
                                                            </span>
                                                        ))}
                                                        {request.order_tests && request.order_tests.length > 3 && (
                                                            <span
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                style={{
                                                                    background: '#F3F4F6',
                                                                    color: '#6B7280',
                                                                    border: '1px solid #E5E7EB'
                                                                }}
                                                            >
                                                                +{request.order_tests.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Total Amount - Footer */}
                                            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex justify-between items-center" style={{
                                                borderTop: '2px solid rgba(0,0,0,0.08)',
                                                background: 'linear-gradient(to top, #F9FAFB 0%, #FFFFFF 100%)'
                                            }}>
                                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>Total Amount</span>
                                                <span className="text-2xl font-extrabold" style={{ color: '#1F2937' }}>₹{request.total_amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Request Details Modal */}
            {selectedRequestForModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" style={{
                        background: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                    }}>
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b flex items-center justify-between" style={{
                            background: 'linear-gradient(135deg, #4A6FA5 0%, #52A397 100%)',
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            <div>
                                <h2 className="text-xl font-extrabold" style={{ color: 'white' }}>Test Request Details</h2>
                                <p className="text-sm font-mono mt-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                    ID: {selectedRequestForModal.id.slice(0, 8).toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRequestForModal(null)}
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:rotate-90"
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Request Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: '#6B7280' }}>
                                    Request Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 p-5 rounded-xl" style={{
                                    background: '#F9FAFB',
                                    border: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#9CA3AF' }}>
                                            Created
                                        </span>
                                        <span className="font-bold" style={{ color: '#1F2937' }}>
                                            {new Date(selectedRequestForModal.created_at).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#9CA3AF' }}>
                                            Status
                                        </span>
                                        <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg uppercase ${getStatusColor(selectedRequestForModal.status)}`}>
                                            {selectedRequestForModal.status}
                                        </span>
                                    </div>
                                    <div className="col-span-2 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                        <span className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#9CA3AF' }}>
                                            Total Amount
                                        </span>
                                        <span className="font-extrabold text-2xl" style={{ color: '#1F2937' }}>
                                            ₹{selectedRequestForModal.total_amount}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tests */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: '#6B7280' }}>
                                    Tests Requested
                                </h3>
                                <div className="overflow-hidden max-h-[400px] overflow-y-auto" style={{
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#CBD5E1 #F1F5F9'
                                }}>
                                    <style jsx>{`
                                        div::-webkit-scrollbar {
                                            width: 6px;
                                        }
                                        div::-webkit-scrollbar-track {
                                            background: #F1F5F9;
                                            border-radius: 3px;
                                        }
                                        div::-webkit-scrollbar-thumb {
                                            background: #CBD5E1;
                                            border-radius: 3px;
                                        }
                                        div::-webkit-scrollbar-thumb:hover {
                                            background: #94A3B8;
                                        }
                                    `}</style>
                                    <table className="min-w-full">
                                        <thead style={{
                                            background: '#F9FAFB'
                                        }}>
                                            <tr>
                                                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                                                    Test Name
                                                </th>
                                                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                                            {selectedRequestForModal.order_tests?.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-5 py-4 font-bold" style={{ color: '#1F2937' }}>
                                                        {item.tests?.name || 'Unknown'}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-lg" style={{
                                                            background: '#F3F4F6',
                                                            color: '#6B7280'
                                                        }}>
                                                            {item.status || 'pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t flex justify-end" style={{
                            background: '#F9FAFB',
                            borderColor: 'rgba(0,0,0,0.06)'
                        }}>
                            <button
                                onClick={() => setSelectedRequestForModal(null)}
                                className="px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg"
                                style={{
                                    background: '#1F2937',
                                    color: 'white'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}