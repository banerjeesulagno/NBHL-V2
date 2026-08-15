export interface Member {
  id: string;
  member_code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  joining_date: string;
  status: 'Active' | 'Inactive' | 'Deleted';
  password?: string;
  deleted_at?: string; // stored timestamp when soft deleted
}

export interface Contribution {
  id: string;
  member_id: string;
  member_code: string;
  member_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  notes: string;
  submitted_at: string;
  action_taken_by?: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  address: string;
  status: 'Active' | 'Deactivated';
  created_at: string;
  last_login?: string;
}

export interface SuperAdminProfile {
  username: string;
  passwordHash: string; // Stored password in prototype
  isDefaultPassword: boolean;
  lastLogin?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface SystemSettings {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  allowMemberRegistration: boolean;
}
