export interface Patient {
  id?: string;
  firstName: string; // Encrypted
  lastName: string;  // Encrypted
  dob: string;
  contactNumber: string; // Encrypted
  email: string;
  createdAt: Date;
}

export interface AuditLog {
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  collection: string;
  documentId: string;
  performedBy: string;
  timestamp: any;
}

export interface LabReportData {
  labName: string;
  labAddress: string;
  labPhone: string;
  labEmail: string;
  logoSrc?: string;
  
  billNo: string;
  patientName: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  referredBy: string;
  date: string;
  time: string;
  
  // Random Blood Sugar
  rbs: number;
  rbsNormalRange?: string;
  
  // Lipid Profile
  totalCholesterol: number;
  hdl: number;
  ldl: number;
  vldl: number;
  triglycerides: number;
  
  // Footer
  technician: string;
  consultantBiochemist: string;
}