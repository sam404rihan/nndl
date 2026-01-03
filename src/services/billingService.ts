import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';

export const generateReceipt = async (orderId: string) => {
  const { data: order } = await supabase
    .from('orders')
    .select('*, patients(*), order_tests(*, tests(*))')
    .eq('id', orderId)
    .single();

  const doc = new jsPDF({ format: 'a5' }); // Smaller paper for receipt

  doc.setFontSize(16);
  doc.text("PAYMENT RECEIPT", 74, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Receipt #: ${order.id.slice(0, 8)}`, 10, 30);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 35);
  doc.text(`Patient: ${decryptData(order.patients.first_name)} ${decryptData(order.patients.last_name)}`, 10, 45);

  let y = 60;
  doc.line(10, y - 5, 138, y - 5);

  order.order_tests.forEach((item: any) => {
    doc.text(item.tests.name, 10, y);
    doc.text(`$${item.tests.price}`, 120, y);
    y += 7;
  });

  doc.line(10, y, 138, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL AMOUNT:`, 80, y);
  doc.text(`$${order.total_amount}`, 120, y);

  y += 7;
  doc.text(`AMOUNT PAID:`, 80, y);
  doc.text(`$${order.amount_paid || 0}`, 120, y);

  y += 7;
  doc.text(`BALANCE DUE:`, 80, y);
  doc.text(`$${order.total_amount - (order.amount_paid || 0)}`, 120, y);

  doc.save(`Receipt_${order.id.slice(0, 8)}.pdf`);
};