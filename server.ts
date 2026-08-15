import express from 'express';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { pool, initPostgresDatabase, getDbClient } from './server/db';

dotenv.config();

// In-Memory state store fallback when PostgreSQL is not configured or during local sandbox preview
let memMembers: any[] = [
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

let memContributions: any[] = [
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

let memAdminAccounts: any[] = [
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

let memSuperAdmin: any = {
  username: 'Sulagno',
  passwordHash: '161020',
  isDefaultPassword: true,
  lastLogin: undefined
};

let memLogs: any[] = [
  {
    id: 'log_init',
    timestamp: new Date().toISOString(),
    actor: 'System',
    action: 'Centralized Database Initialized',
    details: 'PostgreSQL connection layer initialized with multi-device concurrent sessions.',
    severity: 'info'
  }
];

let memSettings: any = {
  companyName: 'Nijo Bhumi Home Land (NBHL)',
  supportEmail: 'support@nbhl.com',
  supportPhone: '+91 90050 12345',
  maintenanceMode: false,
  allowMemberRegistration: true
};

const activeSessions = new Map<string, { userId: string; role: string; lastActivity: Date }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Try PostgreSQL Initialization
  let isPgActive = false;
  try {
    isPgActive = await initPostgresDatabase();
  } catch (err) {
    console.error('PostgreSQL startup check error:', err);
  }

  // --- API ROUTES ---

  // Health and Database Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NBHL Centralized Banking & Member Portal',
      database: isPgActive ? 'PostgreSQL' : 'Hybrid Synchronized Store',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/db-status', async (req, res) => {
    const client = await getDbClient();
    if (client) {
      try {
        const mCount = await client.query('SELECT COUNT(*) FROM members');
        const cCount = await client.query('SELECT COUNT(*) FROM contributions');
        client.release();
        return res.json({
          connected: true,
          type: 'PostgreSQL',
          membersCount: parseInt(mCount.rows[0].count, 10),
          contributionsCount: parseInt(cCount.rows[0].count, 10),
          multiDeviceSupport: true
        });
      } catch (e) {
        client.release();
      }
    }
    return res.json({
      connected: false,
      type: 'Local Hybrid (PostgreSQL ready via DATABASE_URL)',
      membersCount: memMembers.length,
      contributionsCount: memContributions.length,
      multiDeviceSupport: true
    });
  });

  // --- AUTHENTICATION (MULTI-DEVICE CONCURRENT SESSIONS) ---
  app.post('/api/auth/login', async (req, res) => {
    const { role, username, password } = req.body;
    const client = await getDbClient();

    try {
      if (role === 'superadmin') {
        let superAdmin = memSuperAdmin;
        if (client) {
          const sRes = await client.query('SELECT * FROM superadmin_profile WHERE id = $1', ['root_superadmin']);
          if (sRes.rows.length > 0) {
            superAdmin = sRes.rows[0];
          }
        }

        const validName = superAdmin.username.toLowerCase() === (username || '').trim().toLowerCase();
        let validPass = false;
        if (superAdmin.password_hash) {
          validPass = await bcrypt.compare(password, superAdmin.password_hash).catch(() => false);
        }
        if (!validPass && (superAdmin.plain_password === password || superAdmin.passwordHash === password)) {
          validPass = true;
        }

        if (!validName || !validPass) {
          return res.status(401).json({ error: 'Invalid Super Admin credentials' });
        }

        const token = crypto.randomUUID();
        activeSessions.set(token, { userId: 'root_superadmin', role: 'superadmin', lastActivity: new Date() });

        if (client) {
          await client.query('UPDATE superadmin_profile SET last_login = CURRENT_TIMESTAMP WHERE id = $1', ['root_superadmin']);
        }

        return res.json({
          token,
          role: 'superadmin',
          user: {
            username: superAdmin.username,
            isDefaultPassword: superAdmin.is_default_password ?? superAdmin.isDefaultPassword ?? true
          }
        });
      }

      if (role === 'admin') {
        let admin: any = null;
        if (client) {
          const aRes = await client.query('SELECT * FROM admin_accounts WHERE LOWER(username) = LOWER($1)', [username.trim()]);
          if (aRes.rows.length > 0) {
            admin = aRes.rows[0];
          }
        } else {
          admin = memAdminAccounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
        }

        if (!admin) {
          return res.status(401).json({ error: 'Director Admin account not found.' });
        }

        if (admin.status === 'Deactivated') {
          return res.status(403).json({ error: 'Admin account has been deactivated by Super Administrator.' });
        }

        let validPass = false;
        if (admin.password_hash) {
          validPass = await bcrypt.compare(password, admin.password_hash).catch(() => false);
        }
        if (!validPass && (admin.plain_password === password || admin.password === password)) {
          validPass = true;
        }

        if (!validPass) {
          return res.status(401).json({ error: 'Incorrect Board Admin password.' });
        }

        const token = crypto.randomUUID();
        activeSessions.set(token, { userId: admin.id, role: 'admin', lastActivity: new Date() });

        if (client) {
          await client.query('UPDATE admin_accounts SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);
        }

        return res.json({
          token,
          role: 'admin',
          user: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            phone: admin.phone,
            address: admin.address
          }
        });
      }

      if (role === 'member') {
        let member: any = null;
        const searchVal = (username || '').trim().toUpperCase();

        if (client) {
          const mRes = await client.query(`
            SELECT * FROM members
            WHERE UPPER(member_code) = $1 OR UPPER(email) = $1 OR phone = $2
          `, [searchVal, (username || '').trim()]);
          if (mRes.rows.length > 0) {
            member = mRes.rows[0];
          }
        } else {
          member = memMembers.find(
            m => m.member_code.toUpperCase() === searchVal || m.email.toUpperCase() === searchVal || m.phone === (username || '').trim()
          );
        }

        if (!member) {
          return res.status(401).json({ error: 'Member record not found with provided ID / Mobile / Email.' });
        }

        if (member.status === 'Inactive') {
          return res.status(403).json({ error: 'Account marked Inactive by Board. Contact Society Secretary.' });
        }

        if (member.status === 'Deleted') {
          return res.status(403).json({ error: 'Account has been closed / deleted from active registry.' });
        }

        let validPass = false;
        if (member.password_hash) {
          validPass = await bcrypt.compare(password, member.password_hash).catch(() => false);
        }
        if (!validPass && (member.plain_password === password || member.password === password)) {
          validPass = true;
        }

        if (!validPass) {
          return res.status(401).json({ error: 'Incorrect member PIN code / password.' });
        }

        const token = crypto.randomUUID();
        activeSessions.set(token, { userId: member.id, role: 'member', lastActivity: new Date() });

        return res.json({
          token,
          role: 'member',
          user: {
            id: member.id,
            member_code: member.member_code,
            name: member.name,
            phone: member.phone,
            email: member.email,
            address: member.address,
            joining_date: member.joining_date,
            status: member.status
          }
        });
      }

      return res.status(400).json({ error: 'Invalid login role specified.' });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal authentication server error' });
    } finally {
      if (client) client.release();
    }
  });

  // --- MEMBER MANAGEMENT (ADMIN PASSWORD SYSTEM & REAL-TIME SYNC) ---

  // Get all members
  app.get('/api/members', async (req, res) => {
    const client = await getDbClient();
    try {
      if (client) {
        const result = await client.query('SELECT * FROM members ORDER BY joining_date DESC, created_at DESC');
        const formatted = result.rows.map(r => ({
          id: r.id,
          member_code: r.member_code,
          name: r.name,
          phone: r.phone,
          email: r.email,
          address: r.address,
          joining_date: typeof r.joining_date === 'string' ? r.joining_date : r.joining_date.toISOString().split('T')[0],
          status: r.status,
          password: r.plain_password || '••••••',
          deleted_at: r.deleted_at ? r.deleted_at.toISOString() : undefined
        }));
        return res.json(formatted);
      }
      return res.json(memMembers);
    } catch (err) {
      console.error('Fetch members error:', err);
      return res.json(memMembers);
    } finally {
      if (client) client.release();
    }
  });

  // Create member with initial password assignment
  app.post('/api/members', async (req, res) => {
    const { name, phone, email, address, password, joining_date, custom_code } = req.body;
    const client = await getDbClient();

    try {
      const initialPassword = password?.trim() || '123456';
      const hash = await bcrypt.hash(initialPassword, 10);

      // Generate unique member code (NBHL0001 format)
      let nextCode = custom_code;
      if (!nextCode) {
        let maxNum = 0;
        if (client) {
          const existing = await client.query('SELECT member_code FROM members');
          existing.rows.forEach(r => {
            const match = r.member_code.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              const normalized = num >= 1000 ? num - 1000 : num;
              if (normalized > maxNum) maxNum = normalized;
            }
          });
        } else {
          memMembers.forEach(m => {
            const match = m.member_code.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              const normalized = num >= 1000 ? num - 1000 : num;
              if (normalized > maxNum) maxNum = normalized;
            }
          });
        }
        nextCode = `NBHL${String(maxNum + 1).padStart(4, '0')}`;
      }

      const newId = `m${Date.now()}`;
      const joinDate = joining_date || new Date().toISOString().split('T')[0];

      const newMember = {
        id: newId,
        member_code: nextCode,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@nbhl.com`,
        address: address?.trim() || 'Kolkata, WB, India',
        joining_date: joinDate,
        status: 'Active',
        password: initialPassword
      };

      if (client) {
        await client.query(`
          INSERT INTO members (id, member_code, name, phone, email, address, joining_date, status, password_hash, plain_password)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          newMember.id,
          newMember.member_code,
          newMember.name,
          newMember.phone,
          newMember.email,
          newMember.address,
          newMember.joining_date,
          newMember.status,
          hash,
          initialPassword
        ]);
      } else {
        memMembers.push(newMember);
      }

      return res.status(201).json(newMember);
    } catch (err: any) {
      console.error('Create member error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create member record' });
    } finally {
      if (client) client.release();
    }
  });

  // Admin Update member profile, status, or credentials
  app.put('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    const { member_code, name, phone, email, address, status, password, deleted_at } = req.body;
    const client = await getDbClient();

    try {
      let passwordHash: string | undefined;
      if (password) {
        passwordHash = await bcrypt.hash(password.trim(), 10);
      }

      if (client) {
        let query = `
          UPDATE members
          SET member_code = COALESCE($1, member_code),
              name = COALESCE($2, name),
              phone = COALESCE($3, phone),
              email = COALESCE($4, email),
              address = COALESCE($5, address),
              status = COALESCE($6, status),
              deleted_at = $7,
              updated_at = CURRENT_TIMESTAMP
        `;
        const params: any[] = [member_code, name, phone, email, address, status, deleted_at || null];

        if (password) {
          query += `, password_hash = $8, plain_password = $9 WHERE id = $10 RETURNING *`;
          params.push(passwordHash, password.trim(), id);
        } else {
          query += ` WHERE id = $8 RETURNING *`;
          params.push(id);
        }

        const result = await client.query(query, params);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Member not found' });
        }
        const r = result.rows[0];
        return res.json({
          id: r.id,
          member_code: r.member_code,
          name: r.name,
          phone: r.phone,
          email: r.email,
          address: r.address,
          joining_date: typeof r.joining_date === 'string' ? r.joining_date : r.joining_date.toISOString().split('T')[0],
          status: r.status,
          password: r.plain_password || '••••••',
          deleted_at: r.deleted_at ? r.deleted_at.toISOString() : undefined
        });
      } else {
        const idx = memMembers.findIndex(m => m.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Member not found' });
        memMembers[idx] = {
          ...memMembers[idx],
          ...(member_code && { member_code }),
          ...(name && { name }),
          ...(phone && { phone }),
          ...(email && { email }),
          ...(address && { address }),
          ...(status && { status }),
          ...(password && { password }),
          deleted_at: status === 'Deleted' ? (deleted_at || new Date().toISOString()) : undefined
        };
        return res.json(memMembers[idx]);
      }
    } catch (err: any) {
      console.error('Update member error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update member' });
    } finally {
      if (client) client.release();
    }
  });

  // Admin Reset Member Password
  app.post('/api/members/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const client = await getDbClient();

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters.' });
    }

    try {
      const hash = await bcrypt.hash(newPassword.trim(), 10);
      if (client) {
        await client.query(`
          UPDATE members
          SET password_hash = $1, plain_password = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [hash, newPassword.trim(), id]);
      } else {
        const m = memMembers.find(m => m.id === id);
        if (m) m.password = newPassword.trim();
      }

      return res.json({ success: true, message: 'Member password reset successfully' });
    } catch (err) {
      console.error('Reset member password error:', err);
      return res.status(500).json({ error: 'Failed to reset password' });
    } finally {
      if (client) client.release();
    }
  });

  // Soft/Permanent Delete Member
  app.delete('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    const { permanent } = req.query;
    const client = await getDbClient();

    try {
      if (permanent === 'true') {
        if (client) {
          await client.query('DELETE FROM members WHERE id = $1', [id]);
        } else {
          memMembers = memMembers.filter(m => m.id !== id);
          memContributions = memContributions.filter(c => c.member_id !== id);
        }
      } else {
        const delTime = new Date().toISOString();
        if (client) {
          await client.query('UPDATE members SET status = $1, deleted_at = $2 WHERE id = $3', ['Deleted', delTime, id]);
        } else {
          const m = memMembers.find(m => m.id === id);
          if (m) {
            m.status = 'Deleted';
            m.deleted_at = delTime;
          }
        }
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('Delete member error:', err);
      return res.status(500).json({ error: 'Failed to delete member' });
    } finally {
      if (client) client.release();
    }
  });

  // --- CONTRIBUTIONS & PASSBOOK LEDGER (SYNC & REAL-TIME) ---

  app.get('/api/contributions', async (req, res) => {
    const { member_id } = req.query;
    const client = await getDbClient();

    try {
      if (client) {
        let q = 'SELECT * FROM contributions';
        const params: any[] = [];
        if (member_id) {
          q += ' WHERE member_id = $1';
          params.push(member_id);
        }
        q += ' ORDER BY payment_date DESC, submitted_at DESC';

        const result = await client.query(q, params);
        const formatted = result.rows.map(r => ({
          id: r.id,
          member_id: r.member_id,
          member_code: r.member_code,
          member_name: r.member_name,
          amount: parseFloat(r.amount),
          payment_date: typeof r.payment_date === 'string' ? r.payment_date : r.payment_date.toISOString().split('T')[0],
          payment_method: r.payment_method,
          reference_number: r.reference_number,
          status: r.status,
          notes: r.notes || '',
          submitted_at: r.submitted_at ? r.submitted_at.toISOString() : new Date().toISOString(),
          action_taken_by: r.action_taken_by || 'NBHL Board Secretary'
        }));
        return res.json(formatted);
      }
      if (member_id) {
        return res.json(memContributions.filter(c => c.member_id === member_id));
      }
      return res.json(memContributions);
    } catch (err) {
      console.error('Fetch contributions error:', err);
      return res.json(memContributions);
    } finally {
      if (client) client.release();
    }
  });

  app.post('/api/contributions', async (req, res) => {
    const { member_id, member_code, member_name, amount, payment_date, payment_method, reference_number, notes, status, action_taken_by } = req.body;
    const client = await getDbClient();

    try {
      const newId = `c${Date.now()}`;
      const newContrib = {
        id: newId,
        member_id,
        member_code,
        member_name,
        amount: parseFloat(amount),
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'Bank Transfer',
        reference_number: reference_number.toUpperCase().trim(),
        status: status || 'Approved',
        notes: notes?.trim() || '',
        submitted_at: new Date().toISOString(),
        action_taken_by: action_taken_by || 'NBHL Board Secretary'
      };

      if (client) {
        await client.query(`
          INSERT INTO contributions (id, member_id, member_code, member_name, amount, payment_date, payment_method, reference_number, status, notes, submitted_at, action_taken_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          newContrib.id,
          newContrib.member_id,
          newContrib.member_code,
          newContrib.member_name,
          newContrib.amount,
          newContrib.payment_date,
          newContrib.payment_method,
          newContrib.reference_number,
          newContrib.status,
          newContrib.notes,
          newContrib.submitted_at,
          newContrib.action_taken_by
        ]);
      } else {
        memContributions.unshift(newContrib);
      }

      return res.status(201).json(newContrib);
    } catch (err: any) {
      console.error('Add contribution error:', err);
      return res.status(500).json({ error: err.message || 'Failed to record contribution' });
    } finally {
      if (client) client.release();
    }
  });

  app.put('/api/contributions/:id', async (req, res) => {
    const { id } = req.params;
    const { amount, payment_date, payment_method, reference_number, status, notes, action_taken_by } = req.body;
    const client = await getDbClient();

    try {
      if (client) {
        const result = await client.query(`
          UPDATE contributions
          SET amount = COALESCE($1, amount),
              payment_date = COALESCE($2, payment_date),
              payment_method = COALESCE($3, payment_method),
              reference_number = COALESCE($4, reference_number),
              status = COALESCE($5, status),
              notes = COALESCE($6, notes),
              action_taken_by = COALESCE($7, action_taken_by)
          WHERE id = $8
          RETURNING *
        `, [amount ? parseFloat(amount) : null, payment_date, payment_method, reference_number, status, notes, action_taken_by, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        const r = result.rows[0];
        return res.json({
          id: r.id,
          member_id: r.member_id,
          member_code: r.member_code,
          member_name: r.member_name,
          amount: parseFloat(r.amount),
          payment_date: typeof r.payment_date === 'string' ? r.payment_date : r.payment_date.toISOString().split('T')[0],
          payment_method: r.payment_method,
          reference_number: r.reference_number,
          status: r.status,
          notes: r.notes || '',
          submitted_at: r.submitted_at ? r.submitted_at.toISOString() : new Date().toISOString(),
          action_taken_by: r.action_taken_by
        });
      } else {
        const idx = memContributions.findIndex(c => c.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Record not found' });
        memContributions[idx] = {
          ...memContributions[idx],
          ...(amount && { amount: parseFloat(amount) }),
          ...(payment_date && { payment_date }),
          ...(payment_method && { payment_method }),
          ...(reference_number && { reference_number }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(action_taken_by && { action_taken_by })
        };
        return res.json(memContributions[idx]);
      }
    } catch (err: any) {
      console.error('Update contribution error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update contribution' });
    } finally {
      if (client) client.release();
    }
  });

  app.delete('/api/contributions/:id', async (req, res) => {
    const { id } = req.params;
    const client = await getDbClient();

    try {
      if (client) {
        await client.query('DELETE FROM contributions WHERE id = $1', [id]);
      } else {
        memContributions = memContributions.filter(c => c.id !== id);
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('Delete contribution error:', err);
      return res.status(500).json({ error: 'Failed to delete contribution' });
    } finally {
      if (client) client.release();
    }
  });

  // --- ADMIN ACCOUNTS & SUPER ADMIN SYSTEM ---

  app.get('/api/admins', async (req, res) => {
    const client = await getDbClient();
    try {
      if (client) {
        const result = await client.query('SELECT * FROM admin_accounts ORDER BY created_at ASC');
        return res.json(result.rows.map(r => ({
          id: r.id,
          username: r.username,
          password: r.plain_password || '••••••',
          email: r.email,
          phone: r.phone,
          address: r.address || '',
          status: r.status,
          created_at: r.created_at ? r.created_at.toISOString() : '',
          last_login: r.last_login ? r.last_login.toISOString() : undefined
        })));
      }
      return res.json(memAdminAccounts);
    } catch (err) {
      console.error('Fetch admins error:', err);
      return res.json(memAdminAccounts);
    } finally {
      if (client) client.release();
    }
  });

  app.post('/api/admins', async (req, res) => {
    const { username, password, email, phone, address } = req.body;
    const client = await getDbClient();

    try {
      const hash = await bcrypt.hash(password.trim(), 10);
      const newAdmin = {
        id: `admin_${Date.now()}`,
        username: username.trim(),
        password: password.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address?.trim() || '',
        status: 'Active',
        created_at: new Date().toISOString()
      };

      if (client) {
        await client.query(`
          INSERT INTO admin_accounts (id, username, password_hash, plain_password, email, phone, address, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          newAdmin.id,
          newAdmin.username,
          hash,
          newAdmin.password,
          newAdmin.email,
          newAdmin.phone,
          newAdmin.address,
          newAdmin.status
        ]);
      } else {
        memAdminAccounts.push(newAdmin);
      }

      return res.status(201).json(newAdmin);
    } catch (err: any) {
      console.error('Create admin error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create admin' });
    } finally {
      if (client) client.release();
    }
  });

  app.put('/api/admins/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password, email, phone, address, status } = req.body;
    const client = await getDbClient();

    try {
      let hash: string | undefined;
      if (password) {
        hash = await bcrypt.hash(password.trim(), 10);
      }

      if (client) {
        let q = `
          UPDATE admin_accounts
          SET username = COALESCE($1, username),
              email = COALESCE($2, email),
              phone = COALESCE($3, phone),
              address = COALESCE($4, address),
              status = COALESCE($5, status)
        `;
        const params: any[] = [username, email, phone, address, status];

        if (password) {
          q += `, password_hash = $6, plain_password = $7 WHERE id = $8 RETURNING *`;
          params.push(hash, password.trim(), id);
        } else {
          q += ` WHERE id = $6 RETURNING *`;
          params.push(id);
        }

        const result = await client.query(q, params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
        const r = result.rows[0];
        return res.json({
          id: r.id,
          username: r.username,
          password: r.plain_password || '••••••',
          email: r.email,
          phone: r.phone,
          address: r.address || '',
          status: r.status,
          created_at: r.created_at ? r.created_at.toISOString() : ''
        });
      } else {
        const idx = memAdminAccounts.findIndex(a => a.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Admin not found' });
        memAdminAccounts[idx] = {
          ...memAdminAccounts[idx],
          ...(username && { username }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(address && { address }),
          ...(status && { status }),
          ...(password && { password })
        };
        return res.json(memAdminAccounts[idx]);
      }
    } catch (err: any) {
      console.error('Update admin error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update admin' });
    } finally {
      if (client) client.release();
    }
  });

  // Super Admin Profile
  app.get('/api/superadmin/profile', async (req, res) => {
    const client = await getDbClient();
    try {
      if (client) {
        const result = await client.query('SELECT * FROM superadmin_profile WHERE id = $1', ['root_superadmin']);
        if (result.rows.length > 0) {
          const r = result.rows[0];
          return res.json({
            username: r.username,
            passwordHash: r.plain_password || '161020',
            isDefaultPassword: r.is_default_password,
            lastLogin: r.last_login ? r.last_login.toISOString() : undefined
          });
        }
      }
      return res.json(memSuperAdmin);
    } catch (err) {
      console.error('Fetch superadmin profile error:', err);
      return res.json(memSuperAdmin);
    } finally {
      if (client) client.release();
    }
  });

  app.put('/api/superadmin/profile', async (req, res) => {
    const { username, newPassword } = req.body;
    const client = await getDbClient();

    try {
      let hash: string | undefined;
      const isDefault = newPassword === '161020';
      if (newPassword) {
        hash = await bcrypt.hash(newPassword, 10);
      }

      if (client) {
        if (newPassword) {
          await client.query(`
            UPDATE superadmin_profile
            SET username = COALESCE($1, username),
                password_hash = $2,
                plain_password = $3,
                is_default_password = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
          `, [username, hash, newPassword, isDefault, 'root_superadmin']);
        } else {
          await client.query(`
            UPDATE superadmin_profile
            SET username = COALESCE($1, username),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [username, 'root_superadmin']);
        }
      }

      memSuperAdmin = {
        username: username || memSuperAdmin.username,
        passwordHash: newPassword || memSuperAdmin.passwordHash,
        isDefaultPassword: isDefault,
        lastLogin: new Date().toISOString()
      };

      return res.json(memSuperAdmin);
    } catch (err) {
      console.error('Update superadmin profile error:', err);
      return res.status(500).json({ error: 'Failed to update Super Admin profile' });
    } finally {
      if (client) client.release();
    }
  });

  // System Logs
  app.get('/api/logs', async (req, res) => {
    const client = await getDbClient();
    try {
      if (client) {
        const result = await client.query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100');
        return res.json(result.rows.map(r => ({
          id: r.id,
          timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
          actor: r.actor,
          action: r.action,
          details: r.details,
          severity: r.severity
        })));
      }
      return res.json(memLogs);
    } catch (err) {
      return res.json(memLogs);
    } finally {
      if (client) client.release();
    }
  });

  app.post('/api/logs', async (req, res) => {
    const { actor, action, details, severity } = req.body;
    const client = await getDbClient();

    try {
      const newLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: actor || 'User',
        action: action || 'Action',
        details: details || '',
        severity: severity || 'info'
      };

      if (client) {
        await client.query(`
          INSERT INTO system_logs (id, timestamp, actor, action, details, severity)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [newLog.id, newLog.timestamp, newLog.actor, newLog.action, newLog.details, newLog.severity]);
      } else {
        memLogs.unshift(newLog);
      }

      return res.status(201).json(newLog);
    } catch (err) {
      return res.json({ success: false });
    } finally {
      if (client) client.release();
    }
  });

  // System Settings
  app.get('/api/settings', async (req, res) => {
    const client = await getDbClient();
    try {
      if (client) {
        const result = await client.query('SELECT * FROM system_settings WHERE id = $1', ['global_settings']);
        if (result.rows.length > 0) {
          const r = result.rows[0];
          return res.json({
            companyName: r.company_name,
            supportEmail: r.support_email,
            supportPhone: r.support_phone,
            maintenanceMode: r.maintenance_mode,
            allowMemberRegistration: r.allow_member_registration
          });
        }
      }
      return res.json(memSettings);
    } catch (err) {
      return res.json(memSettings);
    } finally {
      if (client) client.release();
    }
  });

  app.put('/api/settings', async (req, res) => {
    const { companyName, supportEmail, supportPhone, maintenanceMode, allowMemberRegistration } = req.body;
    const client = await getDbClient();

    try {
      if (client) {
        await client.query(`
          UPDATE system_settings
          SET company_name = COALESCE($1, company_name),
              support_email = COALESCE($2, support_email),
              support_phone = COALESCE($3, support_phone),
              maintenance_mode = COALESCE($4, maintenance_mode),
              allow_member_registration = COALESCE($5, allow_member_registration),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
        `, [companyName, supportEmail, supportPhone, maintenanceMode, allowMemberRegistration, 'global_settings']);
      }

      memSettings = {
        companyName: companyName ?? memSettings.companyName,
        supportEmail: supportEmail ?? memSettings.supportEmail,
        supportPhone: supportPhone ?? memSettings.supportPhone,
        maintenanceMode: maintenanceMode ?? memSettings.maintenanceMode,
        allowMemberRegistration: allowMemberRegistration ?? memSettings.allowMemberRegistration
      };

      return res.json(memSettings);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update settings' });
    } finally {
      if (client) client.release();
    }
  });

  // Vite middleware in dev, static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NBHL Centralized PostgreSQL Portal running on port ${PORT}`);
  });
}

startServer();
