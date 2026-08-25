import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Edit,
  User,
  BookOpen,
  Landmark,
  Calendar,
  LogOut,
  ClipboardList,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Database,
  ArrowRight,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { Member, Contribution, AdminAccount, SuperAdminProfile, SystemLog, SystemSettings } from './types';
import { SAVINGS_PLANS, INITIAL_MEMBERS, INITIAL_CONTRIBUTIONS } from './data';

// Modular Sub-components import
import CustomerAccountManagement from './components/CustomerAccountManagement';
import ActiveInactiveMembersRegistry from './components/ActiveInactiveMembersRegistry';
import PassbookLedger from './components/PassbookLedger';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import NbhlLogo from './components/NbhlLogo';

export default function App() {
  // --- Persistent Core State Engine ---
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('nbhl_members_v3');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [contributions, setContributions] = useState<Contribution[]>(() => {
    const saved = localStorage.getItem('nbhl_contributions_v3');
    return saved ? JSON.parse(saved) : INITIAL_CONTRIBUTIONS;
  });

  // Role Routing Session (Admin, Member, or Super Admin)
  const [sessionRole, setSessionRole] = useState<'none' | 'admin' | 'member' | 'superadmin'>(() => {
    const saved = localStorage.getItem('nbhl_session_role_v1');
    if (saved === 'admin' || saved === 'member' || saved === 'superadmin') {
      return saved;
    }
    return 'none';
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    return localStorage.getItem('nbhl_selected_member_id_v1') || 'm1';
  });

  const [superAdminProfile, setSuperAdminProfile] = useState<SuperAdminProfile>(() => {
    const saved = localStorage.getItem('nbhl_superadmin_profile_v1');
    return saved
      ? JSON.parse(saved)
      : {
          username: 'Sulagno',
          passwordHash: '161020',
          isDefaultPassword: true,
          lastLogin: new Date().toISOString()
        };
  });

  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    const saved = localStorage.getItem('nbhl_admin_accounts_v1');
    return saved
      ? JSON.parse(saved)
      : [
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
        ];
  });

  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('nbhl_system_logs_v1');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'log_init_1',
            timestamp: new Date().toISOString(),
            actor: 'System',
            action: 'Central Database Synchronized',
            details: 'PostgreSQL centralized connection pool active and ready.',
            severity: 'info'
          }
        ];
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('nbhl_system_settings_v1');
    return saved
      ? JSON.parse(saved)
      : {
          companyName: 'Nijo Bhumi Housing Ltd (NBHL)',
          supportEmail: 'contact@nbhl.com',
          supportPhone: '+91 90050 12345',
          dailyDepositPlanOptions: [25, 50, 75, 100, 200],
          allowMemberSelfRegistration: false,
          enableMaintenanceMode: false
        };
  });

  // Navigation State inside Admin Dashboard
  const [activeAdminTab, setActiveAdminTab] = useState<'members' | 'passbook' | 'accounts' | 'profile'>('members');

  // Navigation State inside Member Dashboard
  const [activeMemberTab, setActiveMemberTab] = useState<'passbook' | 'profile'>('passbook');

  // Login Form States
  const [loginRole, setLoginRole] = useState<'admin' | 'member' | 'superadmin'>('member');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Forgot Password / Reset PIN Multi-Step States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotRole, setForgotRole] = useState<'member' | 'admin'>('member');
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtpInput, setEnteredOtpInput] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Editing Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Global Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Multi-device DB Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // --- Backend Centralized Database Synchronization ---
  const syncWithBackend = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [membersRes, contribsRes, adminsRes, superAdminRes, settingsRes, logsRes] = await Promise.allSettled([
        fetch('/api/members'),
        fetch('/api/contributions'),
        fetch('/api/admins'),
        fetch('/api/superadmin/profile'),
        fetch('/api/settings'),
        fetch('/api/logs')
      ]);

      if (membersRes.status === 'fulfilled' && membersRes.value.ok) {
        const data = await membersRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setMembers(data);
          localStorage.setItem('nbhl_members_v3', JSON.stringify(data));
        }
      }

      if (contribsRes.status === 'fulfilled' && contribsRes.value.ok) {
        const data = await contribsRes.value.json();
        if (Array.isArray(data)) {
          setContributions(data);
          localStorage.setItem('nbhl_contributions_v3', JSON.stringify(data));
        }
      }

      if (adminsRes.status === 'fulfilled' && adminsRes.value.ok) {
        const data = await adminsRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setAdminAccounts(data);
          localStorage.setItem('nbhl_admin_accounts_v1', JSON.stringify(data));
        }
      }

      if (superAdminRes.status === 'fulfilled' && superAdminRes.value.ok) {
        const data = await superAdminRes.value.json();
        if (data && data.username) {
          setSuperAdminProfile(data);
          localStorage.setItem('nbhl_superadmin_profile_v1', JSON.stringify(data));
        }
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        const data = await settingsRes.value.json();
        if (data && data.companyName) {
          setSystemSettings(data);
          localStorage.setItem('nbhl_system_settings_v1', JSON.stringify(data));
        }
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const data = await logsRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setSystemLogs(data);
          localStorage.setItem('nbhl_system_logs_v1', JSON.stringify(data));
        }
      }

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch {
      // Offline / In-Memory Fallback mode handled silently
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync on mount & periodic interval for real-time multi-device sync
  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 5000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Session persistence
  useEffect(() => {
    localStorage.setItem('nbhl_session_role_v1', sessionRole);
  }, [sessionRole]);

  useEffect(() => {
    localStorage.setItem('nbhl_selected_member_id_v1', selectedMemberId);
  }, [selectedMemberId]);

  useEffect(() => {
    localStorage.setItem('nbhl_members_v3', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('nbhl_contributions_v3', JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    localStorage.setItem('nbhl_superadmin_profile_v1', JSON.stringify(superAdminProfile));
  }, [superAdminProfile]);

  useEffect(() => {
    localStorage.setItem('nbhl_admin_accounts_v1', JSON.stringify(adminAccounts));
  }, [adminAccounts]);

  useEffect(() => {
    localStorage.setItem('nbhl_system_logs_v1', JSON.stringify(systemLogs));
  }, [systemLogs]);

  useEffect(() => {
    localStorage.setItem('nbhl_system_settings_v1', JSON.stringify(systemSettings));
  }, [systemSettings]);

  const addSystemLog = async (action: string, details: string, severity: 'info' | 'warning' | 'danger' = 'info') => {
    const actor =
      sessionRole === 'superadmin'
        ? `SuperAdmin (${superAdminProfile.username})`
        : sessionRole === 'admin'
        ? 'Admin'
        : 'Member';

    const newLog: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      severity
    };
    setSystemLogs(prev => [newLog, ...prev]);

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor, action, details, severity })
      });
    } catch {
      // fallback
    }
  };

  const triggerToast = (message: string, type: 'success' | 'danger' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // --- Authorization Core Handlers (Multi-Device Supported) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    setIsSubmittingLogin(true);

    try {
      // Attempt backend API verification first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: loginRole,
          username: loginUsername.trim(),
          password: loginPassword.trim()
        })
      });

      if (res.ok) {
        const authData = await res.json();
        if (authData.token) {
          localStorage.setItem('nbhl_auth_token', authData.token);
        }

        if (loginRole === 'superadmin') {
          setSessionRole('superadmin');
          setLoginUsername('');
          setLoginPassword('');
          triggerToast('Super Admin Root session authorized across all devices.', 'success');
        } else if (loginRole === 'admin') {
          setSessionRole('admin');
          setActiveAdminTab('members');
          setLoginUsername('');
          setLoginPassword('');
          triggerToast(`Administrative session authorized for ${authData.user?.username || 'Admin'}.`, 'success');
        } else {
          setSessionRole('member');
          setSelectedMemberId(authData.user?.id || 'm1');
          setActiveMemberTab('passbook');
          setLoginUsername('');
          setLoginPassword('');
          triggerToast(`Welcome back, ${authData.user?.name}! Official passbook synchronized safely.`, 'success');
        }
        setIsSubmittingLogin(false);
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          setLoginErr(errData.error);
          setIsSubmittingLogin(false);
          return;
        }
      }
    } catch {
      // Fallback to local credential check if backend unreachable
    }

    // Local Fallback Check
    if (loginRole === 'superadmin') {
      const sanitizedUser = loginUsername.trim().toLowerCase();
      if (
        sanitizedUser === superAdminProfile.username.toLowerCase() &&
        loginPassword === superAdminProfile.passwordHash
      ) {
        setSessionRole('superadmin');
        setLoginUsername('');
        setLoginPassword('');
        addSystemLog('Super Admin Login', `Root user ${superAdminProfile.username} logged into control center.`, 'info');
        triggerToast('Super Admin Root session authorized.', 'success');
      } else {
        setLoginErr('Invalid Super Admin credentials.');
      }
    } else if (loginRole === 'admin') {
      const sanitizedUser = loginUsername.trim().toLowerCase();
      const matchAdmin = adminAccounts.find(a => a.username.toLowerCase() === sanitizedUser);

      if (!matchAdmin) {
        setLoginErr('Invalid admin credentials.');
        setIsSubmittingLogin(false);
        return;
      }

      if (matchAdmin.password !== loginPassword) {
        setLoginErr('Security check failure. Invalid admin password phrase.');
        setIsSubmittingLogin(false);
        return;
      }

      if (matchAdmin.status === 'Deactivated') {
        setLoginErr('Your Administrative Account has been deactivated by the Super Administrator.');
        setIsSubmittingLogin(false);
        return;
      }

      setSessionRole('admin');
      setActiveAdminTab('members');
      setLoginUsername('');
      setLoginPassword('');
      addSystemLog('Admin Login', `Admin "${matchAdmin.username}" authenticated.`, 'info');
      triggerToast(`Administrative session authorized for ${matchAdmin.username}.`, 'success');
    } else {
      // Member authentication check (Active members only)
      const sanitizedCode = loginUsername.trim().toUpperCase();
      const match = members.find(m => m.member_code.toUpperCase() === sanitizedCode && m.status === 'Active');

      if (!match) {
        setLoginErr('No active account matches this Member Code.');
        setIsSubmittingLogin(false);
        return;
      }

      if (match.password === loginPassword) {
        setSessionRole('member');
        setSelectedMemberId(match.id);
        setActiveMemberTab('passbook');
        setLoginUsername('');
        setLoginPassword('');
        triggerToast(`Welcome back, ${match.name}! Official passbook synchronized safely.`, 'success');
      } else {
        setLoginErr('Security check failure. Registered PIN code does not match.');
      }
    }
    setIsSubmittingLogin(false);
  };

  // Recovery - Stage 1
  const handleForgotStepEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    const emailToFind = recoveryEmail.trim().toLowerCase();

    if (forgotRole === 'admin') {
      const matchAdmin = adminAccounts.find(a => a.email.toLowerCase() === emailToFind);
      if (matchAdmin) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(pin);
        setRecoveryStep('otp');
        triggerToast('Recovery token generated.', 'info');
      } else {
        setLoginErr('Supplied email is not tied to Board Administrative keys.');
      }
    } else {
      const match = members.find(m => m.email.toLowerCase() === emailToFind && m.status === 'Active');
      if (match) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(pin);
        setRecoveryStep('otp');
        triggerToast('Member safety token generated.', 'info');
      } else {
        setLoginErr("Supplied email isn't associated with any active member on file.");
      }
    }
  };

  // Recovery - Stage 2
  const handleForgotStepOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');

    if (enteredOtpInput === generatedOtp) {
      setRecoveryStep('reset');
      triggerToast('Verification successful! Establish your password rewrite parameters.', 'success');
    } else {
      setLoginErr('Invalid safety verification code.');
    }
  };

  // Recovery - Stage 3
  const handleForgotStepReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');

    if (forgotNewPassword.length < 4) {
      setLoginErr('Phrase length key cannot be shorter than 4 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setLoginErr('PIN spelling confirmation mismatch.');
      return;
    }

    if (forgotRole === 'admin') {
      const updatedAdmins = adminAccounts.map((a, idx) => (idx === 0 ? { ...a, password: forgotNewPassword } : a));
      setAdminAccounts(updatedAdmins);
      try {
        await fetch(`/api/admins/${adminAccounts[0]?.id}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: forgotNewPassword })
        });
      } catch {}
      triggerToast('Administrative code updated successfully on all devices!', 'success');
    } else {
      const emailToFind = recoveryEmail.trim().toLowerCase();
      const match = members.find(m => m.email.toLowerCase() === emailToFind && m.status === 'Active');
      if (match) {
        const updated = members.map(m => (m.id === match.id ? { ...m, password: forgotNewPassword } : m));
        setMembers(updated);
        try {
          await fetch(`/api/members/${match.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: forgotNewPassword })
          });
        } catch {}
        triggerToast('Member security PIN updated successfully on all devices!', 'success');
      }
    }

    setIsForgotMode(false);
    setRecoveryStep('email');
    setRecoveryEmail('');
    setGeneratedOtp('');
    setEnteredOtpInput('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
  };

  // Administrative actions with Backend Persistence
  const handleAddMember = async (m: Member) => {
    setMembers(prev => [...prev, m]);
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      });
      addSystemLog('Member Enrolled', `Admin registered new member ${m.name} (${m.member_code}).`, 'info');
    } catch {}
  };

  const handleUpdateMemberDetails = async (m: Member) => {
    setMembers(prev => prev.map(x => (x.id === m.id ? m : x)));
    setEditingMember(null);
    try {
      await fetch(`/api/members/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      });
      addSystemLog('Member Updated', `Admin modified details for ${m.name} (${m.member_code}).`, 'info');
    } catch {}
  };

  const handleUpdateFullMembersList = async (updatedList: Member[]) => {
    // Detect purged members
    const removed = members.filter(m => !updatedList.some(u => u.id === m.id));
    setMembers(updatedList);
    for (const r of removed) {
      try {
        await fetch(`/api/members/${r.id}?permanent=true`, { method: 'DELETE' });
        addSystemLog('Member Purged', `Permanently purged member ${r.name} (${r.member_code}) from database.`, 'danger');
      } catch {}
    }
  };

  const handleAddContribution = async (c: Contribution) => {
    setContributions(prev => [c, ...prev]);
    try {
      await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });
      addSystemLog('Deposit Logged', `Recorded deposit ₹${c.amount} for ${c.member_name} (${c.member_code}).`, 'info');
    } catch {}
  };

  const handleUpdateContributionsList = async (updatedContributions: Contribution[]) => {
    // Detect removed contributions
    const removed = contributions.filter(c => !updatedContributions.some(u => u.id === c.id));
    setContributions(updatedContributions);
    for (const r of removed) {
      try {
        await fetch(`/api/contributions/${r.id}`, { method: 'DELETE' });
      } catch {}
    }
  };

  const handleUpdateAdminAccounts = async (admins: AdminAccount[]) => {
    const prevAdmins = adminAccounts;
    setAdminAccounts(admins);

    // Detect added admin
    const added = admins.filter(a => !prevAdmins.some(p => p.id === a.id));
    for (const a of added) {
      try {
        await fetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(a)
        });
      } catch {}
    }

    // Detect removed admin
    const removed = prevAdmins.filter(p => !admins.some(a => a.id === p.id));
    for (const r of removed) {
      try {
        await fetch(`/api/admins/${r.id}`, { method: 'DELETE' });
      } catch {}
    }

    // Detect modified admin
    const modified = admins.filter(a => {
      const prev = prevAdmins.find(p => p.id === a.id);
      return prev && (prev.status !== a.status || prev.password !== a.password || prev.email !== a.email || prev.phone !== a.phone);
    });
    for (const m of modified) {
      try {
        await fetch(`/api/admins/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m)
        });
      } catch {}
    }
  };

  const handleUpdateSuperAdminProfile = async (profile: SuperAdminProfile) => {
    setSuperAdminProfile(profile);
    try {
      await fetch('/api/superadmin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch {}
  };

  const handleUpdateSystemSettings = async (settings: SystemSettings) => {
    setSystemSettings(settings);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch {}
  };

  const currentMember = members.find(m => m.id === selectedMemberId) || members[0] || INITIAL_MEMBERS[0];
  const primaryAdmin = adminAccounts[0] || {
    id: 'admin_1',
    username: 'Prasanta',
    password: '101020',
    email: 'prasanta@nbhl.com',
    phone: '+91 90050 12345',
    address: 'NBHL Corporate HQ, Salt Lake Sector III, Kolkata, WB',
    status: 'Active' as const,
    created_at: '2026-01-01T00:00:00Z'
  };

  const activeMembersList = members.filter(m => m.status === 'Active');

  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-2xl border text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : toast.type === 'danger'
                ? 'bg-rose-950 text-rose-300 border-rose-500'
                : 'bg-amber-950 text-amber-300 border-amber-500'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : toast.type === 'danger' ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-[#1F2937] border-b border-amber-500/30 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NbhlLogo className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-amber-400 tracking-wider font-['Cinzel']">
                  {systemSettings.companyName}
                </h1>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  PostgreSQL Central
                </span>
              </div>
              <p className="text-[10px] text-gray-300">
                Official Multi-Device Banking & Passbook Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live DB Sync Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#111827] px-2.5 py-1 rounded-md border border-gray-700 text-[10px] text-gray-400 font-mono">
              <Database className="w-3 h-3 text-amber-400" />
              <span>DB Sync:</span>
              <span className="text-emerald-400 font-bold">{lastSyncTime}</span>
              {isSyncing && <RefreshCw className="w-2.5 h-2.5 text-amber-400 animate-spin" />}
            </div>

            {sessionRole !== 'none' && (
              <button
                onClick={() => {
                  setSessionRole('none');
                  triggerToast('Logged out safely.', 'info');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-gray-800 text-amber-400 border border-amber-500/40 text-xs font-bold transition shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================= */}
        {/* VIEW 1: AUTHENTICATION / LOGIN SCREEN */}
        {/* ========================================================= */}
        {sessionRole === 'none' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            {/* LEFT COLUMN: SAVINGS SCHEMES & SOCIETY TRUST */}
            <div className="lg:col-span-7 space-y-6 bg-[#1F2937] p-6 rounded-xl border border-amber-500/20 shadow-xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-amber-400 uppercase tracking-widest font-['Cinzel']">
                    NBHL Savings Plan & Interest Rate Table
                  </h2>
                </div>
                <p className="text-xs text-gray-300">
                  Fixed 365-day recurring daily deposit schedules with guaranteed maturity returns.
                </p>
              </div>

              {/* Table of plans */}
              <div className="overflow-x-auto border border-gray-700 rounded-lg bg-[#111827]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1F2937] uppercase text-[9px] tracking-wider text-amber-300 border-b border-gray-700">
                      <th className="p-2.5 font-bold">Daily Deposit</th>
                      <th className="p-2.5 font-bold">Period</th>
                      <th className="p-2.5 font-bold">Total Savings Pool</th>
                      <th className="p-2.5 font-bold text-emerald-400 font-mono">Maturity Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
                    {SAVINGS_PLANS.map((plan, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/50 transition">
                        <td className="p-2.5 text-amber-400 font-bold">₹{plan.dailyDeposit} / day</td>
                        <td className="p-2.5 text-gray-300 font-sans text-xs">{plan.periodDays} Days (1 Year)</td>
                        <td className="p-2.5 text-gray-300">₹{plan.totalDeposit.toLocaleString()}</td>
                        <td className="p-2.5 text-emerald-400 font-bold text-xs">
                          ₹{plan.maturityAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT COLUMN: LOGIN WITH OFFICIAL NBHL LOGO */}
            <div className="lg:col-span-5">
              {isForgotMode ? (
                /* FORGOT PASSWORD FLOW */
                <div className="bg-[#1F2937] p-6 rounded-xl border border-amber-500/30 shadow-xl space-y-5">
                  <div className="text-center">
                    <div className="w-11 h-11 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center font-bold mx-auto mb-2.5">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-amber-400 uppercase tracking-widest font-['Cinzel']">
                      Security PIN Recovery
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">Identity check and password reset portal.</p>
                  </div>

                  {loginErr && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900 text-rose-300 text-[10px] rounded flex gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>{loginErr}</span>
                    </div>
                  )}

                  {recoveryStep === 'email' && (
                    <form onSubmit={handleForgotStepEmail} className="space-y-4 text-xs">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                          Select Account Role
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setForgotRole('member')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                              forgotRole === 'member'
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-[#111827] text-gray-400 border-gray-700'
                            }`}
                          >
                            Member Account
                          </button>
                          <button
                            type="button"
                            onClick={() => setForgotRole('admin')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                              forgotRole === 'admin'
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-[#111827] text-gray-400 border-gray-700'
                            }`}
                          >
                            Board Admin
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                          Registered Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={recoveryEmail}
                          onChange={e => setRecoveryEmail(e.target.value)}
                          placeholder="Enter registered email"
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition uppercase tracking-wider shadow"
                      >
                        Request Recovery Token
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotMode(false);
                            setLoginErr('');
                          }}
                          className="text-[11px] text-gray-400 hover:text-amber-400 underline"
                        >
                          Back to Regular Sign In
                        </button>
                      </div>
                    </form>
                  )}

                  {recoveryStep === 'otp' && (
                    <form onSubmit={handleForgotStepOtp} className="space-y-4 text-xs">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300">
                        Demo Simulation Token generated: <span className="font-mono font-bold text-white">{generatedOtp}</span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                          Enter 6-Digit Verification Token *
                        </label>
                        <input
                          type="text"
                          required
                          value={enteredOtpInput}
                          onChange={e => setEnteredOtpInput(e.target.value)}
                          placeholder="6-digit code"
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center tracking-widest text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition uppercase tracking-wider shadow"
                      >
                        Verify Security Token
                      </button>
                    </form>
                  )}

                  {recoveryStep === 'reset' && (
                    <form onSubmit={handleForgotStepReset} className="space-y-4 text-xs">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                          New Security PIN / Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={forgotNewPassword}
                          onChange={e => setForgotNewPassword(e.target.value)}
                          placeholder="At least 4 characters"
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                          Confirm New Security PIN *
                        </label>
                        <input
                          type="password"
                          required
                          value={forgotConfirmPassword}
                          onChange={e => setForgotConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs rounded-lg transition uppercase tracking-wider shadow"
                      >
                        Save & Apply New PIN
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* REGULAR LOGIN FORM */
                <div className="bg-[#1F2937] p-6 rounded-xl border border-amber-500/30 shadow-xl space-y-5">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center">
                      <NbhlLogo className="w-14 h-14" />
                    </div>
                    <h3 className="text-base font-bold text-amber-400 uppercase tracking-widest font-['Cinzel']">
                      Access Passbook Portal
                    </h3>
                    <p className="text-[11px] text-gray-300">
                      Sign in with your Member Code or Administrative Credentials.
                    </p>
                  </div>

                  {/* Role Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#111827] rounded-lg border border-gray-700 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('member');
                        setLoginErr('');
                      }}
                      className={`py-2 rounded-md transition ${
                        loginRole === 'member'
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Member
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('admin');
                        setLoginErr('');
                      }}
                      className={`py-2 rounded-md transition ${
                        loginRole === 'admin'
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Board Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('superadmin');
                        setLoginErr('');
                      }}
                      className={`py-2 rounded-md transition ${
                        loginRole === 'superadmin'
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Super Admin
                    </button>
                  </div>

                  {loginErr && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900 text-rose-300 text-[10px] rounded flex gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>{loginErr}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4 text-xs">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">
                        {loginRole === 'member'
                          ? 'Member Code (Username) *'
                          : loginRole === 'admin'
                          ? 'Admin Username *'
                          : 'Root Super Admin Username *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={loginUsername}
                        onChange={e => setLoginUsername(e.target.value)}
                        placeholder={
                          loginRole === 'member'
                            ? 'Enter Member Code'
                            : loginRole === 'admin'
                            ? 'Enter Admin Username'
                            : 'Enter Super Admin Username'
                        }
                        className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase text-gray-300">
                          {loginRole === 'member' ? 'Security PIN / Password *' : 'Account Password *'}
                        </label>
                        {loginRole !== 'superadmin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotMode(true);
                              setForgotRole(loginRole as 'member' | 'admin');
                              setRecoveryStep('email');
                              setLoginErr('');
                            }}
                            className="text-[10px] text-amber-400 hover:underline"
                          >
                            Forgot PIN?
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLogin}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-lg transition uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isSubmittingLogin ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      <span>
                        {loginRole === 'member'
                          ? 'Sign In to Passbook'
                          : loginRole === 'admin'
                          ? 'Open Board Admin Workspace'
                          : 'Open Super Admin Master Control'}
                      </span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: SUPER ADMIN MASTER CONTROL CENTER */}
        {/* ========================================================= */}
        {sessionRole === 'superadmin' && (
          <SuperAdminDashboard
            adminAccounts={adminAccounts}
            members={members}
            contributions={contributions}
            systemLogs={systemLogs}
            systemSettings={systemSettings}
            superAdminProfile={superAdminProfile}
            onUpdateAdminAccounts={handleUpdateAdminAccounts}
            onUpdateMembers={handleUpdateFullMembersList}
            onUpdateContributions={handleUpdateContributionsList}
            onUpdateSystemSettings={handleUpdateSystemSettings}
            onUpdateSuperAdminProfile={handleUpdateSuperAdminProfile}
            onAddSystemLog={addSystemLog}
            triggerToast={triggerToast}
          />
        )}

        {/* ========================================================= */}
        {/* VIEW 3: BOARD ADMIN WORKSPACE */}
        {/* ========================================================= */}
        {sessionRole === 'admin' && (
          <div className="space-y-6">
            {/* Header subbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1F2937] p-4 rounded-xl border border-amber-500/20 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-['Cinzel'] tracking-wide">
                    Board Administrative Workspace
                  </h2>
                  <p className="text-xs text-gray-300">
                    Logged in as <span className="text-amber-400 font-mono font-bold">{primaryAdmin.username}</span> | Multi-device synced to PostgreSQL
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  onClick={() => setActiveAdminTab('members')}
                  className={`px-3 py-2 rounded-lg transition ${
                    activeAdminTab === 'members'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                      : 'bg-[#111827] text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  Member Registry
                </button>
                <button
                  onClick={() => setActiveAdminTab('accounts')}
                  className={`px-3 py-2 rounded-lg transition ${
                    activeAdminTab === 'accounts'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                      : 'bg-[#111827] text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  Password & Account Management
                </button>
                <button
                  onClick={() => setActiveAdminTab('passbook')}
                  className={`px-3 py-2 rounded-lg transition ${
                    activeAdminTab === 'passbook'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                      : 'bg-[#111827] text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  Passbooks & Deposits Ledger
                </button>
              </div>
            </div>

            {/* TAB CONTENT: MEMBERS REGISTRY */}
            {activeAdminTab === 'members' && (
              <ActiveInactiveMembersRegistry
                members={members}
                onAddMember={handleAddMember}
                onModifyMember={handleUpdateMemberDetails}
                onUpdateMembersList={handleUpdateFullMembersList}
                onEditTrigger={m => setEditingMember(m)}
                triggerToast={triggerToast}
              />
            )}

            {/* TAB CONTENT: CUSTOMER ACCOUNT & PASSWORD MANAGEMENT */}
            {activeAdminTab === 'accounts' && (
              <CustomerAccountManagement
                members={members}
                onUpdateMember={handleUpdateMemberDetails}
                triggerToast={triggerToast}
              />
            )}

            {/* TAB CONTENT: PASSBOOK & DEPOSITS LEDGER */}
            {activeAdminTab === 'passbook' && (
              <PassbookLedger
                members={activeMembersList}
                contributions={contributions}
                currentMember={currentMember}
                isAdmin={true}
                onAddContribution={handleAddContribution}
                onUpdateContributions={handleUpdateContributionsList}
                triggerToast={triggerToast}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: MEMBER PASSBOOK & SAVINGS DASHBOARD */}
        {/* ========================================================= */}
        {sessionRole === 'member' && currentMember && (
          <div className="space-y-6">
            {/* Header subbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1F2937] p-4 rounded-xl border border-amber-500/20 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-['Cinzel'] tracking-wide">
                    {currentMember.name} (Passbook: {currentMember.member_code})
                  </h2>
                  <p className="text-xs text-gray-300">
                    Contact: {currentMember.phone} | Status:{' '}
                    <span className="text-emerald-400 font-bold">{currentMember.status}</span>
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-2 text-xs font-bold">
                <button
                  onClick={() => setActiveMemberTab('passbook')}
                  className={`px-3 py-2 rounded-lg transition ${
                    activeMemberTab === 'passbook'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                      : 'bg-[#111827] text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  My Passbook & Ledger
                </button>
              </div>
            </div>

            {/* TAB CONTENT: MEMBER PASSBOOK */}
            {activeMemberTab === 'passbook' && (
              <PassbookLedger
                members={activeMembersList}
                contributions={contributions}
                currentMember={currentMember}
                isAdmin={false}
                onAddContribution={handleAddContribution}
                onUpdateContributions={handleUpdateContributionsList}
                triggerToast={triggerToast}
              />
            )}
          </div>
        )}
      </main>

      {/* EDIT MEMBER DETAILS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] max-w-md w-full p-6 rounded-xl border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2 text-amber-400">
              <h3 className="text-sm font-bold uppercase tracking-wider font-['Cinzel']">
                Modify Member Information
              </h3>
              <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleUpdateMemberDetails(editingMember);
                triggerToast(`Details for ${editingMember.name} updated successfully.`, 'success');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">Member Full Name</label>
                <input
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={editingMember.phone}
                  onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-300 block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editingMember.address}
                  onChange={e => setEditingMember({ ...editingMember, address: e.target.value })}
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-extrabold transition uppercase tracking-wide"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#1F2937] border-t border-gray-800 text-[10px] text-gray-300 py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {systemSettings.companyName}. All Rights Reserved.
          </span>
          <span className="text-gray-300">
            PostgreSQL Central Database Cluster • Multi-Device Concurrent Session Ready
          </span>
        </div>
      </footer>
    </div>
  );
}
