import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { createAuditLog } from '@/lib/auditLog';

// Helper to calculate Age
const getAge = (dobString: string) => {
  if (!dobString) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper to determine if result is within, below, or above range
const getResultStatus = (resultValue: string | number, referenceRange: string): 'normal' | 'low' | 'high' => {
  if (!resultValue || !referenceRange) return 'normal';

  const numericValue = typeof resultValue === 'string' ? parseFloat(resultValue) : resultValue;
  if (isNaN(numericValue)) return 'normal';

  // Parse reference range (e.g., "12-17", "<10", ">5")
  const rangeMatch = referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (numericValue < min) return 'low';
    if (numericValue > max) return 'high';
    return 'normal';
  }

  // Handle "<X" format
  const lessThanMatch = referenceRange.match(/<\s*([\d.]+)/);
  if (lessThanMatch) {
    const threshold = parseFloat(lessThanMatch[1]);
    return numericValue >= threshold ? 'high' : 'normal';
  }

  // Handle ">X" format
  const greaterThanMatch = referenceRange.match(/>\s*([\d.]+)/);
  if (greaterThanMatch) {
    const threshold = parseFloat(greaterThanMatch[1]);
    return numericValue <= threshold ? 'low' : 'normal';
  }

  return 'normal';
};

// Helper to load image for PDF (Client-side)
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Crucial for loading images from Supabase Storage
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

export const generatePDF = async (orderId: string) => {
  // CRITICAL: Log DOWNLOAD action BEFORE generating PDF (HIPAA requirement)
  await createAuditLog('DOWNLOAD', 'reports', orderId, {
    format: 'pdf'
  });
  
  // 1. Fetch All Related Data
  const orderPromise = supabase
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

  const settingsPromise = supabase
    .from('lab_settings')
    .select('*')
    .single();

  const [orderRes, settingsRes] = await Promise.all([orderPromise, settingsPromise]);

  const order = orderRes.data;
  const settings = settingsRes.data || {};

  if (orderRes.error || !order) throw new Error("Order not found");

  // Fetch test results for this order
  const orderTestIds = order.order_tests.map((ot: any) => ot.id);
  const { data: testResults, error: resultsError } = await supabase
    .from('test_results')
    .select('*')
    .in('order_test_id', orderTestIds);

  if (resultsError) {
    console.error("Error fetching test results:", resultsError);
    throw new Error("Failed to fetch test results.");
  }

  // Create a map of order_test_id to result
  const resultsMap = new Map();
  if (testResults) {
    testResults.forEach((result: any) => {
      resultsMap.set(result.order_test_id, result);
    });
  }

  // Defaults if settings are missing
  const labName = settings.lab_name || "MediLab Diagnostics";
  const labAddress = settings.address || "Address Not Configured";
  const labPhone = settings.phone || "N/A";
  const labEmail = settings.email || "contact@lab.com";

  // 2. Initialize PDF
  const doc = new jsPDF();

  // Cache the logo image
  let logoImg: HTMLImageElement | null = null;
  if (settings.logo_url) {
    try {
      logoImg = await loadImage(settings.logo_url);
    } catch (error) {
      console.warn("Could not load logo for PDF", error);
    }
  }

  // --- HEADER ---
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 14, 8, 20, 20);
  }

  // Lab name next to logo
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(labName, logoImg ? 37 : 14, 16);

  // Address on right (multi-line)
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const addressLines = labAddress.split(',').map((s: string) => s.trim());
  let addrY = 10;
  addressLines.forEach((line: string) => {
    doc.text(line, 196, addrY, { align: 'right' });
    addrY += 3.5;
  });

  // Horizontal line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(14, 30, 196, 30);

  // --- TITLE ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text("L A B O R A T O R Y   R E P O R T", 105, 38, { align: 'center' });

  // --- PATIENT INFO (DECRYPTED) ---
  const p = order.patients;
  const firstName = decryptData(p.first_name);
  const lastName = decryptData(p.last_name);
  const age = getAge(p.dob);
  const gender = p.gender || 'MALE';

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const infoY = 46;
  
  // Left column
  doc.text("Name", 14, infoY);
  doc.text(":", 28, infoY);
  doc.text(`${firstName.toUpperCase()} ${lastName.toUpperCase()}`, 31, infoY);
  
  doc.text("Age", 14, infoY + 4);
  doc.text(":", 28, infoY + 4);
  doc.text(`${age}`, 31, infoY + 4);
  
  doc.text("Sex", 14, infoY + 8);
  doc.text(":", 28, infoY + 8);
  doc.text(gender.toUpperCase(), 31, infoY + 8);
  
  doc.text("Ref.By", 14, infoY + 12);
  doc.text(":", 28, infoY + 12);
  doc.text("SELF", 31, infoY + 12);

  // Right column
  const reportDate = new Date(order.created_at);
  doc.text("Bill No", 140, infoY);
  doc.text(":", 155, infoY);
  doc.text(order.bill_no || 'PENDING', 158, infoY);
  
  doc.text("Date", 140, infoY + 4);
  doc.text(":", 155, infoY + 4);
  doc.text(reportDate.toLocaleDateString('en-GB').replace(/\//g, '-'), 158, infoY + 4);
  
  doc.text("Time", 140, infoY + 8);
  doc.text(":", 155, infoY + 8);
  doc.text(reportDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 158, infoY + 8);

  // Horizontal line after patient info
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(14, infoY + 17, 196, infoY + 17);

  // --- TEST HEADERS ---
  let currentY = infoY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TEST", 14, currentY);
  doc.text("RESULT", 105, currentY, { align: 'center' });
  doc.text("NORMAL VALUE", 196, currentY, { align: 'right' });

  // Dashed line under headers
  currentY += 2;
  (doc as any).setLineDash([1, 1]);
  doc.setLineWidth(0.2);
  doc.setDrawColor(150, 150, 150);
  doc.line(14, currentY, 196, currentY);
  (doc as any).setLineDash([]);

  // --- TEST RESULTS ---
  const completedTests = order.order_tests.filter((i: any) => i.status === 'completed');
  
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  completedTests.forEach((item: any) => {
    const testResult = resultsMap.get(item.id);
    const result = testResult?.result_value || 'N/A';
    const normalValue = `${item.tests.reference_range} ${item.tests.units}`;

    // Test name
    doc.text(item.tests.name, 14, currentY);
    
    // Result (center)
    doc.text(String(result), 105, currentY, { align: 'center' });
    
    // Normal value (right)
    doc.text(normalValue, 196, currentY, { align: 'right' });

    currentY += 6;
  });

  // Bottom line
  currentY += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);

  // --- FOOTER ---
  const footerY = 270;
  
  // Lab Technician (above line)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Lab. Technician", 14, footerY - 8);
  
  // Line above footer contact info
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 2, 196, footerY - 2);

  // Contact info at bottom
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Email: ${labEmail}`, 14, footerY + 3);
  doc.text(`Phone: ${labPhone}`, 14, footerY + 6);

  // Assured best quality (italic)
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Assured best quality", 196, footerY + 5, { align: 'right' });

  // 3. Download
  const filename = order.report_no ? `LabReport_${order.report_no}.pdf` : `LabReport_${firstName}_${lastName}.pdf`;
  doc.save(filename);
};