import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let currentDbUrl: string | undefined = undefined;

/**
 * Get or create the PostgreSQL connection pool using DATABASE_URL
 */
export function getPool(): pg.Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!poolInstance || currentDbUrl !== databaseUrl) {
    currentDbUrl = databaseUrl;
    poolInstance = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });
  }
  return poolInstance;
}

export const pool = {
  query: (text: string, params?: any[]) => getPool().query(text, params),
  connect: () => getPool().connect(),
};

let isDbInitialized = false;

/**
 * Execute a query against the PostgreSQL pool with error handling
 */
export async function query(text: string, params?: any[]) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not configured. PostgreSQL database is required.');
  }
  return getPool().query(text, params);
}

/**
 * Get a dedicated client from the PostgreSQL pool
 */
export async function getDbClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: DATABASE_URL is missing in production environment.');
    }
    return null;
  }
  try {
    const client = await getPool().connect();
    return client;
  } catch (err) {
    console.error('PostgreSQL client connection failed:', err);
    return null;
  }
}

/**
 * Check if the database connection is healthy
 */
export async function isDbConnected(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  try {
    const res = await getPool().query('SELECT 1');
    return res.rowCount !== null && res.rowCount > 0;
  } catch {
    return false;
  }
}

/**
 * Initialize PostgreSQL tables, constraints, and initial administrative seed data
 */
export async function initPostgresDatabase(): Promise<boolean> {
  if (isDbInitialized) return true;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const msg = 'CRITICAL: DATABASE_URL environment variable is not set. PostgreSQL is mandatory.';
    if (process.env.NODE_ENV === 'production') {
      console.error(msg);
    } else {
      console.warn(msg);
    }
    return false;
  }

  const client = await getDbClient();
  if (!client) {
    console.error('❌ Could not connect to PostgreSQL database via DATABASE_URL.');
    return false;
  }

  try {
    console.log('🔄 Initializing NBHL PostgreSQL database schema and constraints...');

    // Members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(64) PRIMARY KEY,
        member_code VARCHAR(32) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        joining_date DATE NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted')),
        password_hash VARCHAR(255) NOT NULL,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);
      CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
      CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
    `);

    // Clean up any legacy plain_password columns from previous versions if present
    await client.query(`
      ALTER TABLE members DROP COLUMN IF EXISTS plain_password;
    `);

    // Contributions table (NO REFERRAL BONUS / BONUS REWARD FIELDS)
    await client.query(`
      CREATE TABLE IF NOT EXISTS contributions (
        id VARCHAR(64) PRIMARY KEY,
        member_id VARCHAR(64) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        member_code VARCHAR(32) NOT NULL,
        member_name VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        payment_date DATE NOT NULL,
        payment_method VARCHAR(64) NOT NULL,
        reference_number VARCHAR(128) UNIQUE NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'Approved' CHECK (status IN ('Approved', 'Pending', 'Rejected')),
        notes TEXT,
        submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        action_taken_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON contributions(member_id);
      CREATE INDEX IF NOT EXISTS idx_contributions_member_code ON contributions(member_code);
      CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
      CREATE INDEX IF NOT EXISTS idx_contributions_payment_date ON contributions(payment_date);
    `);

    // Admin Accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        address TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated')),
        permissions JSONB DEFAULT '{"all": true}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMPTZ
      );
    `);

    await client.query(`
      ALTER TABLE admin_accounts DROP COLUMN IF EXISTS plain_password;
    `);

    // Super Admin profile table
    await client.query(`
      CREATE TABLE IF NOT EXISTS superadmin_profile (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'root_superadmin',
        username VARCHAR(64) NOT NULL DEFAULT 'Sulagno',
        password_hash VARCHAR(255) NOT NULL,
        is_default_password BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE superadmin_profile DROP COLUMN IF EXISTS plain_password;
    `);

    // System audit logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR(64) PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        actor VARCHAR(128) NOT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        severity VARCHAR(32) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger'))
      );
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
    `);

    // System settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'global_settings',
        company_name VARCHAR(255) NOT NULL DEFAULT 'Nijo Bhumi Home Land (NBHL)',
        support_email VARCHAR(255) NOT NULL DEFAULT 'support@nbhl.com',
        support_phone VARCHAR(64) NOT NULL DEFAULT '+91 90050 12345',
        maintenance_mode BOOLEAN DEFAULT FALSE,
        allow_member_registration BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User Sessions for concurrent multi-device logins
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL,
        device_info TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    `);

    // Seed Super Admin if not exists
    const superAdminRes = await client.query('SELECT * FROM superadmin_profile WHERE id = $1', ['root_superadmin']);
    if (superAdminRes.rows.length === 0) {
      const superHash = await bcrypt.hash('161020', 10);
      await client.query(`
        INSERT INTO superadmin_profile (id, username, password_hash, is_default_password)
        VALUES ($1, $2, $3, $4)
      `, ['root_superadmin', 'Sulagno', superHash, true]);
    }

    // Seed Board Director Admin if not exists
    const adminRes = await client.query('SELECT * FROM admin_accounts LIMIT 1');
    if (adminRes.rows.length === 0) {
      const adminHash = await bcrypt.hash('101020', 10);
      await client.query(`
        INSERT INTO admin_accounts (id, username, password_hash, email, phone, address, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'admin_1',
        'Prasanta',
        adminHash,
        'prasanta@nbhl.com',
        '+91 90050 12345',
        'NBHL Corporate HQ, Salt Lake Sector III, Kolkata, WB',
        'Active'
      ]);
    }

    // Seed Initial Members if not exists
    const membersRes = await client.query('SELECT COUNT(*) FROM members');
    if (parseInt(membersRes.rows[0].count, 10) === 0) {
      const initialMembers = [
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

      for (const m of initialMembers) {
        const hash = await bcrypt.hash(m.password, 10);
        await client.query(`
          INSERT INTO members (id, member_code, name, phone, email, address, joining_date, status, password_hash, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          m.id,
          m.member_code,
          m.name,
          m.phone,
          m.email,
          m.address,
          m.joining_date,
          m.status,
          hash,
          m.deleted_at || null
        ]);
      }

      // Seed Initial Contributions
      const initialContribs = [
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
        }
      ];

      for (const c of initialContribs) {
        await client.query(`
          INSERT INTO contributions (id, member_id, member_code, member_name, amount, payment_date, payment_method, reference_number, status, notes, submitted_at, action_taken_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          c.id,
          c.member_id,
          c.member_code,
          c.member_name,
          c.amount,
          c.payment_date,
          c.payment_method,
          c.reference_number,
          c.status,
          c.notes,
          c.submitted_at,
          'NBHL Board Secretary'
        ]);
      }
    }

    // Seed Settings if not exists
    const settingsRes = await client.query('SELECT * FROM system_settings WHERE id = $1', ['global_settings']);
    if (settingsRes.rows.length === 0) {
      await client.query(`
        INSERT INTO system_settings (id, company_name, support_email, support_phone, maintenance_mode, allow_member_registration)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['global_settings', 'Nijo Bhumi Home Land (NBHL)', 'support@nbhl.com', '+91 90050 12345', false, true]);
    }

    // Seed System Log
    const logsCount = await client.query('SELECT COUNT(*) FROM system_logs');
    if (parseInt(logsCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO system_logs (id, timestamp, actor, action, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'log_init',
        new Date().toISOString(),
        'PostgreSQL Migration Engine',
        'Database Connected & Synced',
        'PostgreSQL schema deployed with encrypted credential verification and zero plaintext password exposure.',
        'info'
      ]);
    }

    console.log('✅ PostgreSQL database tables and constraints initialized successfully!');
    isDbInitialized = true;
    return true;
  } catch (err) {
    console.error('❌ Error during PostgreSQL schema initialization:', err);
    return false;
  } finally {
    client.release();
  }
}
