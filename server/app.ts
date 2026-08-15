import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, getDbClient, isDbConnected, initPostgresDatabase } from './db';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure database initialization attempt on startup
initPostgresDatabase().catch(err => {
  console.error('PostgreSQL initial connection attempt:', err);
});

// Middleware to ensure DB connectivity check for API routes
const checkDbConnection = async (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      error: 'PostgreSQL database connection required. DATABASE_URL environment variable is not configured.',
      database: 'PostgreSQL (Disconnected)'
    });
  }
  next();
};

// --- HEALTH & STATUS ENDPOINTS ---

app.get('/api/health', async (req: Request, res: Response) => {
  const connected = await isDbConnected();
  res.json({
    status: connected ? 'ok' : 'degraded',
    service: 'NBHL Centralized Banking & Member Portal',
    database: connected ? 'PostgreSQL (Connected)' : 'PostgreSQL (Disconnected)',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db-status', async (req: Request, res: Response) => {
  try {
    const client = await getDbClient();
    if (!client) {
      return res.status(503).json({
        connected: false,
        type: 'PostgreSQL',
        error: 'Database connection offline or DATABASE_URL not supplied',
        multiDeviceSupport: true
      });
    }

    try {
      const mCount = await client.query('SELECT COUNT(*) FROM members');
      const cCount = await client.query('SELECT COUNT(*) FROM contributions');
      const aCount = await client.query('SELECT COUNT(*) FROM admin_accounts');
      client.release();

      return res.json({
        connected: true,
        type: 'PostgreSQL',
        membersCount: parseInt(mCount.rows[0]?.count || '0', 10),
        contributionsCount: parseInt(cCount.rows[0]?.count || '0', 10),
        adminsCount: parseInt(aCount.rows[0]?.count || '0', 10),
        multiDeviceSupport: true
      });
    } catch (err: any) {
      client.release();
      return res.status(500).json({
        connected: false,
        type: 'PostgreSQL',
        error: err.message || 'Error querying database statistics'
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      type: 'PostgreSQL',
      error: err.message || 'Database connection error'
    });
  }
});

// --- AUTHENTICATION (SECURE BCRYPT & SESSION TOKEN) ---

app.post('/api/auth/login', checkDbConnection, async (req: Request, res: Response) => {
  const { role, username, password } = req.body;

  if (!role || !username || !password) {
    return res.status(400).json({ error: 'Role, username, and password are required.' });
  }

  try {
    if (role === 'superadmin') {
      const sRes = await query('SELECT * FROM superadmin_profile WHERE id = $1', ['root_superadmin']);
      if (sRes.rows.length === 0) {
        return res.status(401).json({ error: 'Super Admin root profile not found.' });
      }

      const superAdmin = sRes.rows[0];
      const validName = superAdmin.username.toLowerCase() === username.trim().toLowerCase();
      const validPass = await bcrypt.compare(password.trim(), superAdmin.password_hash).catch(() => false);

      if (!validName || !validPass) {
        return res.status(401).json({ error: 'Invalid Super Admin credentials.' });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await query(`
        INSERT INTO user_sessions (token, user_id, role, device_info, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [token, 'root_superadmin', 'superadmin', req.headers['user-agent'] || 'Web Client', expiresAt]);

      await query('UPDATE superadmin_profile SET last_login = CURRENT_TIMESTAMP WHERE id = $1', ['root_superadmin']);

      return res.json({
        token,
        role: 'superadmin',
        user: {
          username: superAdmin.username,
          isDefaultPassword: superAdmin.is_default_password ?? true
        }
      });
    }

    if (role === 'admin') {
      const aRes = await query('SELECT * FROM admin_accounts WHERE LOWER(username) = LOWER($1)', [username.trim()]);
      if (aRes.rows.length === 0) {
        return res.status(401).json({ error: 'Board Admin account not found.' });
      }

      const admin = aRes.rows[0];
      if (admin.status === 'Deactivated') {
        return res.status(403).json({ error: 'Admin account has been deactivated by Super Administrator.' });
      }

      const validPass = await bcrypt.compare(password.trim(), admin.password_hash).catch(() => false);
      if (!validPass) {
        return res.status(401).json({ error: 'Incorrect Board Admin password.' });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await query(`
        INSERT INTO user_sessions (token, user_id, role, device_info, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [token, admin.id, 'admin', req.headers['user-agent'] || 'Web Client', expiresAt]);

      await query('UPDATE admin_accounts SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);

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
      const searchVal = username.trim().toUpperCase();
      const mRes = await query(`
        SELECT * FROM members
        WHERE UPPER(member_code) = $1 OR UPPER(email) = $1 OR phone = $2
      `, [searchVal, username.trim()]);

      if (mRes.rows.length === 0) {
        return res.status(401).json({ error: 'Member record not found with provided Member Code, Mobile, or Email.' });
      }

      const member = mRes.rows[0];
      if (member.status === 'Inactive') {
        return res.status(403).json({ error: 'Account marked Inactive by Board. Contact Society Secretary.' });
      }

      if (member.status === 'Deleted') {
        return res.status(403).json({ error: 'Account has been closed / deleted from active registry.' });
      }

      const validPass = await bcrypt.compare(password.trim(), member.password_hash).catch(() => false);
      if (!validPass) {
        return res.status(401).json({ error: 'Incorrect member PIN code / password.' });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await query(`
        INSERT INTO user_sessions (token, user_id, role, device_info, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [token, member.id, 'member', req.headers['user-agent'] || 'Web Client', expiresAt]);

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
          joining_date: typeof member.joining_date === 'string' ? member.joining_date : member.joining_date.toISOString().split('T')[0],
          status: member.status
        }
      });
    }

    return res.status(400).json({ error: 'Invalid login role specified.' });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication server error: ' + (err.message || 'Unknown') });
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
  if (token) {
    try {
      await query('DELETE FROM user_sessions WHERE token = $1', [token]);
    } catch {
      // ignore
    }
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// --- MEMBERS MANAGEMENT API ---

app.get('/api/members', checkDbConnection, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM members ORDER BY joining_date DESC, created_at DESC');
    const formatted = result.rows.map(r => ({
      id: r.id,
      member_code: r.member_code,
      name: r.name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      joining_date: typeof r.joining_date === 'string' ? r.joining_date : r.joining_date.toISOString().split('T')[0],
      status: r.status,
      password: '••••••', // Masked, never plaintext
      deleted_at: r.deleted_at ? r.deleted_at.toISOString() : undefined
    }));
    return res.json(formatted);
  } catch (err: any) {
    console.error('Fetch members error:', err);
    return res.status(500).json({ error: 'Failed to fetch members: ' + err.message });
  }
});

app.post('/api/members', checkDbConnection, async (req: Request, res: Response) => {
  const { name, phone, email, address, password, joining_date, custom_code } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Member full name and mobile phone are required.' });
  }

  try {
    const initialPassword = password?.trim() || '123456';
    const hash = await bcrypt.hash(initialPassword, 10);

    // Auto-generate code NBHL0001
    let nextCode = custom_code;
    if (!nextCode) {
      let maxNum = 0;
      const existing = await query('SELECT member_code FROM members');
      existing.rows.forEach(r => {
        const match = r.member_code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          const normalized = num >= 1000 ? num - 1000 : num;
          if (normalized > maxNum) maxNum = normalized;
        }
      });
      nextCode = `NBHL${String(maxNum + 1).padStart(4, '0')}`;
    }

    const newId = `m${Date.now()}`;
    const joinDate = joining_date || new Date().toISOString().split('T')[0];

    const result = await query(`
      INSERT INTO members (id, member_code, name, phone, email, address, joining_date, status, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, member_code, name, phone, email, address, joining_date, status, deleted_at
    `, [
      newId,
      nextCode,
      name.trim(),
      phone.trim(),
      email?.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@nbhl.com`,
      address?.trim() || 'Kolkata, WB, India',
      joinDate,
      'Active',
      hash
    ]);

    const r = result.rows[0];
    return res.status(201).json({
      id: r.id,
      member_code: r.member_code,
      name: r.name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      joining_date: typeof r.joining_date === 'string' ? r.joining_date : r.joining_date.toISOString().split('T')[0],
      status: r.status,
      password: '••••••',
      deleted_at: r.deleted_at ? r.deleted_at.toISOString() : undefined
    });
  } catch (err: any) {
    console.error('Create member error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create member record' });
  }
});

app.put('/api/members/:id', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { member_code, name, phone, email, address, status, password, deleted_at } = req.body;

  try {
    let passwordHash: string | undefined;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    let q = `
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

    if (passwordHash) {
      q += `, password_hash = $8 WHERE id = $9 RETURNING *`;
      params.push(passwordHash, id);
    } else {
      q += ` WHERE id = $8 RETURNING *`;
      params.push(id);
    }

    const result = await query(q, params);
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
      password: '••••••',
      deleted_at: r.deleted_at ? r.deleted_at.toISOString() : undefined
    });
  } catch (err: any) {
    console.error('Update member error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update member' });
  }
});

app.post('/api/members/:id/reset-password', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  try {
    const hash = await bcrypt.hash(newPassword.trim(), 10);
    const result = await query(`
      UPDATE members
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, member_code, name
    `, [hash, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    return res.json({ success: true, message: 'Member password reset successfully.' });
  } catch (err: any) {
    console.error('Reset member password error:', err);
    return res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

app.delete('/api/members/:id', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permanent } = req.query;

  try {
    if (permanent === 'true') {
      await query('DELETE FROM members WHERE id = $1', [id]);
    } else {
      const delTime = new Date().toISOString();
      await query('UPDATE members SET status = $1, deleted_at = $2 WHERE id = $3', ['Deleted', delTime, id]);
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Delete member error:', err);
    return res.status(500).json({ error: 'Failed to delete member: ' + err.message });
  }
});

// --- CONTRIBUTIONS & PASSBOOK LEDGER API ---

app.get('/api/contributions', checkDbConnection, async (req: Request, res: Response) => {
  const { member_id } = req.query;

  try {
    let q = 'SELECT * FROM contributions';
    const params: any[] = [];
    if (member_id) {
      q += ' WHERE member_id = $1';
      params.push(member_id);
    }
    q += ' ORDER BY payment_date DESC, submitted_at DESC';

    const result = await query(q, params);
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
  } catch (err: any) {
    console.error('Fetch contributions error:', err);
    return res.status(500).json({ error: 'Failed to fetch contributions: ' + err.message });
  }
});

app.post('/api/contributions', checkDbConnection, async (req: Request, res: Response) => {
  const {
    member_id,
    member_code,
    member_name,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    status,
    action_taken_by
  } = req.body;

  if (!member_id || !amount || !reference_number) {
    return res.status(400).json({ error: 'Member ID, amount, and reference number are required.' });
  }

  try {
    const newId = `c${Date.now()}`;
    const result = await query(`
      INSERT INTO contributions (id, member_id, member_code, member_name, amount, payment_date, payment_method, reference_number, status, notes, submitted_at, action_taken_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)
      RETURNING *
    `, [
      newId,
      member_id,
      member_code,
      member_name,
      parseFloat(amount),
      payment_date || new Date().toISOString().split('T')[0],
      payment_method || 'Bank Transfer',
      reference_number.toUpperCase().trim(),
      status || 'Approved',
      notes?.trim() || '',
      action_taken_by || 'NBHL Board Secretary'
    ]);

    const r = result.rows[0];
    return res.status(201).json({
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
  } catch (err: any) {
    console.error('Add contribution error:', err);
    return res.status(500).json({ error: err.message || 'Failed to record contribution' });
  }
});

app.put('/api/contributions/:id', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, payment_date, payment_method, reference_number, status, notes, action_taken_by } = req.body;

  try {
    const result = await query(`
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
    `, [
      amount ? parseFloat(amount) : null,
      payment_date,
      payment_method,
      reference_number ? reference_number.toUpperCase().trim() : null,
      status,
      notes,
      action_taken_by,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contribution record not found.' });
    }

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
  } catch (err: any) {
    console.error('Update contribution error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update contribution' });
  }
});

app.delete('/api/contributions/:id', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM contributions WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Delete contribution error:', err);
    return res.status(500).json({ error: 'Failed to delete contribution: ' + err.message });
  }
});

// --- ADMIN ACCOUNTS & SUPER ADMIN MANAGEMENT ---

app.get('/api/admins', checkDbConnection, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM admin_accounts ORDER BY created_at ASC');
    return res.json(result.rows.map(r => ({
      id: r.id,
      username: r.username,
      password: '••••••', // Masked, never returned
      email: r.email,
      phone: r.phone,
      address: r.address || '',
      status: r.status,
      created_at: r.created_at ? r.created_at.toISOString() : '',
      last_login: r.last_login ? r.last_login.toISOString() : undefined
    })));
  } catch (err: any) {
    console.error('Fetch admins error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin accounts: ' + err.message });
  }
});

app.post('/api/admins', checkDbConnection, async (req: Request, res: Response) => {
  const { username, password, email, phone, address } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required for Board Admin.' });
  }

  try {
    const hash = await bcrypt.hash(password.trim(), 10);
    const newId = `admin_${Date.now()}`;

    const result = await query(`
      INSERT INTO admin_accounts (id, username, password_hash, email, phone, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, phone, address, status, created_at
    `, [
      newId,
      username.trim(),
      hash,
      email?.trim() || `${username.trim().toLowerCase()}@nbhl.com`,
      phone?.trim() || '+91 90000 00000',
      address?.trim() || 'NBHL Regional Office',
      'Active'
    ]);

    const r = result.rows[0];
    return res.status(201).json({
      id: r.id,
      username: r.username,
      password: '••••••',
      email: r.email,
      phone: r.phone,
      address: r.address || '',
      status: r.status,
      created_at: r.created_at ? r.created_at.toISOString() : ''
    });
  } catch (err: any) {
    console.error('Create admin error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create admin' });
  }
});

app.put('/api/admins/:id', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, password, email, phone, address, status } = req.body;

  try {
    let hash: string | undefined;
    if (password && password.trim()) {
      hash = await bcrypt.hash(password.trim(), 10);
    }

    let q = `
      UPDATE admin_accounts
      SET username = COALESCE($1, username),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          status = COALESCE($5, status)
    `;
    const params: any[] = [username, email, phone, address, status];

    if (hash) {
      q += `, password_hash = $6 WHERE id = $7 RETURNING *`;
      params.push(hash, id);
    } else {
      q += ` WHERE id = $6 RETURNING *`;
      params.push(id);
    }

    const result = await query(q, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const r = result.rows[0];
    return res.json({
      id: r.id,
      username: r.username,
      password: '••••••',
      email: r.email,
      phone: r.phone,
      address: r.address || '',
      status: r.status,
      created_at: r.created_at ? r.created_at.toISOString() : ''
    });
  } catch (err: any) {
    console.error('Update admin error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update admin' });
  }
});

app.delete('/api/admins/:id', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const countRes = await query('SELECT COUNT(*) FROM admin_accounts');
    if (parseInt(countRes.rows[0].count, 10) <= 1) {
      return res.status(400).json({ error: 'At least one Board Administrator account must remain active.' });
    }

    await query('DELETE FROM admin_accounts WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Delete admin error:', err);
    return res.status(500).json({ error: 'Failed to delete admin: ' + err.message });
  }
});

app.post('/api/admins/:id/reset-password', checkDbConnection, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  try {
    const hash = await bcrypt.hash(newPassword.trim(), 10);
    const result = await query('UPDATE admin_accounts SET password_hash = $1 WHERE id = $2 RETURNING id, username', [hash, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }
    return res.json({ success: true, message: 'Admin password reset successfully.' });
  } catch (err: any) {
    console.error('Reset admin password error:', err);
    return res.status(500).json({ error: 'Failed to reset admin password: ' + err.message });
  }
});

// --- SUPER ADMIN ROOT PROFILE ---

app.get('/api/superadmin/profile', checkDbConnection, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT username, is_default_password, last_login FROM superadmin_profile WHERE id = $1', ['root_superadmin']);
    if (result.rows.length > 0) {
      const r = result.rows[0];
      return res.json({
        username: r.username,
        isDefaultPassword: r.is_default_password,
        lastLogin: r.last_login ? r.last_login.toISOString() : undefined
      });
    }
    return res.status(404).json({ error: 'Super Admin profile not found.' });
  } catch (err: any) {
    console.error('Fetch superadmin profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch Super Admin profile: ' + err.message });
  }
});

app.put('/api/superadmin/profile', checkDbConnection, async (req: Request, res: Response) => {
  const { username, newPassword } = req.body;

  try {
    let hash: string | undefined;
    const isDefault = newPassword === '161020';
    if (newPassword && newPassword.trim()) {
      hash = await bcrypt.hash(newPassword.trim(), 10);
    }

    if (hash) {
      await query(`
        UPDATE superadmin_profile
        SET username = COALESCE($1, username),
            password_hash = $2,
            is_default_password = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [username, hash, isDefault, 'root_superadmin']);
    } else {
      await query(`
        UPDATE superadmin_profile
        SET username = COALESCE($1, username),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [username, 'root_superadmin']);
    }

    const updated = await query('SELECT username, is_default_password, last_login FROM superadmin_profile WHERE id = $1', ['root_superadmin']);
    const r = updated.rows[0];

    return res.json({
      username: r.username,
      isDefaultPassword: r.is_default_password,
      lastLogin: r.last_login ? r.last_login.toISOString() : undefined
    });
  } catch (err: any) {
    console.error('Update superadmin profile error:', err);
    return res.status(500).json({ error: 'Failed to update Super Admin profile: ' + err.message });
  }
});

// --- SYSTEM AUDIT LOGS ---

app.get('/api/logs', checkDbConnection, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100');
    return res.json(result.rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
      actor: r.actor,
      action: r.action,
      details: r.details,
      severity: r.severity
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch logs: ' + err.message });
  }
});

app.post('/api/logs', checkDbConnection, async (req: Request, res: Response) => {
  const { actor, action, details, severity } = req.body;
  try {
    const newId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await query(`
      INSERT INTO system_logs (id, timestamp, actor, action, details, severity)
      VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5)
      RETURNING *
    `, [newId, actor || 'User', action || 'Action', details || '', severity || 'info']);

    const r = result.rows[0];
    return res.status(201).json({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      actor: r.actor,
      action: r.action,
      details: r.details,
      severity: r.severity
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record system log' });
  }
});

// --- SYSTEM SETTINGS ---

app.get('/api/settings', checkDbConnection, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_settings WHERE id = $1', ['global_settings']);
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
    return res.json({
      companyName: 'Nijo Bhumi Home Land (NBHL)',
      supportEmail: 'support@nbhl.com',
      supportPhone: '+91 90050 12345',
      maintenanceMode: false,
      allowMemberRegistration: true
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch settings: ' + err.message });
  }
});

app.put('/api/settings', checkDbConnection, async (req: Request, res: Response) => {
  const { companyName, supportEmail, supportPhone, maintenanceMode, allowMemberRegistration } = req.body;

  try {
    const result = await query(`
      UPDATE system_settings
      SET company_name = COALESCE($1, company_name),
          support_email = COALESCE($2, support_email),
          support_phone = COALESCE($3, support_phone),
          maintenance_mode = COALESCE($4, maintenance_mode),
          allow_member_registration = COALESCE($5, allow_member_registration),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [companyName, supportEmail, supportPhone, maintenanceMode, allowMemberRegistration, 'global_settings']);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'System settings not found.' });
    }

    const r = result.rows[0];
    return res.json({
      companyName: r.company_name,
      supportEmail: r.support_email,
      supportPhone: r.support_phone,
      maintenanceMode: r.maintenance_mode,
      allowMemberRegistration: r.allow_member_registration
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update settings: ' + err.message });
  }
});

// --- FACTORY RESET & DATABASE PURGE ---

app.post('/api/database/factory-reset', checkDbConnection, async (req: Request, res: Response) => {
  const { confirmationCode } = req.body;

  if (confirmationCode !== 'RESET-NBHL-DATABASE') {
    return res.status(400).json({ error: 'Confirmation code mismatch. Database wipe aborted.' });
  }

  const client = await getDbClient();
  if (!client) {
    return res.status(503).json({ error: 'Database connection offline.' });
  }

  try {
    await client.query('BEGIN');

    // Clear data
    await client.query('DELETE FROM contributions');
    await client.query('DELETE FROM members');
    await client.query('DELETE FROM admin_accounts');
    await client.query('DELETE FROM user_sessions');
    await client.query('DELETE FROM system_logs');

    // Seed default SuperAdmin
    const superHash = await bcrypt.hash('161020', 10);
    await client.query(`
      UPDATE superadmin_profile
      SET username = 'Sulagno', password_hash = $1, is_default_password = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = 'root_superadmin'
    `, [superHash]);

    // Seed default Board Admin
    const adminHash = await bcrypt.hash('101020', 10);
    await client.query(`
      INSERT INTO admin_accounts (id, username, password_hash, email, phone, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['admin_1', 'Prasanta', adminHash, 'prasanta@nbhl.com', '+91 90050 12345', 'NBHL Corporate HQ, Salt Lake Sector III, Kolkata, WB', 'Active']);

    // Seed Initial Members
    const m1Hash = await bcrypt.hash('pin1', 10);
    const m2Hash = await bcrypt.hash('pin2', 10);
    const m3Hash = await bcrypt.hash('pin3', 10);

    await client.query(`
      INSERT INTO members (id, member_code, name, phone, email, address, joining_date, status, password_hash)
      VALUES
      ('m1', 'NBHL0001', 'Aarav Sharma', '+91 98765 43210', 'aarav@gmail.com', '14/B, Park Street Colony, Kolkata, WB', '2026-03-10', 'Active', $1),
      ('m2', 'NBHL0002', 'Ananya Sen', '+91 87654 32109', 'ananya.sen@gmail.com', 'Salt Lake Sector V, Block C, Kolkata, WB', '2026-02-28', 'Active', $2),
      ('m3', 'NBHL0003', 'Joydeep Biswas', '+91 76543 21098', 'joydeep@outlook.com', 'Garia Gardens Complex, House 4, Kolkata, WB', '2026-05-15', 'Inactive', $3)
    `, [m1Hash, m2Hash, m3Hash]);

    // Seed Initial Contributions
    await client.query(`
      INSERT INTO contributions (id, member_id, member_code, member_name, amount, payment_date, payment_method, reference_number, status, notes, action_taken_by)
      VALUES
      ('c1', 'm1', 'NBHL0001', 'Aarav Sharma', 25000, '2026-03-20', 'Bank Transfer', 'TXN729013444', 'Approved', 'Initial savings allocation for land development pool.', 'NBHL Board Secretary'),
      ('c2', 'm1', 'NBHL0001', 'Aarav Sharma', 15000, '2026-04-15', 'UPI Mobile Transfer', 'MB7812901', 'Approved', 'Monthly savings pledge contribution.', 'NBHL Board Secretary'),
      ('c3', 'm2', 'NBHL0002', 'Ananya Sen', 50000, '2026-03-01', 'Bank Transfer', 'TXN619083111', 'Approved', 'Bulk investment installment certificate.', 'NBHL Board Secretary'),
      ('c4', 'm2', 'NBHL0002', 'Ananya Sen', 20000, '2026-05-02', 'Physical Counter Cash', 'CSH100234', 'Approved', 'Counter teller deposit receipt.', 'NBHL Board Secretary')
    `);

    // Reset settings
    await client.query(`
      UPDATE system_settings
      SET company_name = 'Nijo Bhumi Home Land (NBHL)', support_email = 'support@nbhl.com', support_phone = '+91 90050 12345', maintenance_mode = false, allow_member_registration = true
      WHERE id = 'global_settings'
    `);

    // Audit log
    await client.query(`
      INSERT INTO system_logs (id, timestamp, actor, action, details, severity)
      VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5)
    `, ['log_factory_reset', 'Super Admin', 'DATABASE FACTORY RESET', 'Database was reverted to clean default seed state.', 'danger']);

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Database successfully restored to factory seed state.' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Factory reset error:', err);
    return res.status(500).json({ error: 'Factory reset failed: ' + err.message });
  } finally {
    client.release();
  }
});

export default app;
export { app };
