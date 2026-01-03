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