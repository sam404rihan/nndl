"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, Calendar, FileText, X } from 'lucide-react';

interface PatientProfileClientProps {
    patient: any;
    requests: any[];
}

export default function PatientProfileClient({ patient: initialPatient, requests: initialRequests }: PatientProfileClientProps) {
    const router = useRouter();

    // We use state in case we want to support client-side updates in future,
    // but initialized with Server Data.
    const [patient] = useState<any>(initialPatient);
    const [testRequests] = useState<any[]>(initialRequests);

    // UI States
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedRequestForModal, setSelectedRequestForModal] = useState<any>(null);

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
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/dashboard/patients"
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4 transition"
                >
                    <ArrowLeft size={20} /> Back to Patient Directory
                </Link>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            {patient.first_name} {patient.last_name}
                        </h1>
                        <p className="text-sm text-slate-500 font-mono mt-1">Patient ID: {patient.id.slice(0, 8)}</p>
                    </div>
                    <Link
                        href={`/dashboard/patients/${patient.id}/new-order`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                        + New Test Request
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient Details Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm border-2 border-slate-300 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b-2 border-slate-200">
                            Patient Information
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold mb-1">
                                    <User size={14} />
                                    <span>Full Name</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {patient.first_name} {patient.last_name}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold mb-1">
                                    <Calendar size={14} />
                                    <span>Date of Birth</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {new Date(patient.dob).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                                {age && <p className="text-xs text-slate-600 mt-1">{age} years old</p>}
                            </div>

                            <div>
                                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Gender</div>
                                <p className="text-sm font-semibold text-slate-900">{patient.gender || '—'}</p>
                            </div>

                            <div className="pt-3 border-t-2 border-slate-200">
                                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold mb-1">
                                    <Phone size={14} />
                                    <span>Phone Number</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{patient.contact}</p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold mb-1">
                                    <Mail size={14} />
                                    <span>Email</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{patient.email || '—'}</p>
                            </div>

                            <div className="pt-3 border-t-2 border-slate-200">
                                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Registered</div>
                                <p className="text-sm font-semibold text-slate-900">
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
                    <div className="bg-white rounded-lg shadow-sm border-2 border-slate-300">
                        <div className="px-6 py-4 border-b-2 border-slate-300 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={20} />
                                    Test Request History
                                    {selectedDate && (
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                </h2>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCalendar(!showCalendar)}
                                        className="text-sm font-semibold text-slate-600 hover:text-blue-600 border-2 border-slate-300 px-3 py-1 rounded flex items-center gap-2"
                                    >
                                        <Calendar size={16} />
                                        Filter by Date
                                    </button>

                                    {showCalendar && (
                                        <div className="absolute right-0 top-full mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-xl z-10 p-4 min-w-[300px]">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-bold text-slate-700">Select Date</span>
                                                {selectedDate && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDate(null);
                                                            setShowCalendar(false);
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
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
                                                            className={`w-full text-left px-3 py-2 rounded border-2 transition ${isSelected
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-800'
                                                                }`}
                                                        >
                                                            <div className="font-semibold text-sm">
                                                                {new Date(date).toLocaleDateString('en-IN', {
                                                                    weekday: 'short',
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
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
                            <div className="p-12 text-center text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">
                                    {selectedDate ? 'No test requests found for this date' : 'No test requests found'}
                                </p>
                                <p className="text-xs mt-1">
                                    {selectedDate ? 'Try selecting a different date' : 'Create a new test request to get started'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y-2 divide-slate-200 max-h-[400px] overflow-y-auto">
                                {filteredRequests.map((request) => (
                                    <div key={request.id} className="p-5 hover:bg-slate-50 transition">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-sm font-bold text-blue-600">
                                                        {request.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded border-2 uppercase ${getStatusColor(request.status)}`}>
                                                        {request.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Created: {new Date(request.created_at).toLocaleDateString('en-IN', {
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
                                                className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline"
                                            >
                                                View Details
                                            </button>
                                        </div>

                                        {/* Tests in this request */}
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Tests Requested</p>
                                            <div className="flex flex-wrap gap-2">
                                                {request.order_tests?.map((item: any) => (
                                                    <span
                                                        key={item.id}
                                                        className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                                                    >
                                                        {item.tests?.name || 'Unknown Test'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Total Amount */}
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500 font-semibold">Total Amount</span>
                                                <span className="text-sm font-bold text-slate-900">₹{request.total_amount}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Test Request Details Modal */}
            {selectedRequestForModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b-2 border-slate-300 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Test Request Details</h2>
                                <p className="text-sm text-slate-500 font-mono">ID: {selectedRequestForModal.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRequestForModal(null)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Request Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-600 uppercase mb-3">Request Information</h3>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border-2 border-slate-200">
                                    <div>
                                        <span className="text-xs text-slate-500 block">Created</span>
                                        <span className="font-semibold text-slate-900">
                                            {new Date(selectedRequestForModal.created_at).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">Status</span>
                                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border-2 uppercase ${getStatusColor(selectedRequestForModal.status)}`}>
                                            {selectedRequestForModal.status}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-xs text-slate-500 block">Total Amount</span>
                                        <span className="font-bold text-lg text-slate-900">₹{selectedRequestForModal.total_amount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tests */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-600 uppercase mb-3">Tests Requested</h3>
                                <div className="border-2 border-slate-300 rounded overflow-hidden">
                                    <table className="min-w-full divide-y-2 divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase">Test Name</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedRequestForModal.order_tests?.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{item.tests?.name || 'Unknown'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs font-semibold text-slate-700 uppercase">{item.status || 'pending'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t-2 border-slate-300 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedRequestForModal(null)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
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
