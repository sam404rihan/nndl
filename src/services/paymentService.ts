import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { decryptData } from '@/lib/crypto';

// Mark Order as Paid
export const markOrderAsPaid = async (orderId: string, method: string) => {
  // Update order payment status
  // Note: test_results are automatically created via database trigger when order_tests are inserted
  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: method,
      status: 'registered'
    })
    .eq('id', orderId);

  if (error) throw error;
};

// Generate Receipt PDF
export const generateReceipt = async (orderId: string, settings: any) => {
  // Fetch Order Data
  const { data: order, error } = await supabase
    .from('orders')
    .select(`*, patients(*), order_tests(*, tests(*))`)
    .eq('id', orderId)
    .single();

  if (error) throw new Error("Order not found");

  const doc = new jsPDF({ format: 'a5' }); // A5 is standard for receipts

  // Header (From Settings)
  doc.setFontSize(16);
  doc.text(settings.lab_name, 74, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(settings.address, 74, 22, { align: 'center' });
  doc.text(`Ph: ${settings.phone}`, 74, 27, { align: 'center' });

  doc.line(10, 32, 138, 32);

  // Receipt Details
  doc.setFontSize(10);
  doc.text(`Receipt #: ${order.id.slice(0, 8).toUpperCase()}`, 10, 42);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, 42);

  const pName = `${decryptData(order.patients.first_name)} ${decryptData(order.patients.last_name)}`;
  doc.text(`Received from: ${pName}`, 10, 48);

  // Line Items
  const items = order.order_tests.map((item: any) => [
    item.tests.name,
    `$${item.tests.price}`
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Test Description', 'Amount']],
    body: items,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } }
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: $${order.total_amount}`, 135, finalY, { align: 'right' });

  // Status Stamp
  if (order.payment_status === 'paid') {
    doc.setTextColor(0, 150, 0);
    doc.setFontSize(14);
    doc.text("PAID", 10, finalY);
  } else {
    doc.setTextColor(200, 0, 0);
    doc.text("DUE", 10, finalY);
  }

  doc.save(`Receipt_${order.id.slice(0, 8)}.pdf`);
};