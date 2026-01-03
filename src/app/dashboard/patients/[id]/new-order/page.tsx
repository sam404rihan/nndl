"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { decryptData } from '@/lib/crypto';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
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
            console.error('Full error object:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
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
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href={`/dashboard/patients/${patientId}`}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4 transition"
                >
                    <ArrowLeft size={20} /> Back to Patient Profile
                </Link>

                <h1 className="text-2xl font-bold mb-2 text-slate-800">Create Test Request</h1>
                <p className="text-sm text-slate-500">
                    For: <span className="font-semibold text-slate-700">{patient.first_name} {patient.last_name}</span>
                    <span className="ml-3 font-mono text-xs">ID: {patient.id.slice(0, 8)}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Patient Info Card */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-slate-300">
                        <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Patient Information</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Name</p>
                                <p className="text-sm font-semibold text-slate-900">{patient.first_name} {patient.last_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Patient ID</p>
                                <p className="text-sm font-mono text-slate-900">{patient.id.slice(0, 8)}</p>
                            </div>
                            {patient.dob && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Age</p>
                                    <p className="text-sm text-slate-900">
                                        {Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years
                                    </p>
                                </div>
                            )}
                            {patient.gender && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Gender</p>
                                    <p className="text-sm text-slate-900">{patient.gender}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* TEST SELECTION */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-slate-300">
                        <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">
                            Select Tests <span className="text-slate-400 font-normal">({selectedTests.length} selected)</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                            {tests.map(t => {
                                const isSelected = selectedTests.includes(t.id);
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => toggleTest(t.id)}
                                        className={`p-3 rounded border-2 cursor-pointer transition ${isSelected
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{t.name}</p>
                                                <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                                    {t.code} {t.category && `• ${t.category}`}
                                                </p>
                                            </div>
                                            {isSelected && <CheckCircle size={16} className="ml-2 flex-shrink-0" />}
                                        </div>
                                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                            ₹{t.price}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SUMMARY CARD */}
                    <div className="bg-slate-50 border-2 border-slate-300 p-5 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Request Summary</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">₹{calculateTotal()}</p>
                                <p className="text-xs text-slate-600 mt-1">{selectedTests.length} tests selected</p>
                            </div>
                            <button
                                onClick={() => setShowConfirmation(true)}
                                disabled={!isValid || loading}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-semibold text-white transition text-sm"
                            >
                                {loading ? 'Processing...' : 'Confirm Test Request'}
                            </button>
                        </div>

                        {!isValid && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">
                                <AlertCircle size={14} />
                                <span>Select at least one test to continue</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* CONFIRMATION MODAL */}
            {showConfirmation && patient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b-2 border-slate-300">
                            <h2 className="text-lg font-bold text-slate-800">Confirm Test Request</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Patient */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Patient</p>
                                <p className="font-bold text-slate-900">
                                    {patient.first_name} {patient.last_name}
                                </p>
                                <p className="text-xs text-slate-600 font-mono">ID: {patient.id.slice(0, 8)}</p>
                            </div>

                            {/* Tests */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Tests ({selectedTests.length})</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {getSelectedTestsList().map(t => (
                                        <div key={t.id} className="flex justify-between text-sm py-1 border-b border-slate-100">
                                            <span className="text-slate-700">{t.name}</span>
                                            <span className="font-semibold text-slate-900">₹{t.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="pt-3 border-t-2 border-slate-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-600">Total Amount</span>
                                    <span className="text-xl font-bold text-slate-900">₹{calculateTotal()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t-2 border-slate-300 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRequest}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50"
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
