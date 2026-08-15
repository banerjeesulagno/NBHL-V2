import React, { useState } from 'react';
import { Landmark, CheckCircle, Calendar, Plus, Search, Edit2, Trash, X, Save, AlertTriangle, UserCheck } from 'lucide-react';
import { Contribution, Member } from '../types';

interface PassbookLedgerProps {
  contributions: Contribution[];
  members: Member[];
  currentMember?: Member;
  isAdmin?: boolean;
  onAddContribution: (c: Contribution) => void;
  onUpdateContributions: (cs: Contribution[]) => void;
  triggerToast: (message: string, type: 'success' | 'danger' | 'info') => void;
}

export default function PassbookLedger({
  contributions,
  members,
  currentMember,
  isAdmin = true,
  onAddContribution,
  onUpdateContributions,
  triggerToast
}: PassbookLedgerProps) {
  // Input fields for Adding Deposit
  const [recMemberId, setRecMemberId] = useState(currentMember ? currentMember.id : '');
  const [recAmount, setRecAmount] = useState('');
  const [recMethod, setRecMethod] = useState('Bank Transfer');
  const [recRef, setRecRef] = useState('');
  const [recNotes, setRecNotes] = useState('');

  // Editing state for an existing Contribution
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);

  // Custom alert/confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  // Search and Filter fields
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Rejected'>('All');

  // Filter contributions based on whether this is an individual member view or admin ledger view
  const relevantContributions = isAdmin
    ? contributions
    : currentMember
    ? contributions.filter(c => c.member_id === currentMember.id || c.member_code.toUpperCase() === currentMember.member_code.toUpperCase())
    : contributions;

  // Stats calculation
  const totalDeposited = relevantContributions
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalTransactions = relevantContributions.filter(c => c.status === 'Approved').length;

  const getLatestApprovedTx = () => {
    const list = relevantContributions.filter(c => c.status === 'Approved');
    if (list.length === 0) return null;
    return list[0];
  };

  const handleRecordCounterDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recMemberId || !recAmount || !recRef) {
      triggerToast('Select a member, amount, and reference code.', 'danger');
      return;
    }

    const matchMember = members.find(m => m.id === recMemberId) || (currentMember?.id === recMemberId ? currentMember : null);
    if (!matchMember) return;

    const duplicate = contributions.some(c => c.reference_number.toUpperCase() === recRef.trim().toUpperCase());
    if (duplicate) {
      triggerToast('Transaction receipt reference code already logged in ledger.', 'danger');
      return;
    }

    const newC: Contribution = {
      id: `c${new Date().getTime()}`,
      member_id: matchMember.id,
      member_code: matchMember.member_code,
      member_name: matchMember.name,
      amount: parseFloat(recAmount),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: recMethod,
      reference_number: recRef.toUpperCase().trim(),
      status: 'Approved',
      notes: recNotes.trim() || 'Teller counter deposit',
      submitted_at: new Date().toISOString(),
      action_taken_by: isAdmin ? 'NBHL Board Secretary' : 'Member Self-Service Submission'
    };

    onAddContribution(newC);
    setRecAmount('');
    setRecRef('');
    setRecNotes('');
    triggerToast(`Deposit of ₹${parseFloat(recAmount).toLocaleString()} recorded successfully!`, 'success');
  };

  const handleEditClick = (c: Contribution) => {
    setEditingContribution({ ...c });
  };

  const handleUpdateContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContribution) return;

    if (!editingContribution.reference_number || !editingContribution.amount) {
      triggerToast('Required fields amount and reference are missing.', 'danger');
      return;
    }

    const duplicate = contributions.some(
      c => c.id !== editingContribution.id && c.reference_number.toUpperCase() === editingContribution.reference_number.trim().toUpperCase()
    );
    if (duplicate) {
      triggerToast(`Another transaction already has reference ID "${editingContribution.reference_number}".`, 'danger');
      return;
    }

    const updatedList = contributions.map(c => (c.id === editingContribution.id ? editingContribution : c));
    onUpdateContributions(updatedList);
    setEditingContribution(null);
    triggerToast(`Transaction record modified successfully! Passbook values updated.`, 'success');
  };

  const handleDeleteContribution = (id: string, ref: string) => {
    setConfirmDialog({
      title: 'Delete Transaction Record?',
      message: `Are you sure you want to permanently delete transaction record ${ref}? This will adjust stakeholder passbooks and affect global balance values. This action cannot be undone!`,
      confirmText: 'Delete Record',
      onConfirm: () => {
        const updatedList = contributions.filter(c => c.id !== id);
        onUpdateContributions(updatedList);
        triggerToast(`Permanently deleted transaction ${ref}. Balances recalculated.`, 'danger');
        setConfirmDialog(null);
      }
    });
  };

  const filteredContributions = relevantContributions.filter(c => {
    const matchesSearch =
      c.member_name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      c.member_code.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchesStatus = ledgerStatusFilter === 'All' || c.status === ledgerStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in pb-10">
      {/* 3 STATS CARDS */}
      <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1F2937] p-5 rounded-xl border border-amber-500/20 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isAdmin ? 'Total Ledger Deposited Pool' : 'My Total Passbook Savings'}
            </span>
            <span className="text-2xl font-mono font-bold text-amber-400">₹ {totalDeposited.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-[#1F2937] p-5 rounded-xl border border-amber-500/20 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isAdmin ? 'Total Transactions Audited' : 'Verified Deposit Receipts'}
            </span>
            <span className="text-2xl font-mono font-bold text-white">{totalTransactions} Entries</span>
          </div>
        </div>

        <div className="bg-[#1F2937] p-5 rounded-xl border border-amber-500/20 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Latest Entry Details</span>
            <span
              className="text-xs font-bold text-gray-200 block mt-1 truncate max-w-[200px]"
              title={getLatestApprovedTx() ? `${getLatestApprovedTx()?.member_code} • ₹${getLatestApprovedTx()?.amount}` : ''}
            >
              {getLatestApprovedTx()
                ? `${getLatestApprovedTx()?.member_code} • ₹${getLatestApprovedTx()?.amount.toLocaleString()}`
                : 'No active records'}
            </span>
          </div>
        </div>
      </div>

      {/* LEFT COLUMN: LOG COUNTER DEPOSIT (IF ADMIN OR ALLOWED) */}
      {isAdmin && (
        <div className="xl:col-span-4 bg-[#1F2937] p-5 rounded-xl border border-amber-500/20 shadow-xl space-y-4">
          <div className="flex items-center gap-2 font-bold text-amber-400 border-b border-gray-700 pb-2 mb-2">
            <Plus className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase tracking-widest font-['Cinzel']">Add / Log Counter Deposit</span>
          </div>

          <form onSubmit={handleRecordCounterDeposit} className="space-y-3.5 text-xs text-gray-300">
            <div>
              <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Select Member Account *</label>
              <select
                required
                value={recMemberId}
                onChange={e => setRecMemberId(e.target.value)}
                className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Choose Active Depositor --</option>
                {members.filter(m => m.status === 'Active').map(m => (
                  <option key={m.id} value={m.id} className="bg-[#111827]">
                    {m.member_code} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Amount"
                  value={recAmount}
                  onChange={e => setRecAmount(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-amber-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Receipt Ref ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI8129"
                  value={recRef}
                  onChange={e => setRecRef(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Payment Channel / Route</label>
              <select
                value={recMethod}
                onChange={e => setRecMethod(e.target.value)}
                className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Bank Transfer">Direct Bank Transfer</option>
                <option value="Physical Counter Cash">Physical Counter Cash</option>
                <option value="UPI Mobile Transfer">UPI Mobile Transfer</option>
                <option value="Cheque Deposit">Cheque Deposit</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Deposit Memo / Notes</label>
              <textarea
                rows={2}
                value={recNotes}
                onChange={e => setRecNotes(e.target.value)}
                placeholder="Optional notes or plan specification..."
                className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition uppercase tracking-wider shadow"
            >
              Post Deposit to Central Ledger
            </button>
          </form>
        </div>
      )}

      {/* RIGHT/FULL COLUMN: PASSBOOK STATEMENT TABLE */}
      <div className={`${isAdmin ? 'xl:col-span-8' : 'xl:col-span-12'} bg-[#1F2937] rounded-xl border border-amber-500/20 shadow-xl overflow-hidden`}>
        {/* Table Search & Filter Bar */}
        <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1F2937]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-['Cinzel']">
              {isAdmin ? 'Centralized Passbook Ledger Entries' : `Statement for ${currentMember?.name} (${currentMember?.member_code})`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <input
                type="text"
                placeholder="Search txn ref, name..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                className="w-full bg-[#111827] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={ledgerStatusFilter}
              onChange={e => setLedgerStatusFilter(e.target.value as any)}
              className="bg-[#111827] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="All">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#111827] uppercase text-[9px] tracking-widest text-amber-300 border-b border-gray-700">
                <th className="p-3 font-bold">Txn Date</th>
                {isAdmin && <th className="p-3 font-bold">Member Details</th>}
                <th className="p-3 font-bold">Receipt / Ref Code</th>
                <th className="p-3 font-bold">Payment Method</th>
                <th className="p-3 font-bold text-right">Amount (₹)</th>
                <th className="p-3 font-bold text-center">Status</th>
                {isAdmin && <th className="p-3 font-bold text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
              {filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="p-8 text-center text-gray-400 italic">
                    No passbook deposit entries matched your filter.
                  </td>
                </tr>
              ) : (
                filteredContributions.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/40 transition">
                    <td className="p-3 text-gray-400 whitespace-nowrap">{c.payment_date}</td>
                    {isAdmin && (
                      <td className="p-3">
                        <span className="font-bold text-amber-400">{c.member_code}</span>
                        <div className="text-gray-300 font-sans text-xs">{c.member_name}</div>
                      </td>
                    )}
                    <td className="p-3 text-white font-bold">{c.reference_number}</td>
                    <td className="p-3 text-gray-300 font-sans text-xs">{c.payment_method}</td>
                    <td className="p-3 text-right font-bold text-emerald-400 text-xs">
                      ₹ {c.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          c.status === 'Approved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : c.status === 'Pending'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(c)}
                            className="p-1 bg-[#111827] text-gray-300 hover:text-white rounded border border-gray-700"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteContribution(c.id, c.reference_number)}
                            className="p-1 bg-rose-950/60 text-rose-400 hover:text-rose-300 rounded border border-rose-800"
                            title="Delete transaction"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingContribution && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] max-w-md w-full p-6 rounded-xl border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2 text-amber-400">
              <h3 className="text-sm font-bold uppercase tracking-wider font-['Cinzel']">
                Modify Deposit Transaction
              </h3>
              <button onClick={() => setEditingContribution(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateContribution} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Receipt Ref ID</label>
                <input
                  type="text"
                  required
                  value={editingContribution.reference_number}
                  onChange={e =>
                    setEditingContribution({ ...editingContribution, reference_number: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Deposit Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingContribution.amount}
                  onChange={e =>
                    setEditingContribution({ ...editingContribution, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase block mb-1">Status</label>
                <select
                  value={editingContribution.status}
                  onChange={e =>
                    setEditingContribution({ ...editingContribution, status: e.target.value as any })
                  }
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingContribution(null)}
                  className="flex-1 py-2 bg-gray-800 text-gray-300 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 text-slate-950 font-extrabold rounded-lg uppercase tracking-wide"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] max-w-md w-full p-6 rounded-xl border border-rose-600/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-gray-700 pb-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm uppercase font-['Cinzel']">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-gray-300">{confirmDialog.message}</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 bg-gray-800 text-gray-300 font-bold rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs uppercase"
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
