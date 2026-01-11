import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';

// Helper to load image as promise
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

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
    const labEmail = settings?.email || "contact@lab.com";

    // Initialize PDF
    const doc = new jsPDF();

    // Cache the logo image
    let logoImg: HTMLImageElement | null = null;
    if (settings?.logo_url) {
      try {
        logoImg = await loadImage(settings.logo_url);
      } catch (error) {
        console.warn("Could not load logo for receipt", error);
      }
    }

    // --- HEADER ---
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 14, 8, 20, 20);
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(labName, 37, 16);
    } else {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(labName, 14, 14);
    }

    // Address on right side
    const addressLines = labAddress.split(',').map((line: string) => line.trim());
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    let addressY = 11;
    addressLines.forEach((line: string) => {
      doc.text(line, 196, addressY, { align: 'right' });
      addressY += 3.5;
    });

    // Header line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(14, 30, 196, 30);

    // --- RECEIPT TITLE ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    const titleText = "P A Y M E N T   R E C E I P T";
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, 105 - titleWidth / 2, 38);

    // --- RECEIPT INFO ---
    const p = order.patients;
    const firstName = decryptData(p.first_name);
    const lastName = decryptData(p.last_name);

    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const infoY = 46;
    
    // Left column
    doc.text("Name", 14, infoY);
    doc.text(":", 28, infoY);
    doc.text(`${firstName.toUpperCase()} ${lastName.toUpperCase()}`, 31, infoY);
    
    doc.text("Payment", 14, infoY + 4);
    doc.text(":", 28, infoY + 4);
    doc.text(order.payment_method ? order.payment_method.toUpperCase() : 'CASH', 31, infoY + 4);

    // Right column
    const receiptDate = new Date(order.created_at);
    doc.text("Receipt No", 140, infoY);
    doc.text(":", 155, infoY);
    doc.text(order.bill_no || 'N/A', 158, infoY);
    
    doc.text("Date", 140, infoY + 4);
    doc.text(":", 155, infoY + 4);
    doc.text(receiptDate.toLocaleDateString('en-GB').replace(/\//g, '-'), 158, infoY + 4);
    
    doc.text("Time", 140, infoY + 8);
    doc.text(":", 155, infoY + 8);
    doc.text(receiptDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 158, infoY + 8);

    // Line under info
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(14, infoY + 17, 196, infoY + 17);

    // --- TESTS TABLE ---
    let currentY = infoY + 24;

    // Table headers
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text("TEST", 14, currentY);
    doc.text("AMOUNT", 196, currentY, { align: 'right' });

    // Dashed line under headers
    currentY += 2;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    (doc as any).setLineDash([1, 1]);
    doc.line(14, currentY, 196, currentY);
    (doc as any).setLineDash([]);

    // Test items
    doc.setFont("courier", "normal");
    currentY += 6;

    order.order_tests.forEach((item: any) => {
      doc.text(item.tests.name, 14, currentY);
      doc.text((item.tests.price || 0).toString(), 196, currentY, { align: 'right' });
      currentY += 6;
    });

    // Total line
    currentY += 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);

    currentY += 6;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL", 14, currentY);
    doc.text((order.total_amount || 0).toString(), 196, currentY, { align: 'right' });

    // Bottom line
    currentY += 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);

    // --- FOOTER ---
    const footerY = 270;
    
    // Line above footer
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 5, 196, footerY - 5);

    // Contact info at bottom
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Email: ${labEmail}`, 14, footerY + 3);
    doc.text(`Phone: ${labPhone}`, 14, footerY + 6);

    // Thank you message (italic)
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Thank you for your payment", 196, footerY + 5, { align: 'right' });

    // Download
    const filename = order.bill_no ? `Receipt_${order.bill_no}.pdf` : `Receipt_${order.id.slice(0, 8)}.pdf`;
    doc.save(filename);
};
