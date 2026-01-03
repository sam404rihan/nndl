import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';

export const generateReceipt = async (orderId: string) => {
    // Fetch order data
    const { data: order, error } = await supabase
        .from('orders')
        .select(`
      *,
      patients (*),
      order_tests (
        *,
        tests (*)
      )
    `)
        .eq('id', orderId)
        .single();

    if (error || !order) throw new Error("Order not found");

    // Fetch lab settings
    const { data: settings } = await supabase
        .from('lab_settings')
        .select('*')
        .single();

    const labName = settings?.lab_name || "MediLab Pro";
    const labAddress = settings?.address || "123 Main St";
    const labPhone = settings?.phone || "N/A";

    // Initialize PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text(labName, 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(labAddress, 105, 28, { align: "center" });
    doc.text(`Ph: ${labPhone}`, 105, 34, { align: "center" });

    // Receipt Title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("PAYMENT RECEIPT", 105, 50, { align: "center" });

    // Horizontal line
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 55, 196, 55);

    // Patient and Receipt Info
    const p = order.patients;
    const firstName = decryptData(p.first_name);
    const lastName = decryptData(p.last_name);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const startY = 65;

    // Left column
    doc.text(`Receipt No:`, 14, startY);
    doc.setFont("helvetica", "bold");
    doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, 50, startY);
    doc.setFont("helvetica", "normal");

    doc.text(`Date:`, 14, startY + 7);
    doc.text(new Date(order.created_at).toLocaleDateString('en-IN'), 50, startY + 7);

    doc.text(`Patient Name:`, 14, startY + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`${firstName} ${lastName}`, 50, startY + 14);
    doc.setFont("helvetica", "normal");

    // Payment Method
    if (order.payment_method) {
        doc.text(`Payment Method:`, 14, startY + 21);
        doc.setFont("helvetica", "bold");
        doc.text(order.payment_method.toUpperCase(), 50, startY + 21);
        doc.setFont("helvetica", "normal");
    }

    // Tests Table
    const tableBody = order.order_tests.map((item: any) => [
        item.tests.name,
        (item.tests.price || 0).toString()
    ]);

    autoTable(doc, {
        startY: order.payment_method ? startY + 32 : startY + 25,
        head: [['Test Name', 'Price (INR)']],
        body: tableBody,
        foot: [[
            { content: 'Total Amount', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: (order.total_amount || 0).toString(), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: [41, 128, 185],
            fontSize: 11,
            fontStyle: 'bold'
        },
        footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontSize: 12
        },
        columnStyles: {
            0: { cellWidth: 140 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for choosing " + labName, 105, 280, { align: 'center' });
    doc.text("This is a computer-generated receipt", 105, 285, { align: 'center' });

    // Download
    doc.save(`Receipt_${order.id.slice(0, 8)}.pdf`);
};
