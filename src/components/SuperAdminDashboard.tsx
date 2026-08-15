import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Key,
  Database,
  Activity,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Sliders,
  DollarSign
} from 'lucide-react';
import { AdminAccount, Member, Contribution, SystemLog, SystemSettings, SuperAdminProfile } from '../types';
import { INITIAL_MEMBERS, INITIAL_CONTRIBUTIONS } from '../data';

interface SuperAdminDashboardProps {
  adminAccounts: AdminAccount[];
  members: Member[];
  contributions: Contribution[];
  systemLogs: SystemLog[];
  systemSettings: SystemSettings;
  superAdminProfile: SuperAdminProfile;
  onUpdateAdminAccounts: (admins: AdminAccount[]) => void;
  onUpdateMembers: (members: Member[]) => void;
  onUpdateContributions: (contribs: Contribution[]) => void;
  onUpdateSystemSettings: (settings: SystemSettings) => void;
  onUpdateSuperAdminProfile: (profile: SuperAdminProfile) => void;
  onAddSystemLog: (action: string, details: string, severity?: 'info' | 'warning' | 'danger') => void;
  triggerToast: (message: string, type: 'success' | 'danger' | 'info') => void;
}

export default function SuperAdminDashboard({
  adminAccounts,
  members,
  contributions,
  systemLogs,
  systemSettings,
  superAdminProfile,
  onUpdateAdminAccounts,
  onUpdateMembers,
  onUpdateContributions,
  onUpdateSystemSettings,
  onUpdateSuperAdminProfile,
  onAddSystemLog,
  triggerToast
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'admins' | 'members' | 'logs' | 'database' | 'settings'>('admins');

  // Admin Account creation modal / state
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminAddress, setNewAdminAddress] = useState('');

  // Password reset modal for admins
  const [resettingAdmin, setResettingAdmin] = useState<AdminAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Super Admin security credentials form
  const [currentSuperPass, setCurrentSuperPass] = useState('');
  const [newSuperUsername, setNewSuperUsername] = useState(superAdminProfile.username);
  const [newSuperPass, setNewSuperPass] = useState('');
  const [confirmSuperPass, setConfirmSuperPass] = useState('');

  // Member overrides
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // System settings state copy
  const [settingsForm, setSettingsForm] = useState<SystemSettings>(systemSettings);

  // Confirmation modal for factory wipe
  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);
  const [factoryConfirmCode, setFactoryConfirmCode] = useState('');

  // --- Handlers ---
  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      triggerToast('Username and password are required for Board Admin accounts.', 'danger');
      return;
    }

    if (adminAccounts.some(a => a.username.toLowerCase() === newAdminUsername.trim().toLowerCase())) {
      triggerToast('An admin account with this username already exists.', 'danger');
      return;
    }

    const newAdmin: AdminAccount = {
      id: `admin_${Date.now()}`,
      username: newAdminUsername.trim(),
      password: newAdminPassword.trim(),
      email: newAdminEmail.trim() || `${newAdminUsername.trim().toLowerCase()}@nbhl.com`,
      phone: newAdminPhone.trim() || '+91 90000 00000',
      address: newAdminAddress.trim() || 'NBHL Regional Office',
      status: 'Active',
      created_at: new Date().toISOString()
    };

    onUpdateAdminAccounts([...adminAccounts, newAdmin]);
    onAddSystemLog(
      'Admin Account Created',
      `Super Admin provisioned a new administrative account "${newAdmin.username}" (ID: ${newAdmin.id}).`,
      'warning'
    );
    triggerToast(`Admin account "${newAdmin.username}" created successfully.`, 'success');

    setIsAddAdminOpen(false);
    setNewAdminUsername('');
    setNewAdminPassword('');
    setNewAdminEmail('');
    setNewAdminPhone('');
    setNewAdminAddress('');
  };

  const handleToggleAdminStatus = (admin: AdminAccount) => {
    if (adminAccounts.length === 1 && admin.status === 'Active') {
      triggerToast('Cannot deactivate the sole remaining admin account.', 'danger');
      return;
    }

    const updated = adminAccounts.map(a => {
      if (a.id === admin.id) {
        const nextStatus: 'Active' | 'Deactivated' = a.status === 'Active' ? 'Deactivated' : 'Active';
        return { ...a, status: nextStatus };
      }
      return a;
    });

    onUpdateAdminAccounts(updated);
    onAddSystemLog(
      'Admin Status Toggled',
      `Super Admin changed status of "${admin.username}" to ${admin.status === 'Active' ? 'Deactivated' : 'Active'}.`,
      'warning'
    );
    triggerToast(`Admin "${admin.username}" status updated.`, 'info');
  };

  const handleDeleteAdmin = (admin: AdminAccount) => {
    if (adminAccounts.length <= 1) {
      triggerToast('At least one Board Administrator account must remain active.', 'danger');
      return;
    }

    if (!confirm(`Are you sure you want to permanently remove admin "${admin.username}"?`)) {
      return;
    }

    const updated = adminAccounts.filter(a => a.id !== admin.id);
    onUpdateAdminAccounts(updated);
    onAddSystemLog(
      'Admin Deleted',
      `Super Admin permanently deleted administrative account "${admin.username}" (ID: ${admin.id}).`,
      'danger'
    );
    triggerToast(`Admin account "${admin.username}" removed.`, 'success');
  };

  const handleResetAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingAdmin || !newPasswordInput.trim()) return;

    const updated = adminAccounts.map(a => {
      if (a.id === resettingAdmin.id) {
        return { ...a, password: newPasswordInput.trim() };
      }
      return a;
    });

    onUpdateAdminAccounts(updated);
    onAddSystemLog(
      'Admin Password Override',
      `Super Admin reset password for admin account "${resettingAdmin.username}".`,
      'warning'
    );
    triggerToast(`Password updated for "${resettingAdmin.username}".`, 'success');

    setResettingAdmin(null);
    setNewPasswordInput('');
  };

  const handleUpdateSuperCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSuperPass !== superAdminProfile.passwordHash) {
      triggerToast('Current Super Admin password key is incorrect.', 'danger');
      return;
    }

    if (newSuperPass && newSuperPass !== confirmSuperPass) {
      triggerToast('New password confirmation does not match.', 'danger');
      return;
    }

    const updated: SuperAdminProfile = {
      username: newSuperUsername.trim() || superAdminProfile.username,
      passwordHash: newSuperPass ? newSuperPass.trim() : superAdminProfile.passwordHash,
      isDefaultPassword: false,
      lastLogin: new Date().toISOString()
    };

    onUpdateSuperAdminProfile(updated);
    onAddSystemLog('Super Admin Security Updated', 'Root credentials were modified.', 'warning');
    triggerToast('Super Admin profile updated successfully.', 'success');

    setCurrentSuperPass('');
    setNewSuperPass('');
    setConfirmSuperPass('');
  };

  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSystemSettings(settingsForm);
    onAddSystemLog('System Settings Modified', 'Global company settings updated.', 'info');
    triggerToast('Global system settings saved successfully.', 'success');
  };

  const handleFactoryReset = () => {
    if (factoryConfirmCode !== 'RESET-NBHL-DATABASE') {
      triggerToast('Confirmation code mismatch. Database wipe aborted.', 'danger');
      return;
    }

    onUpdateMembers(INITIAL_MEMBERS);
    onUpdateContributions(INITIAL_CONTRIBUTIONS);
    onUpdateAdminAccounts([
      {
        id: 'admin_1',
        username: 'Prasanta',
        password: '101020',
        email: 'prasanta@nbhl.com',
        phone: '+91 90050 12345',
        address: 'NBHL Corporate HQ, Salt Lake Sector III, Kolkata, WB',
        status: 'Active',
        created_at: '2026-01-01T00:00:00Z'
      }
    ]);

    onAddSystemLog(
      'DATABASE FACTORY RESET',
      'Super Admin initiated total system wipe and restored seed data state.',
      'danger'
    );

    setIsFactoryResetModalOpen(false);
    setFactoryConfirmCode('');
    triggerToast('Database restored to initial factory seed state.', 'success');
  };

  const totalDeposits = contributions
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const activeMembersCount = members.filter(m => m.status === 'Active').length;
  const inactiveMembersCount = members.filter(m => m.status === 'Inactive').length;
  const deletedMembersCount = members.filter(m => m.status === 'Deleted').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-[#1F2937] to-amber-950/60 border border-amber-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  ROOT SYSTEM OVERVIEW
                </span>
                {superAdminProfile.isDefaultPassword && (
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 animate-pulse">
                    DEFAULT PASSWORD ACTIVE
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white tracking-wide font-['Cinzel'] mt-0.5">
                Super Admin Master Control Center
              </h1>
              <p className="text-xs text-gray-400">
                Full authority over Board Administrator accounts, direct database mutations, system audits, and registry overrides.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#111827] border border-gray-700 px-4 py-2 rounded-lg text-right">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Root Identity</span>
              <span className="text-xs font-bold text-amber-300 font-mono">{superAdminProfile.username} (Super Admin)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1F2937] border border-amber-500/20 rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            Board Admin Accounts
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-white font-mono">{adminAccounts.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">
              {adminAccounts.filter(a => a.status === 'Active').length} Active
            </span>
          </div>
        </div>

        <div className="bg-[#1F2937] border border-amber-500/20 rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            Total Members Registry
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-400 font-mono">{members.length}</span>
            <span className="text-[10px] text-gray-400 font-mono">
              {activeMembersCount}A / {inactiveMembersCount}I / {deletedMembersCount}D
            </span>
          </div>
        </div>

        <div className="bg-[#1F2937] border border-amber-500/20 rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            Total Approved Deposits
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              ₹{totalDeposits.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {contributions.filter(c => c.status === 'Approved').length} Txns
            </span>
          </div>
        </div>

        <div className="bg-[#1F2937] border border-amber-500/20 rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            System Event Logs
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-white font-mono">{systemLogs.length}</span>
            <span className="text-[10px] text-amber-400 font-bold font-mono">
              {systemLogs.filter(l => l.severity === 'danger').length} Critical
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap border-b border-gray-700 text-xs font-bold bg-[#1F2937] p-1.5 rounded-xl border border-amber-500/20 gap-1.5">
        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'admins'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Board Admins Management ({adminAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'members'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Master Member Overrides ({members.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'logs'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          System Audit Trail ({systemLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'database'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Database Backup & Factory Control
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Root Security & Settings
        </button>
      </div>

      {/* TAB 1: BOARD ADMINS MANAGEMENT */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1F2937] p-4 rounded-xl border border-gray-700">
            <div>
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide font-['Cinzel']">
                Board Administrator Directory
              </h2>
              <p className="text-xs text-gray-400">
                Provision new admin logins, toggle active authorizations, or override forgotten passwords.
              </p>
            </div>
            <button
              onClick={() => setIsAddAdminOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition shadow uppercase tracking-wide"
            >
              <Plus className="w-4 h-4" />
              Provision Board Admin
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-700 rounded-xl bg-[#1F2937]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#111827] uppercase text-[9px] tracking-widest text-amber-300 border-b border-gray-700">
                  <th className="p-3.5 font-bold">Admin ID / User</th>
                  <th className="p-3.5 font-bold">Contact Email / Phone</th>
                  <th className="p-3.5 font-bold">Current Password</th>
                  <th className="p-3.5 font-bold">Status</th>
                  <th className="p-3.5 font-bold">Created Date</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {adminAccounts.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-800/40 transition">
                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-white text-sm">{admin.username}</div>
                      <div className="text-[10px] text-gray-400">{admin.id}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-gray-200">{admin.email}</div>
                      <div className="text-amber-400 font-mono text-[11px]">{admin.phone}</div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="bg-[#111827] px-2.5 py-1 rounded text-amber-300 font-bold border border-gray-700">
                        {admin.password}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          admin.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {admin.status === 'Active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {admin.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setResettingAdmin(admin);
                          setNewPasswordInput('');
                        }}
                        className="px-2.5 py-1 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[11px] font-bold transition"
                        title="Override Password"
                      >
                        <Key className="w-3 h-3 inline mr-1" />
                        Reset Key
                      </button>

                      <button
                        onClick={() => handleToggleAdminStatus(admin)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition border ${
                          admin.status === 'Active'
                            ? 'bg-amber-950/40 text-amber-400 border-amber-800 hover:bg-amber-900/60'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                        }`}
                      >
                        {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        disabled={adminAccounts.length <= 1}
                        className="px-2 py-1 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800 rounded text-[11px] font-bold transition disabled:opacity-30"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-3 h-3 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal: Add New Admin */}
          {isAddAdminOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1F2937] border border-amber-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide font-['Cinzel'] flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    Provision Board Admin Account
                  </h3>
                  <button onClick={() => setIsAddAdminOpen(false)} className="text-gray-400 hover:text-white">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Somnath"
                      value={newAdminUsername}
                      onChange={e => setNewAdminUsername(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                      Initial Password Key *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 101020 or secret phrase"
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. somnath@nbhl.com"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 90050 99999"
                      value={newAdminPhone}
                      onChange={e => setNewAdminPhone(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                      Branch / Office Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NBHL Salt Lake Branch"
                      value={newAdminAddress}
                      onChange={e => setNewAdminAddress(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddAdminOpen(false)}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg transition uppercase tracking-wide"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Reset Admin Password */}
          {resettingAdmin && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1F2937] border border-amber-500/40 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide font-['Cinzel'] flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    Reset Admin Password
                  </h3>
                  <button onClick={() => setResettingAdmin(null)} className="text-gray-400 hover:text-white">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs text-gray-300">
                  Target Account: <strong className="text-amber-400 font-mono">{resettingAdmin.username}</strong>
                </div>

                <form onSubmit={handleResetAdminPassword} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                      New Password Key
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter new password"
                      value={newPasswordInput}
                      onChange={e => setNewPasswordInput(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResettingAdmin(null)}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg transition uppercase tracking-wide"
                    >
                      Save Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MASTER MEMBER OVERRIDES */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide font-['Cinzel']">
                Global Member Database Override
              </h2>
              <p className="text-xs text-gray-400">
                Inspect all member security codes, force-modify status, or permanently purge accounts.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-700 rounded-xl bg-[#1F2937]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#111827] uppercase text-[9px] tracking-widest text-amber-300 border-b border-gray-700">
                  <th className="p-3.5 font-bold">Member Code</th>
                  <th className="p-3.5 font-bold">Full Name</th>
                  <th className="p-3.5 font-bold">Phone / Email</th>
                  <th className="p-3.5 font-bold">Security PIN</th>
                  <th className="p-3.5 font-bold">Status</th>
                  <th className="p-3.5 font-bold text-right">Super Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-800/40 transition">
                    <td className="p-3.5 font-mono font-bold text-amber-400">{member.member_code}</td>
                    <td className="p-3.5 font-bold text-white">{member.name}</td>
                    <td className="p-3.5 text-gray-300">
                      <div>{member.phone}</div>
                      <div className="text-[10px] text-gray-400">{member.email}</div>
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">{member.password || '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          member.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : member.status === 'Inactive'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <select
                        value={member.status}
                        onChange={e => {
                          const next = e.target.value as 'Active' | 'Inactive' | 'Deleted';
                          const updated = members.map(m => (m.id === member.id ? { ...m, status: next } : m));
                          onUpdateMembers(updated);
                          onAddSystemLog(
                            'Member Status Force Changed',
                            `Super Admin forced status of ${member.member_code} (${member.name}) to ${next}.`,
                            'warning'
                          );
                          triggerToast(`Status for ${member.member_code} set to ${next}.`, 'info');
                        }}
                        className="bg-[#111827] border border-gray-700 text-[11px] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Deleted">Deleted</option>
                      </select>

                      <button
                        onClick={() => {
                          const newPin = prompt(`Enter new security PIN for ${member.name} (${member.member_code}):`, member.password || 'pin1');
                          if (newPin && newPin.trim()) {
                            const updated = members.map(m => (m.id === member.id ? { ...m, password: newPin.trim() } : m));
                            onUpdateMembers(updated);
                            onAddSystemLog(
                              'Member PIN Super Override',
                              `Super Admin modified PIN for ${member.member_code}.`,
                              'warning'
                            );
                            triggerToast(`PIN for ${member.member_code} updated.`, 'success');
                          }
                        }}
                        className="px-2 py-1 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[11px] font-bold transition"
                      >
                        Set PIN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL / SYSTEM LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide font-['Cinzel']">
                System Security & Event Log Trail
              </h2>
              <p className="text-xs text-gray-400">
                Immutable chronological recording of administrative events, logins, and overrides.
              </p>
            </div>
            <button
              onClick={() => {
                onAddSystemLog('Manual Checkpoint', 'Super Admin triggered manual audit checkpoint verification.', 'info');
                triggerToast('Audit checkpoint added.', 'info');
              }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded text-xs font-bold transition"
            >
              Add Checkpoint
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-700 rounded-xl bg-[#1F2937]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#111827] uppercase text-[9px] tracking-widest text-amber-300 border-b border-gray-700">
                  <th className="p-3 font-bold">Timestamp</th>
                  <th className="p-3 font-bold">Actor</th>
                  <th className="p-3 font-bold">Action</th>
                  <th className="p-3 font-bold">Details</th>
                  <th className="p-3 font-bold">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
                {systemLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-800/40 transition">
                    <td className="p-3 text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-amber-400">{log.actor}</td>
                    <td className="p-3 font-bold text-white">{log.action}</td>
                    <td className="p-3 text-gray-300 font-sans text-xs">{log.details}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          log.severity === 'danger'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : log.severity === 'warning'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE CONTROL & BACKUP */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1F2937] p-6 rounded-xl border border-gray-700 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-gray-700 pb-2">
              <Database className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-['Cinzel']">Database Backup & Export</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Export the full state of members, contributions, admin accounts, and system logs as JSON for cold storage.
            </p>

            <button
              onClick={() => {
                const fullPayload = {
                  exportDate: new Date().toISOString(),
                  members,
                  contributions,
                  adminAccounts,
                  systemLogs,
                  systemSettings
                };
                const blob = new Blob([JSON.stringify(fullPayload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nbhl_full_backup_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                onAddSystemLog('Database Backup Created', 'Super Admin exported system JSON snapshot.', 'info');
                triggerToast('Database snapshot exported successfully.', 'success');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-lg transition uppercase tracking-wide"
            >
              Download JSON System Snapshot
            </button>
          </div>

          <div className="bg-rose-950/20 p-6 rounded-xl border border-rose-900/60 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-rose-900 pb-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-xs uppercase tracking-wider font-['Cinzel']">Factory Reset & Seed Restore</span>
            </div>
            <p className="text-xs text-rose-200/80 leading-relaxed">
              Re-initializes all members, contributions, and logs back to default seed state. This cannot be undone.
            </p>

            <button
              onClick={() => setIsFactoryResetModalOpen(true)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg transition uppercase tracking-wide shadow"
            >
              Trigger Factory Reset Sequence...
            </button>
          </div>

          {/* Modal: Factory Reset Confirmation */}
          {isFactoryResetModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1F2937] border border-rose-600 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-gray-700 pb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span className="text-sm font-bold uppercase font-['Cinzel']">CRITICAL: Confirm Database Wipe</span>
                </div>
                <p className="text-xs text-gray-300">
                  To confirm reverting the entire system database to clean default demo records, type the confirmation phrase:
                </p>
                <div className="p-2 bg-[#111827] border border-rose-900 rounded text-rose-400 font-mono text-xs font-bold text-center">
                  RESET-NBHL-DATABASE
                </div>
                <input
                  type="text"
                  placeholder="Type exact phrase above"
                  value={factoryConfirmCode}
                  onChange={e => setFactoryConfirmCode(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-rose-500"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsFactoryResetModalOpen(false);
                      setFactoryConfirmCode('');
                    }}
                    className="flex-1 py-2 bg-gray-800 text-gray-300 font-bold rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFactoryReset}
                    disabled={factoryConfirmCode !== 'RESET-NBHL-DATABASE'}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white font-bold rounded-lg text-xs uppercase"
                  >
                    Confirm Wipe
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ROOT SECURITY & GLOBAL SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Super Admin Security */}
          <div className="bg-[#1F2937] p-6 rounded-xl border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-amber-400 border-b border-gray-700 pb-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-['Cinzel']">Super Admin Root Credentials</span>
            </div>

            <form onSubmit={handleUpdateSuperCredentials} className="space-y-3.5 text-xs text-gray-300">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
                  Super Admin Root Username
                </label>
                <input
                  type="text"
                  required
                  value={newSuperUsername}
                  onChange={e => setNewSuperUsername(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
                  Current Super Admin Password Key *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password (Default: 161020)"
                  value={currentSuperPass}
                  onChange={e => setCurrentSuperPass(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
                  New Super Admin Password Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing key"
                  value={newSuperPass}
                  onChange={e => setNewSuperPass(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {newSuperPass && (
                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
                    Confirm New Super Admin Password Key
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmSuperPass}
                    onChange={e => setConfirmSuperPass(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition uppercase tracking-wider mt-2 shadow"
              >
                Update Super Admin Credentials
              </button>
            </form>
          </div>

          {/* Global System Settings */}
          <div className="bg-[#1F2937] p-6 rounded-xl border border-gray-700 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-amber-400 border-b border-gray-700 pb-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-['Cinzel']">Company Profile & Global Settings</span>
            </div>

            <form onSubmit={handleSaveSystemSettings} className="space-y-3.5 text-xs text-gray-300">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Company Display Name</label>
                <input
                  type="text"
                  value={settingsForm.companyName}
                  onChange={e => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Official Support Email</label>
                <input
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={e => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Official Support Phone</label>
                <input
                  type="text"
                  value={settingsForm.supportPhone}
                  onChange={e => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-500/40 font-bold text-xs rounded-lg transition uppercase tracking-wider"
                >
                  Save Global System Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
