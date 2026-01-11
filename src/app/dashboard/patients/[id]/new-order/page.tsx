"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { decryptData } from '@/lib/crypto';
import { CheckCircle, AlertCircle, ArrowLeft, Search, User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { createOrder } from '@/services/orderService';

export default function NewOrderForPatientPage() {
    const params = useParams();
    const patientId = params.id as string;
    const router = useRouter();

    // State
    const [patient, setPatient] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [testSearchQuery, setTestSearchQuery] = useState('');

    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            if (!patientId) {
                alert('No patient selected');
                router.push('/dashboard/patients');
                return;
            }

            // Load patient
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
                });
            }

            // Load tests
            const { data: testData } = await supabase.from('tests').select('*').order('name');
            setTests(testData || []);
        };
        fetchData();
    }, [patientId, router]);

    const toggleTest = (id: string) => {
        setSelectedTests(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const calculateTotal = () => {
        return tests
            .filter(t => selectedTests.includes(t.id))
            .reduce((sum, t) => sum + t.price, 0);
    };

    const getSelectedTestsList = () => {
        return tests.filter(t => selectedTests.includes(t.id));
    };

    const handleCreateRequest = async () => {
        if (selectedTests.length === 0) return alert("Please select at least one test");

        setLoading(true);
        try {
            // Use the service layer which includes audit logging
            await createOrder(patientId, selectedTests, calculateTotal());

            router.push(`/dashboard/patients/${patientId}`);

        } catch (error: any) {
            const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
            alert("Failed to create request: " + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const isValid = selectedTests.length > 0;

    if (!patient) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
            {/* Header */}
            <div className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{
                background: 'rgba(255, 255, 255, 0.98)',
                borderColor: 'rgba(0,0,0,0.06)'
            }}>
                <div className="max-w-7xl mx-auto px-6 py-3">
                    <Link
                        href={`/dashboard/patients/${patientId}`}
                        className="flex items-center gap-2 mb-4 text-sm font-semibold transition-all hover:gap-3"
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
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Patient Details Card */}
                    <div className="lg:col-span-1">
                        <div className="overflow-hidden transition-all hover:shadow-xl" style={{
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            {/* Card Header */}
                            <div className="px-5 py-3.5" style={{
                                background: 'linear-gradient(135deg, #4A6FA5 0%, #52A397 100%)',
                            }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl" style={{
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
                            <div className="p-4 space-y-2">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                                        <User size={14} />
                                        <span>Full Name</span>
                                    </div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>
                                        {patient.first_name} {patient.last_name}
                                    </p>
                                </div>

                                {patient.dob && (
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
                                        <p className="text-sm font-semibold mt-1" style={{ color: '#6B7280' }}>
                                            {Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old
                                        </p>
                                    </div>
                                )}

                                {patient.gender && (
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Gender</div>
                                        <p className="text-base font-bold" style={{ color: '#1F2937' }}>{patient.gender}</p>
                                    </div>
                                )}

                                <div className="pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                                        <Phone size={14} />
                                        <span>Phone Number</span>
                                    </div>
                                    <p className="text-base font-bold" style={{ color: '#1F2937' }}>{patient.contact || 'Not provided'}</p>
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
                                        {patient.created_at && new Date(patient.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Selection Section */}
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
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{
                                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                    }}>
                                        <FileText className="w-5 h-5" style={{ color: 'white' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                                            Select Tests
                                        </h2>
                                        <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                                            {selectedTests.length} test(s) selected
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                {/* Search Filter */}
                                <div className="mb-4 relative">
                                    <input
                                        type="text"
                                        value={testSearchQuery}
                                        onChange={(e) => setTestSearchQuery(e.target.value)}
                                        placeholder="Search tests by name or code..."
                                        className="w-full pl-4 pr-4 py-2.5 rounded-lg border font-medium text-sm transition-all"
                                        style={{
                                            borderColor: testSearchQuery ? '#2563EB' : '#E5E7EB',
                                            color: '#1F2937',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2" style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#CBD5E1 #F1F5F9'
                                }}>
                                    {tests.filter(t => {
                                        if (!testSearchQuery) return true;
                                        const query = testSearchQuery.toLowerCase();
                                        return (
                                            t.name.toLowerCase().includes(query) ||
                                            t.code.toLowerCase().includes(query) ||
                                            (t.category && t.category.toLowerCase().includes(query))
                                        );
                                    }).map(t => {
                                        const isSelected = selectedTests.includes(t.id);
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => toggleTest(t.id)}
                                                className="p-3 rounded-lg cursor-pointer transition-all border-2"
                                                style={{
                                                    background: isSelected ? '#2563EB' : 'white',
                                                    borderColor: isSelected ? '#2563EB' : '#E5E7EB',
                                                    color: isSelected ? 'white' : '#1F2937'
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">{t.name}</p>
                                                        <p className="text-xs mt-0.5" style={{
                                                            color: isSelected ? 'rgba(255,255,255,0.8)' : '#6B7280'
                                                        }}>
                                                            {t.code} {t.category && `• ${t.category}`}
                                                        </p>
                                                    </div>
                                                    {isSelected && <CheckCircle size={16} className="ml-2 flex-shrink-0" />}
                                                </div>
                                                <span className="text-sm font-bold">
                                                    ₹{t.price}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary Section */}
                                <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                                                Total Amount
                                            </p>
                                            <p className="text-3xl font-bold mt-1" style={{ color: '#1F2937' }}>
                                                ₹{calculateTotal()}
                                            </p>
                                            <p className="text-xs font-semibold mt-1" style={{ color: '#6B7280' }}>
                                                {selectedTests.length} tests selected
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowConfirmation(true)}
                                            disabled={!isValid || loading}
                                            className="px-6 py-3 rounded-xl font-bold transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                background: isValid ? '#2563EB' : '#E5E7EB',
                                                color: 'white'
                                            }}
                                        >
                                            {loading ? 'Processing...' : 'Create Order'}
                                        </button>
                                    </div>

                                    {!isValid && (
                                        <div className="flex items-center gap-2 text-xs px-4 py-3 rounded-lg" style={{
                                            background: '#FEF3C7',
                                            color: '#92400E',
                                            border: '1px solid #FCD34D'
                                        }}>
                                            <AlertCircle size={14} />
                                            <span>Select at least one test to continue</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {showConfirmation && patient && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="max-w-md w-full" style={{
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                            <h2 className="text-lg font-bold" style={{ color: '#1F2937' }}>Confirm Test Request</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Patient */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Patient</p>
                                <p className="font-bold" style={{ color: '#1F2937' }}>
                                    {patient.first_name} {patient.last_name}
                                </p>
                                <p className="text-xs font-mono mt-1" style={{ color: '#6B7280' }}>ID: {patient.patient_no || patient.id.slice(0, 8)}</p>
                            </div>

                            {/* Tests */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Tests ({selectedTests.length})</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {getSelectedTestsList().map(t => (
                                        <div key={t.id} className="flex justify-between text-sm py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                                            <span style={{ color: '#1F2937' }}>{t.name}</span>
                                            <span className="font-semibold" style={{ color: '#1F2937' }}>₹{t.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="pt-3" style={{ borderTop: '2px solid rgba(0,0,0,0.06)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Total Amount</span>
                                    <span className="text-xl font-bold" style={{ color: '#1F2937' }}>₹{calculateTotal()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ 
                            borderColor: 'rgba(0,0,0,0.06)',
                            background: '#F9FAFB'
                        }}>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 font-semibold transition-all"
                                style={{ color: '#6B7280' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRequest}
                                disabled={loading}
                                className="px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                                style={{
                                    background: '#2563EB',
                                    color: 'white'
                                }}
                            >
                                {loading ? 'Creating...' : 'Create Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
