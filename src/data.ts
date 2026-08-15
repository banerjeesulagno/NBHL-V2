import { Member, Contribution } from './types';

export interface Plan {
  dailyDeposit: number;
  periodDays: number;
  totalDeposit: number;
  maturityAmount: number;
}

export const SAVINGS_PLANS: Plan[] = [
  { dailyDeposit: 25, periodDays: 365, totalDeposit: 9125, maturityAmount: 10000 },
  { dailyDeposit: 50, periodDays: 365, totalDeposit: 18250, maturityAmount: 20000 },
  { dailyDeposit: 75, periodDays: 365, totalDeposit: 27375, maturityAmount: 30000 },
  { dailyDeposit: 100, periodDays: 365, totalDeposit: 36500, maturityAmount: 40000 },
  { dailyDeposit: 200, periodDays: 365, totalDeposit: 73000, maturityAmount: 80000 }
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    member_code: 'NBHL0001',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    email: 'aarav@gmail.com',
    address: '14/B, Park Street Colony, Kolkata, WB',
    joining_date: '2026-03-10',
    status: 'Active',
    password: 'pin1'
  },
  {
    id: 'm2',
    member_code: 'NBHL0002',
    name: 'Ananya Sen',
    phone: '+91 87654 32109',
    email: 'ananya.sen@gmail.com',
    address: 'Salt Lake Sector V, Block C, Kolkata, WB',
    joining_date: '2026-02-28',
    status: 'Active',
    password: 'pin2'
  },
  {
    id: 'm3',
    member_code: 'NBHL0003',
    name: 'Joydeep Biswas',
    phone: '+91 76543 21098',
    email: 'joydeep@outlook.com',
    address: 'Garia Gardens Complex, House 4, Kolkata, WB',
    joining_date: '2026-05-15',
    status: 'Inactive',
    password: 'pin3',
    deleted_at: '2026-06-15T15:10:00Z'
  }
];

export const INITIAL_CONTRIBUTIONS: Contribution[] = [
  {
    id: 'c1',
    member_id: 'm1',
    member_code: 'NBHL0001',
    member_name: 'Aarav Sharma',
    amount: 25000,
    payment_date: '2026-03-20',
    payment_method: 'Bank Transfer',
    reference_number: 'TXN729013444',
    status: 'Approved',
    notes: 'Initial savings allocation for land development pool.',
    submitted_at: '2026-03-20T12:00:00Z',
    action_taken_by: 'NBHL Board Secretary'
  },
  {
    id: 'c2',
    member_id: 'm1',
    member_code: 'NBHL0001',
    member_name: 'Aarav Sharma',
    amount: 15000,
    payment_date: '2026-04-15',
    payment_method: 'UPI Mobile Transfer',
    reference_number: 'MB7812901',
    status: 'Approved',
    notes: 'Monthly savings pledge contribution.',
    submitted_at: '2026-04-15T15:30:00Z',
    action_taken_by: 'NBHL Board Secretary'
  },
  {
    id: 'c3',
    member_id: 'm2',
    member_code: 'NBHL0002',
    member_name: 'Ananya Sen',
    amount: 50000,
    payment_date: '2026-03-01',
    payment_method: 'Bank Transfer',
    reference_number: 'TXN619083111',
    status: 'Approved',
    notes: 'Bulk investment installment certificate.',
    submitted_at: '2026-03-01T09:15:00Z',
    action_taken_by: 'NBHL Board Secretary'
  },
  {
    id: 'c4',
    member_id: 'm2',
    member_code: 'NBHL0002',
    member_name: 'Ananya Sen',
    amount: 20000,
    payment_date: '2026-05-02',
    payment_method: 'Physical Counter Cash',
    reference_number: 'CSH100234',
    status: 'Approved',
    notes: 'Counter teller deposit receipt.',
    submitted_at: '2026-05-02T11:00:00Z',
    action_taken_by: 'NBHL Board Secretary'
  }
];
