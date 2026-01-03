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
  // 1. Fetch All Related Data (Parallel Fetching for speed)
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
  const settings = settingsRes.data || {}; // Fallback if empty

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

  // 2. Initialize PDF
  const doc = new jsPDF();

  // --- HEADER SECTION ---

  // Handle Logo (If exists)
  if (settings.logo_url) {
    try {
      const img = await loadImage(settings.logo_url);
      // Format: doc.addImage(imgData, format, x, y, width, height)
      // Placing logo at Top Left
      doc.addImage(img, 'PNG', 14, 10, 25, 25);
    } catch (error) {
      console.warn("Could not load logo for PDF", error);
    }
  }

  // Lab Details (Centered)
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(labName, 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(labAddress, 105, 26, { align: "center" });
  doc.text(`Ph: ${labPhone}`, 105, 31, { align: "center" });

  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 38, 196, 38);

  // --- PATIENT INFO (DECRYPTED) ---
  const p = order.patients;
  const firstName = decryptData(p.first_name);
  const lastName = decryptData(p.last_name);
  const age = getAge(p.dob);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // Left Column (Patient)
  const startY = 48;
  doc.text(`Patient Name:`, 14, startY);
  doc.setFont("helvetica", "bold");
  doc.text(`${firstName} ${lastName}`, 45, startY);
  doc.setFont("helvetica", "normal");

  doc.text(`Age / Gender:`, 14, startY + 7);
  doc.text(`${age} Y / Unspecified`, 45, startY + 7);

  // Right Column (Order Details)
  doc.text(`Order ID:`, 120, startY);
  doc.text(order.id.slice(0, 8).toUpperCase(), 150, startY);

  doc.text(`Date:`, 120, startY + 7);
  doc.text(new Date(order.created_at).toLocaleDateString(), 150, startY + 7);

  // --- RESULTS TABLE ---
  // Filter completed order_tests and get their results
  const completedTests = order.order_tests.filter((i: any) => i.status === 'completed');

  const tableBody = completedTests.map((item: any) => {
    // Get the result value from test_results using the map
    const testResult = resultsMap.get(item.id);
    const result = testResult?.result_value || 'N/A';

    const status = getResultStatus(result, item.tests.reference_range);

    return {
      name: item.tests.name,
      result: result,
      units: item.tests.units,
      range: item.tests.reference_range,
      flag: status === 'high' ? 'H' : status === 'low' ? 'L' : '',
      status: status // Store for color coding
    };
  });

  autoTable(doc, {
    startY: 65,
    head: [['Test Name', 'Result', 'Units', 'Ref. Range', 'Flag']],
    body: tableBody.map((row: any) => [row.name, row.result, row.units, row.range, row.flag]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }, // Blue Header
    columnStyles: {
      0: { cellWidth: 60 }, // Name
      1: { cellWidth: 30, fontStyle: 'bold' }, // Result
      4: { cellWidth: 15, fontStyle: 'bold', halign: 'center' } // Flag
    },
    // Logic to color result values based on range
    didParseCell: function (data) {
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        const status = tableBody[rowIndex]?.status;

        // Color the Result column (index 1)
        if (data.column.index === 1) {
          if (status === 'high') {
            data.cell.styles.textColor = [220, 53, 69]; // Red for above range
          } else if (status === 'low') {
            data.cell.styles.textColor = [255, 193, 7]; // Yellow for below range
          } else {
            data.cell.styles.textColor = [0, 0, 0]; // Black for normal
          }
        }

        // Color the Flag column (index 4)
        if (data.column.index === 4) {
          const flag = data.cell.raw;
          if (flag === 'H') data.cell.styles.textColor = [220, 53, 69]; // Red
          if (flag === 'L') data.cell.styles.textColor = [255, 193, 7]; // Yellow
        }
      }
    }
  });

  // --- FOOTER / SIGNATURE ---
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("*** End of Report ***", 105, finalY, { align: 'center' });

  // Receipt Information (Left Footer)
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const receiptNumber = order.id.slice(0, 8).toUpperCase();
  const paymentDate = new Date(order.created_at).toLocaleDateString('en-IN');

  doc.text(`Receipt #${receiptNumber}`, 14, finalY + 25);
  doc.text(`Date: ${paymentDate}`, 14, finalY + 31);

  // Pathologist Signature (Right Footer)
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Line for signature
  doc.setLineWidth(0.2);
  doc.line(140, finalY + 25, 190, finalY + 25);

  // Label under line
  doc.text("Pathologist Signature", 165, finalY + 30, { align: 'center' });

  // Footer Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerText = "This report is electronically generated. " + (labName ? `${labName}` : "MediLab");
  doc.text(footerText, 105, 280, { align: 'center' });

  // 3. Download
  doc.save(`LabReport_${firstName}_${lastName}.pdf`);
};