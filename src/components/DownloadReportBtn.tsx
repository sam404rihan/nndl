"use client";
import { useState } from 'react';
import { generatePDF } from '@/services/reportService';
import { FileText, Loader2 } from 'lucide-react'; // Assuming you installed lucide-react

export default function DownloadReportBtn({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      await generatePDF(orderId);
    } catch (error) {
      console.error(error);
      alert("Error generating report. Ensure tests are validated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileText className="w-4 h-4" />}
      {loading ? "Generating..." : "Download PDF"}
    </button>
  );
}