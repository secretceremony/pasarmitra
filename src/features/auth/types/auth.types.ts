export enum UserRole {
  ADMIN = 'ADMIN',
  DISTRIBUTOR = 'DISTRIBUTOR',
  UMKM = 'UMKM',
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  organization_name?: string;
  is_verified: boolean;
  verification_status?: string;
  address?: string;
  phone?: string;
  description?: string;
  is_suspended?: boolean;
  nib?: string;
  nib_url?: string;
  npwp?: string;
  npwp_url?: string;
  warehouse_permit?: string;
  warehouse_permit_url?: string;
  rejection_reason?: string;
  audit_note?: string;
  legal_info?: {
    company_name: string;
    nib: string;
    npwp: string;
    business_address: string;
    phone: string;
    submitted_at: string;
  };
  verification_notes?: string;
  business_document_url?: string;
  business_type?: string;
  business_address?: string;
  business_district?: string;
  updated_at?: string;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
}
