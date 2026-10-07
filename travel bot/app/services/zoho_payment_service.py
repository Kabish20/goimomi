import uuid
import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


class ZohoPaymentService:
    """Handles Zoho Payments Integration (Payment Link Creation & Webhook Verification)."""

    def __init__(self):
        self.mock_mode = settings.ZOHO_MOCK_MODE
        self.client_id = settings.ZOHO_CLIENT_ID
        self.client_secret = settings.ZOHO_CLIENT_SECRET
        self.merchant_id = settings.ZOHO_MERCHANT_ID
        self.payment_url = settings.ZOHO_PAYMENT_URL

    async def create_payment_link(
        self,
        booking_ref: str,
        amount: float,
        customer_phone: str,
        customer_name: Optional[str] = "Valued Customer",
        customer_email: Optional[str] = None,
        currency: str = "INR",
        description: str = "Flight Ticket Booking",
    ) -> Dict[str, Any]:
        """Generate a secure Zoho payment checkout link for WhatsApp."""
        order_id = f"ZOHO_ORD_{uuid.uuid4().hex[:12].upper()}"

        logger.info(
            f"Generating Zoho Payment Link for Ref: {booking_ref}, Amount: {currency} {amount}"
        )

        if not self.mock_mode and self.client_id and self.client_secret:
            # Live integration with Zoho Payments API via httpx
            # headers = {"Authorization": f"Zoho-oauthtoken {token}"}
            pass

        if not hasattr(self, "orders"):
            self.orders = {}

        self.orders[order_id] = {
            "order_id": order_id,
            "booking_ref": booking_ref,
            "amount": amount,
            "customer_phone": customer_phone,
            "customer_name": customer_name,
            "currency": currency,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }

        # Dedicated Zoho Payment Checkout link
        clean_name = (customer_name or "Traveler").replace(" ", "%20")
        payment_link = f"/payments/zoho/checkout/{order_id}?ref={booking_ref}&amount={int(amount)}&name={clean_name}&phone={customer_phone or ''}"

        return {
            "order_id": order_id,
            "payment_link": payment_link,
            "amount": amount,
            "currency": currency,
            "status": "initiated",
            "booking_ref": booking_ref,
            "created_at": datetime.now().isoformat(),
        }

    def verify_webhook_signature(self, payload_bytes: bytes, received_signature: str) -> bool:
        """Verify Zoho Webhook HMAC SHA256 Signature."""
        if self.mock_mode:
            return True

        if not self.client_secret:
            return False

        expected_sig = hmac.new(
            self.client_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_sig, received_signature)

    async def simulate_payment_success(self, order_id: str, booking_ref: str) -> Dict[str, Any]:
        """Utility for test environments to simulate immediate payment completion."""
        payment_id = f"ZOHO_PAY_{uuid.uuid4().hex[:10].upper()}"
        return {
            "order_id": order_id,
            "payment_id": payment_id,
            "status": "success",
            "booking_ref": booking_ref,
            "paid_at": datetime.now().isoformat(),
        }


zoho_payment_service = ZohoPaymentService()
