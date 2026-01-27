"""
Supplier Management Models and Database Tables
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Supplier(Base):
    """Supplier/Vendor Master"""
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    company_name = Column(String(255))
    gstin = Column(String(20))
    bank_account = Column(String(255))
    bank_name = Column(String(255))
    account_holder = Column(String(255))
    ifsc_code = Column(String(20))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    
    # Status
    status = Column(String(50), default='active')  # active, inactive, blocked
    is_verified = Column(Boolean, default=False)
    verification_docs = Column(JSON)  # URLs of uploaded docs
    
    # Password (hashed)
    password_hash = Column(String(255))
    
    # Authentication
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    products = relationship("SupplierProduct", back_populates="supplier")
    deliveries = relationship("SupplierDelivery", back_populates="supplier")
    payables = relationship("SupplierPayable", back_populates="supplier")
    documents = relationship("SupplierDocument", back_populates="supplier")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'company_name': self.company_name,
            'gstin': self.gstin,
            'city': self.city,
            'state': self.state,
            'status': self.status,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SupplierProduct(Base):
    """Product linked to Supplier with pricing"""
    __tablename__ = "supplier_products"
    
    id = Column(Integer, primary_key=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    
    # Pricing
    purchase_rate = Column(Float, nullable=False)  # Cost per unit
    agreed_quantity = Column(Integer, nullable=False)  # Daily quantity
    delivery_cutoff_time = Column(String(5))  # HH:MM format (e.g., "05:00")
    
    # SLA Terms
    delivery_frequency = Column(String(50))  # daily, weekly, biweekly
    lead_time_days = Column(Integer, default=0)
    penalty_per_day_late = Column(Float, default=0)  # Penalty for late delivery
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="products")
    product = relationship("Product", back_populates="suppliers")
    deliveries = relationship("SupplierDelivery", back_populates="supplier_product")
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'product_id': self.product_id,
            'purchase_rate': self.purchase_rate,
            'agreed_quantity': self.agreed_quantity,
            'delivery_cutoff_time': self.delivery_cutoff_time,
            'delivery_frequency': self.delivery_frequency,
            'is_active': self.is_active,
        }


class SupplierDelivery(Base):
    """Track daily deliveries from supplier"""
    __tablename__ = "supplier_deliveries"
    
    id = Column(Integer, primary_key=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    supplier_product_id = Column(Integer, ForeignKey('supplier_products.id'), nullable=False)
    
    # Expected vs Actual
    expected_quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, nullable=False)
    delivery_date = Column(DateTime, nullable=False)
    expected_time = Column(String(5))  # HH:MM
    received_time = Column(String(5))  # HH:MM
    
    # Quality metrics
    quality_notes = Column(Text)
    rejection_quantity = Column(Integer, default=0)
    rejection_reason = Column(String(255))
    
    # SLA tracking
    delay_minutes = Column(Integer, default=0)
    penalty_applied = Column(Float, default=0)
    
    # Status
    status = Column(String(50), default='delivered')  # delivered, rejected, partial, cancelled
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="deliveries")
    supplier_product = relationship("SupplierProduct", back_populates="deliveries")
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'expected_quantity': self.expected_quantity,
            'received_quantity': self.received_quantity,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'received_time': self.received_time,
            'delay_minutes': self.delay_minutes,
            'penalty_applied': self.penalty_applied,
            'status': self.status,
        }


class SupplierPayable(Base):
    """Monthly/Period payables for supplier"""
    __tablename__ = "supplier_payables"
    
    id = Column(Integer, primary_key=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    period_month = Column(String(7))  # YYYY-MM
    
    # Calculations
    total_quantity = Column(Integer, default=0)
    gross_amount = Column(Float, default=0)  # Total quantity * purchase rate
    
    # Deductions
    penalty_deductions = Column(Float, default=0)  # SLA penalties
    damage_deductions = Column(Float, default=0)
    shortage_deductions = Column(Float, default=0)
    other_deductions = Column(Float, default=0)
    
    total_deductions = Column(Float, default=0)
    net_payable = Column(Float, default=0)  # Gross - deductions
    
    # Payment tracking
    payment_status = Column(String(50), default='pending')  # pending, partially_paid, paid
    amount_paid = Column(Float, default=0)
    payment_date = Column(DateTime, nullable=True)
    payment_reference = Column(String(255))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="payables")
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'period_month': self.period_month,
            'total_quantity': self.total_quantity,
            'gross_amount': self.gross_amount,
            'total_deductions': self.total_deductions,
            'net_payable': self.net_payable,
            'payment_status': self.payment_status,
            'amount_paid': self.amount_paid,
        }


class SupplierDocument(Base):
    """Supplier verification documents (GST, bank, license, etc.)"""
    __tablename__ = "supplier_documents"
    
    id = Column(Integer, primary_key=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    document_type = Column(String(50))  # gstin, bank_proof, license, id_proof
    document_url = Column(String(500))
    document_name = Column(String(255))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="documents")
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'document_type': self.document_type,
            'document_name': self.document_name,
            'verified': self.verified,
        }
