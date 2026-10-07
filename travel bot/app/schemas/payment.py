from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PaymentCreateRequest(BaseModel):
    booking_id: int
    customer_phone: str
    amount: float
    currency: str = "INR"
    description: Optional[str] = "Flight Booking Payment"


class PaymentCreateResponse(BaseModel):
    payment_id: int
    gateway_order_id: str
    payment_url: str
    amount: float
    currency: str
    status: str


class ZohoWebhookPayload(BaseModel):
    order_id: str
    payment_id: Optional[str] = None
    status: str = "success"  # success, failure, pending
    amount: float
    currency: str = "INR"
    signature: Optional[str] = None
    raw_event: Optional[Dict[str, Any]] = None


class PaymentVerifyResponse(BaseModel):
    order_id: str
    payment_id: Optional[str] = None
    status: str
    is_verified: bool
    booking_id: Optional[int] = None
    pnr: Optional[str] = None
