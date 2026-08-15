-- NBHL PostgreSQL Production Database Schema
-- Multi-Device Synchronized Savings & Member Contribution Management

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
    plain_password VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

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

CREATE TABLE IF NOT EXISTS admin_accounts (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plain_password VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    address TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated')),
    permissions JSONB DEFAULT '{"all": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS superadmin_profile (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'root_superadmin',
    username VARCHAR(64) NOT NULL DEFAULT 'Sulagno',
    password_hash VARCHAR(255) NOT NULL,
    plain_password VARCHAR(255),
    is_default_password BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(128) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    severity VARCHAR(32) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger'))
);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'global_settings',
    company_name VARCHAR(255) NOT NULL DEFAULT 'Nijo Bhumi Home Land (NBHL)',
    support_email VARCHAR(255) NOT NULL DEFAULT 'support@nbhl.com',
    support_phone VARCHAR(64) NOT NULL DEFAULT '+91 90050 12345',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    allow_member_registration BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
