import { supabase } from '@/lib/supabase';
import { encryptData } from '@/lib/crypto';
import { createAuditLog } from '@/lib/auditLog';

export interface PatientInput {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  dob: string;
  gender?: string;
}

export const registerPatient = async (data: PatientInput) => {
  // 1. Get Current Staff User
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Staff session not found. Please log in again.");
  }

  // 2. Encrypt Sensitive Fields (AES-256)
  const dbPayload = {
    first_name: encryptData(data.firstName),
    last_name: encryptData(data.lastName),
    contact_number: encryptData(data.contact),
    email: data.email,
    dob: data.dob,
    gender: data.gender
  };

  // 3. Insert into Supabase
  const { data: patient, error } = await supabase
    .from('patients')
    .insert(dbPayload)
    .select()
    .single();

  if (error) {
    console.error("Supabase Write Error:", error);
    throw new Error(error.message);
  }

  // 4. Create Audit Log (HIPAA Requirement)
  await createAuditLog('CREATE', 'patients', patient.id);

  return patient;
};

export const updatePatient = async (id: string, updates: Partial<PatientInput>) => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Staff session not found. Please log in again.");
  }

  // Encrypt sensitive fields if they're being updated
  const dbPayload: any = {};

  if (updates.firstName) dbPayload.first_name = encryptData(updates.firstName);
  if (updates.lastName) dbPayload.last_name = encryptData(updates.lastName);
  if (updates.contact) dbPayload.contact_number = encryptData(updates.contact);
  if (updates.email) dbPayload.email = updates.email;
  if (updates.dob) dbPayload.dob = updates.dob;
  if (updates.gender) dbPayload.gender = updates.gender;

  const { error } = await supabase
    .from('patients')
    .update(dbPayload)
    .eq('id', id);

  if (error) {
    console.error("Patient Update Error:", error);
    throw new Error(error.message);
  }

  // Audit log - do NOT include field values
  await createAuditLog('UPDATE', 'patients', id);
};

export const archivePatient = async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Staff session not found. Please log in again.");
  }

  const { error } = await supabase
    .from('patients')
    .update({
      is_active: false,
      archived_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error("Patient Archive Error:", error);
    throw new Error(error.message);
  }

  await createAuditLog('ARCHIVE', 'patients', id);
};

export const restorePatient = async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Staff session not found. Please log in again.");
  }

  const { error } = await supabase
    .from('patients')
    .update({
      is_active: true,
      archived_at: null
    })
    .eq('id', id);

  if (error) {
    console.error("Patient Restore Error:", error);
    throw new Error(error.message);
  }

  await createAuditLog('RESTORE', 'patients', id);
};