import React, { useState, useEffect } from 'react';
import { Users, Search, Edit, Trash2, RotateCcw, AlertTriangle, UserPlus, Trash, UserCheck, UserX, ShieldAlert, X, Key, Lock, CheckCircle, RefreshCw } from 'lucide-react';
import { Member } from '../types';

interface ActiveInactiveMembersRegistryProps {
  members: Member[];
  onAddMember: (member: Member) => void;
  onModifyMember: (member: Member) => void;
  onUpdateMembersList: (members: Member[]) => void;
  onEditTrigger: (member: Member) => void;
  triggerToast: (message: string, type: 'success' | 'danger' | 'info') => void;
}

export default function ActiveInactiveMembersRegistry({
  members,
  onAddMember,
  onModifyMember,
  onUpdateMembersList,
  onEditTrigger,
  triggerToast
}: ActiveInactiveMembersRegistryProps) {
  // Navigation inside Members section: 3 Separate Tabs
  const [registryTab, setRegistryTab] = useState<'active' | 'inactive' | 'deleted'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    type: 'danger' | 'warning' | 'success';
    onConfirm: () => void;
  } | null>(null);

  // Quick Password Reset Modal
  const [quickResetMember, setQuickResetMember] = useState<Member | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('123456');

  // Form Inputs for registering member
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('123456');

  // Trigger permanent deletion for deleted members older than 30 days
  useEffect(() => {
    let changed = false;
    const cleanList = members.filter(m => {
      if (m.status === 'Deleted' && m.deleted_at) {
        const delDate = new Date(m.deleted_at);
        const diffTime = new Date().getTime() - delDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 30) {
          changed = true;
          return false; // Permanently purge after 30 days
        }
      }
      return true;
    });

    if (changed) {
      onUpdateMembersList(cleanList);
    }
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      triggerToast('Name and Mobile details are required.', 'danger');
      return;
    }

    // Generate unique member code in NBHL0001 format
    let maxNum = 0;
    members.forEach(m => {
      const match = m.member_code.match(/\d+/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        const normalizedVal = parsed >= 1000 ? parsed - 1000 : parsed;
        if (normalizedVal > maxNum) maxNum = normalizedVal;
      }
    });
    const nextNum = maxNum + 1;
    const computedCode = `NBHL${String(nextNum).padStart(4, '0')}`;
    const nextIdNum = members.length > 0 ? Math.max(...members.map(m => parseInt(m.id.replace('m', '')) || 0)) + 1 : 1;

    // Verify duplication
    if (members.some(m => m.member_code.toUpperCase() === computedCode.toUpperCase())) {
      triggerToast(`Account Code duplicated! Try again.`, 'danger');
      return;
    }

    const newM: Member = {
      id: `m${nextIdNum}`,
      member_code: computedCode,
      name: regName.trim(),
      phone: regPhone.trim(),
      email: regEmail.trim() || `${regName.toLowerCase().replace(/\s+/g, '')}@nbhl.com`,
      address: regAddress.trim() || 'Kolkata, WB, India',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      password: regPassword.trim() || '123456'
    };

    onAddMember(newM);
    setRegName('');
    setRegPhone('');
    setRegEmail('');
    setRegAddress('');
    setRegPassword('123456');
    triggerToast(`New Member ${newM.name} successfully registered with Code: ${newM.member_code} & PIN: ${newM.password}!`, 'success');
  };

  const handleApplyQuickPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickResetMember || !newPasswordInput.trim()) return;

    const updated = {
      ...quickResetMember,
      password: newPasswordInput.trim()
    };
    onModifyMember(updated);
    triggerToast(`Password for ${quickResetMember.name} (${quickResetMember.member_code}) reset to "${newPasswordInput.trim()}"!`, 'success');
    setQuickResetMember(null);
  };

  // State filtering
  const activeMembers = members.filter(m => m.status === 'Active');
  const inactiveMembers = members.filter(m => m.status === 'Inactive');
  const deletedMembers = members.filter(m => m.status === 'Deleted');

  const currentList =
    registryTab === 'active' ? activeMembers : registryTab === 'inactive' ? inactiveMembers : deletedMembers;

  const filteredList = currentList.filter(
    m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. MEMBER REGISTRATION ACCORDION / FORM */}
      <div className="bg-[#1F2937] p-6 rounded-xl border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-['Cinzel']">
              Enroll New Cooperative Member
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Auto ID Sequence format: NBHL0001
          </span>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
              Member Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Mukherjee"
              value={regName}
              onChange={e => setRegName(e.target.value)}
              className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
              Mobile Contact *
            </label>
            <input
              type="text"
              required
              placeholder="+91 98765 00000"
              value={regPhone}
              onChange={e => setRegPhone(e.target.value)}
              className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
              Initial Password / PIN *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 123456"
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
              className="w-full bg-[#111827] border border-amber-500/40 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">
              Residential Address
            </label>
            <input
              type="text"
              placeholder="City, State"
              value={regAddress}
              onChange={e => setRegAddress(e.target.value)}
              className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Enroll Member
            </button>
          </div>
        </form>
      </div>

      {/* 2. REGISTRY TABLE WITH 3 TABS: ACTIVE | INACTIVE | DELETED */}
      <div className="bg-[#1F2937] rounded-xl border border-amber-500/20 shadow-xl overflow-hidden">
        {/* TAB CONTROLS HEADER */}
        <div className="p-4 border-b border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-lg border border-gray-700 text-xs font-bold">
            <button
              onClick={() => setRegistryTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                registryTab === 'active'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Active Accounts ({activeMembers.length})
            </button>

            <button
              onClick={() => setRegistryTab('inactive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                registryTab === 'inactive'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Inactive Accounts ({inactiveMembers.length})
            </button>

            <button
              onClick={() => setRegistryTab('deleted')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                registryTab === 'deleted'
                  ? 'bg-rose-700 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Deleted Recycle Bin ({deletedMembers.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search member, code, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#111827] uppercase text-[9px] tracking-widest text-amber-300 border-b border-gray-700">
                <th className="p-3 font-bold">Member Code</th>
                <th className="p-3 font-bold">Full Name</th>
                <th className="p-3 font-bold">Mobile Phone</th>
                <th className="p-3 font-bold">Current PIN / Password</th>
                <th className="p-3 font-bold">Joining Date</th>
                <th className="p-3 font-bold text-center">Status</th>
                <th className="p-3 font-bold text-center">Management Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                    No members found in {registryTab} category.
                  </td>
                </tr>
              ) : (
                filteredList.map(m => (
                  <tr key={m.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-400 text-xs">
                      {m.member_code}
                    </td>
                    <td className="p-3 font-semibold text-gray-200">
                      <div>{m.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{m.email}</div>
                    </td>
                    <td className="p-3 text-gray-300 font-mono">{m.phone}</td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>{m.password || '••••••'}</span>
                        <button
                          onClick={() => {
                            setQuickResetMember(m);
                            setNewPasswordInput('123456');
                          }}
                          title="Reset member password"
                          className="p-1 text-gray-400 hover:text-amber-400 bg-[#111827] rounded border border-gray-700 transition"
                        >
                          <Key className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-gray-400 font-mono text-[11px]">{m.joining_date}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          m.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : m.status === 'Inactive'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-rose-950 text-rose-400 border-rose-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Details */}
                        <button
                          onClick={() => onEditTrigger(m)}
                          className="p-1.5 bg-[#111827] hover:bg-gray-800 text-gray-300 hover:text-white rounded border border-gray-700 transition"
                          title="Edit member details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active/Inactive */}
                        {m.status === 'Active' && (
                          <button
                            onClick={() => {
                              onModifyMember({ ...m, status: 'Inactive' });
                              triggerToast(`Member ${m.name} marked as Inactive.`, 'info');
                            }}
                            className="p-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 rounded border border-amber-800 transition"
                            title="Deactivate account"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {m.status === 'Inactive' && (
                          <button
                            onClick={() => {
                              onModifyMember({ ...m, status: 'Active' });
                              triggerToast(`Member ${m.name} reactivated!`, 'success');
                            }}
                            className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800 transition"
                            title="Activate account"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Soft Delete */}
                        {m.status !== 'Deleted' && (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                title: 'Move Member to Deleted Recycle Bin',
                                message: `Are you sure you want to soft-delete member ${m.name} (${m.member_code})? The member can be restored within 30 days.`,
                                confirmText: 'Move to Recycle Bin',
                                type: 'danger',
                                onConfirm: () => {
                                  onModifyMember({
                                    ...m,
                                    status: 'Deleted',
                                    deleted_at: new Date().toISOString()
                                  });
                                  triggerToast(`Member ${m.name} moved to Deleted Recycle Bin.`, 'info');
                                  setConfirmDialog(null);
                                }
                              });
                            }}
                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded border border-rose-800 transition"
                            title="Soft delete member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Restore or Permanent Delete from Recycle Bin */}
                        {m.status === 'Deleted' && (
                          <>
                            <button
                              onClick={() => {
                                onModifyMember({
                                  ...m,
                                  status: 'Active',
                                  deleted_at: undefined
                                });
                                triggerToast(`Member ${m.name} restored to Active state!`, 'success');
                              }}
                              className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800 transition flex items-center gap-1"
                              title="Restore account"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold">Restore</span>
                            </button>

                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Permanent Database Purge',
                                  message: `Permanently delete member ${m.name} (${m.member_code}) from PostgreSQL database? This action is irreversible.`,
                                  confirmText: 'Permanent Delete',
                                  type: 'danger',
                                  onConfirm: () => {
                                    const purged = members.filter(item => item.id !== m.id);
                                    onUpdateMembersList(purged);
                                    triggerToast(`Member ${m.name} permanently purged from database.`, 'danger');
                                    setConfirmDialog(null);
                                  }
                                });
                              }}
                              className="p-1.5 bg-red-900 hover:bg-red-800 text-white rounded border border-red-700 transition"
                              title="Permanent purge"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PASSWORD RESET MODAL */}
      {quickResetMember && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] max-w-md w-full p-6 rounded-xl border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2 text-amber-400">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-['Cinzel']">
                  Admin Member Password Reset
                </h3>
              </div>
              <button onClick={() => setQuickResetMember(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-300 space-y-2">
              <p>
                Resetting credentials for <span className="text-white font-bold">{quickResetMember.name}</span> (
                <span className="text-amber-400 font-mono font-bold">{quickResetMember.member_code}</span>).
              </p>
              <p className="text-[10px] text-gray-400">
                New password will take effect immediately on all member devices.
              </p>
            </div>

            <form onSubmit={handleApplyQuickPasswordReset} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase text-gray-300">
                    New Security PIN / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput('123456')}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Use Default (123456)
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  className="w-full bg-[#111827] border border-amber-500/40 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuickResetMember(null)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-extrabold transition uppercase tracking-wide flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] max-w-md w-full p-6 rounded-xl border border-rose-600/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-gray-700 pb-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm uppercase tracking-wide font-['Cinzel']">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition uppercase tracking-wider"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
