"use client";
import { useState } from 'react';
import { markOrderAsPaid, generateReceipt } from '@/services/paymentService';
import { getSettings } from '@/services/settingsService'; // We will build this next

export default function PaymentActions({ order, onUpdate }: { order: any, onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async (method: string) => {
    setLoading(true);
    await markOrderAsPaid(order.id, method);
    onUpdate(); // Refresh parent list
    setLoading(false);
  };

  const handlePrint = async () => {
    const settings = await getSettings();
    await generateReceipt(order.id, settings);
  };

  return (
    <div className="flex gap-2">
      {order.payment_status === 'paid' ? (
        <>
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-bold self-center">
            PAID ({order.payment_method})
          </span>
          <button onClick={handlePrint} className="text-xs bg-gray-800 text-white px-2 py-1 rounded">
            Receipt
          </button>
        </>
      ) : (
        <div className="flex gap-1">
          <button
            onClick={() => handlePay('Cash')}
            disabled={loading}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
          >
            Pay Cash
          </button>
          <button
            onClick={() => handlePay('Card')}
            disabled={loading}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            Pay Card
          </button>
        </div>
      )}
    </div>
  );
}