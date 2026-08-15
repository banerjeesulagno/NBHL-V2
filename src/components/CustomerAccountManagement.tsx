import React, { useState } from 'react';
import { Search, Lock, User, CheckCircle, RefreshCw, UserCheck, UserX, ShieldCheck, Key, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Member } from '../types';

interface CustomerAccountManagementProps {
  members: Member[];
  onUpdateMember: (updatedMember: Member) => void;
  triggerToast: (message: string, type: 'success' | 'danger' | 'info') => void;
}

export default function CustomerAccountManagement({
  members,
  onUpdateMember,
  triggerToast
}: CustomerAccountManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Selected details form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Deleted'>('Active');

  const filteredMembers = members.filter(
    m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm)
  );

  const selectedMember = members.find(m => m.id === selectedMemberId);

  const handleSelectMember = (m: Member) => {
    setSelectedMemberId(m.id);
    setNewUsername(m.member_code);
    setNewPassword(m.password || '123456');
    setNewName(m.name);
    setStatus(m.status);
  };

  const handleQuickResetPassword = () => {
    if (!selectedMember) {
      triggerToast('Please select a customer first.', 'danger');
      return;
    }
    setNewPassword('123456');
    triggerToast('Password reset input set to default "123456". Click Save to apply.', 'info');
  };

  const handleGenerateRandomPin = () => {
    if (!selectedMember) {
      triggerToast('Please select a customer first.', 'danger');
      return;
    }
    const randPin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(randPin);
    setShowPassword(true);
    triggerToast(`Generated new 6-digit PIN: ${randPin}. Click Save to apply.`, 'info');
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      triggerToast('Please search and select a customer first.', 'danger');
      return;
    }
    if (!newUsername.trim()) {
      triggerToast('Customer Username / ID code cannot be empty.', 'danger');
      return;
    }
    if (!newName.trim()) {
      triggerToast('Customer Name cannot be empty.', 'danger');
      return;
    }
    if (!newPassword.trim()) {
      triggerToast('Password cannot be empty.', 'danger');
      return;
    }

    // Check code duplication among other members
    const isDuplicateCode = members.some(
      m => m.id !== selectedMember.id && m.member_code.toUpperCase() === newUsername.trim().toUpperCase()
    );
    if (isDuplicateCode) {
      triggerToast(`Account Code / Username "${newUsername}" is already occupied by another member.`, 'danger');
      return;
    }

    const updated: Member = {
      ...selectedMember,
      member_code: newUsername.trim(),
      name: newName.trim(),
      password: newPassword.trim(),
      status: status,
      deleted_at: status === 'Deleted' ? (selectedMember.deleted_at || new Date().toISOString()) : undefined
    };

    onUpdateMember(updated);
    triggerToast(`Customer credentials updated immediately for ${updated.name}! Password/PIN set to "${newPassword.trim()}".`, 'success');
  };

  const handleToggleStatus = (newStatus: 'Active' | 'Inactive') => {
    if (!selectedMember) return;
    setStatus(newStatus);
    const updated: Member = {
      ...selectedMember,
      status: newStatus,
      deleted_at: undefined
    };
    onUpdateMember(updated);
    triggerToast(`Account status for ${selectedMember.name} set to ${newStatus} on all devices.`, 'info');
  };

  return (
    <div className="bg-[#1F2937] rounded-xl border border-amber-500/20 shadow-xl overflow-hidden p-6 space-y-6">
      {/* CARD HEADER */}
      <div className="border-b border-gray-700 pb-4">
        <div className="flex items-center gap-2 mb-1 text-amber-400">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-amber-400 uppercase tracking-widest font-['Cinzel']">
            Admin Customer Account & Password Management
          </h3>
        </div>
        <p className="text-xs text-gray-300">
          Instant multi-device password resets, account activation, credential assignments, and member profile maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CUSTOMER SEARCH & SELECTION */}
        <div className="lg:col-span-5 space-y-3 bg-[#111827]/60 p-4 rounded-xl border border-gray-700">
          <label className="text-[11px] font-bold uppercase text-gray-300 tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-amber-400" />
            1. Search & Select Member
          </label>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by code (NBHL0001), name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#111827] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-sans"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* Members list */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-800 border border-gray-700 rounded-lg bg-[#111827]">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">No member accounts matched your query.</div>
            ) : (
              filteredMembers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMember(m)}
                  className={`w-full p-3 text-left transition flex items-center justify-between gap-2 hover:bg-gray-800/80 ${
                    selectedMemberId === m.id ? 'bg-amber-500/15 border-l-4 border-amber-500' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-amber-400">{m.member_code}</span>
                      <span className="text-xs font-semibold text-gray-200">{m.name}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{m.phone} | PIN: {m.password || '••••••'}</div>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      m.status === 'Active'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : m.status === 'Inactive'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    {m.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CREDENTIALS & PASSWORD RESET FORM */}
        <div className="lg:col-span-7 bg-[#111827]/40 p-5 rounded-xl border border-gray-700 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <span className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5 font-['Cinzel']">
              <Key className="w-4 h-4 text-amber-400" />
              2. Credentials & Password Management
            </span>

            {selectedMember && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                Selected: {selectedMember.member_code}
              </span>
            )}
          </div>

          {!selectedMember ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-[#111827]/80 rounded-lg border border-dashed border-gray-700">
              Please select a member from the left panel to modify login password, member code, or active status.
            </div>
          ) : (
            <form onSubmit={handleSaveChanges} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                    Member Code / Username ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value.toUpperCase())}
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* PASSWORD MANAGEMENT BOX */}
              <div className="p-4 bg-[#111827] rounded-xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Member Login Password / Security PIN
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateRandomPin}
                      className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-900 transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate PIN
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickResetPassword}
                      className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded hover:bg-amber-500/30 transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Default (123456)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password or PIN"
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-sm font-mono text-emerald-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">
                  Password changes take effect immediately on all devices simultaneously.
                </p>
              </div>

              {/* STATUS CONTROLS */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1.5">
                  Account Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('Active')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      status === 'Active'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow'
                        : 'bg-[#111827] text-gray-400 border-gray-700 hover:bg-gray-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Active Account
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('Inactive')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      status === 'Inactive'
                        ? 'bg-amber-950 text-amber-300 border-amber-600 shadow'
                        : 'bg-[#111827] text-gray-400 border-gray-700 hover:bg-gray-800'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5 text-amber-400" />
                    Inactive Account
                  </button>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-lg uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle className="w-4 h-4" />
                Save & Apply Credentials to Central Database
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
