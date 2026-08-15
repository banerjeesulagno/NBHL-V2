import os
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Member(UserMixin, db.Model):
    __tablename__ = 'members'

    id = db.Column(db.String(64), primary_key=True)
    member_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(64), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text, nullable=False)
    joining_date = db.Column(db.Date, nullable=False, default=lambda: datetime.now(timezone.utc).date())
    status = db.Column(db.String(32), nullable=False, default='Active', index=True) # Active, Inactive, Deleted
    password_hash = db.Column(db.String(255), nullable=False)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    contributions = db.relationship('Contribution', backref='member', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'member_code': self.member_code,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'joining_date': self.joining_date.isoformat() if self.joining_date else '',
            'status': self.status,
            'password': '••••••',
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None
        }


class Contribution(db.Model):
    __tablename__ = 'contributions'

    id = db.Column(db.String(64), primary_key=True)
    member_id = db.Column(db.String(64), db.ForeignKey('members.id', ondelete='CASCADE'), nullable=False, index=True)
    member_code = db.Column(db.String(32), nullable=False, index=True)
    member_name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    payment_method = db.Column(db.String(64), nullable=False)
    reference_number = db.Column(db.String(128), unique=True, nullable=False)
    status = db.Column(db.String(32), nullable=False, default='Approved', index=True) # Approved, Pending, Rejected
    notes = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    action_taken_by = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'member_code': self.member_code,
            'member_name': self.member_name,
            'amount': float(self.amount),
            'payment_date': self.payment_date.isoformat() if self.payment_date else '',
            'payment_method': self.payment_method,
            'reference_number': self.reference_number,
            'status': self.status,
            'notes': self.notes or '',
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else '',
            'action_taken_by': self.action_taken_by or 'NBHL Board Secretary'
        }


class AdminAccount(UserMixin, db.Model):
    __tablename__ = 'admin_accounts'

    id = db.Column(db.String(64), primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(64), nullable=False)
    address = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(32), nullable=False, default='Active') # Active, Deactivated
    permissions = db.Column(db.JSON, default=lambda: {'all': True})
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'password': '••••••',
            'email': self.email,
            'phone': self.phone,
            'address': self.address or '',
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class SuperAdminProfile(UserMixin, db.Model):
    __tablename__ = 'superadmin_profile'

    id = db.Column(db.String(64), primary_key=True, default='root_superadmin')
    username = db.Column(db.String(64), nullable=False, default='Sulagno')
    password_hash = db.Column(db.String(255), nullable=False)
    is_default_password = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.is_default_password = (password == '161020')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'username': self.username,
            'isDefaultPassword': self.is_default_password,
            'lastLogin': self.last_login.isoformat() if self.last_login else None
        }


class SystemLog(db.Model):
    __tablename__ = 'system_logs'

    id = db.Column(db.String(64), primary_key=True)
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    actor = db.Column(db.String(128), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    details = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(32), nullable=False, default='info') # info, warning, danger

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else datetime.now(timezone.utc).isoformat(),
            'actor': self.actor,
            'action': self.action,
            'details': self.details or '',
            'severity': self.severity
        }


class SystemSettings(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.String(64), primary_key=True, default='global_settings')
    company_name = db.Column(db.String(255), nullable=False, default='Nijo Bhumi Home Land (NBHL)')
    support_email = db.Column(db.String(255), nullable=False, default='support@nbhl.com')
    support_phone = db.Column(db.String(64), nullable=False, default='+91 90050 12345')
    maintenance_mode = db.Column(db.Boolean, default=False)
    allow_member_registration = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'companyName': self.company_name,
            'supportEmail': self.support_email,
            'supportPhone': self.support_phone,
            'maintenanceMode': self.maintenance_mode,
            'allowMemberRegistration': self.allow_member_registration
        }
