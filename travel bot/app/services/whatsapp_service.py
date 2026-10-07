import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Handles communication with WhatsApp Business Cloud API."""

    def __init__(self):
        self.mock_mode = settings.WHATSAPP_MOCK_MODE
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.api_version = settings.WHATSAPP_API_VERSION
        self.base_url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
        # In-memory outbound message log for testing & simulator inspection
        self.outbound_messages_log: List[Dict[str, Any]] = []

    async def _post_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send message payload to Meta Graph API or log in mock mode."""
        self.outbound_messages_log.append(payload)

        if self.mock_mode or not self.access_token or not self.phone_number_id:
            logger.info(
                f"[WHATSAPP MOCK DISPATCH] To: {payload.get('to')} | Payload: {payload}"
            )
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": payload.get("to"), "wa_id": payload.get("to")}],
                "messages": [{"id": f"wamid.mock_{len(self.outbound_messages_log)}"}],
            }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            if response.status_code >= 400:
                logger.error(
                    f"WhatsApp API Error {response.status_code}: {response.text}"
                )
                response.raise_for_status()
            return response.json()

    async def send_text_message(self, to_phone: str, text: str) -> Dict[str, Any]:
        """Send a plain text message to a WhatsApp user."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        return await self._post_message(payload)

    async def send_interactive_buttons(
        self, to_phone: str, text: str, buttons: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Send interactive quick reply buttons (up to 3 buttons supported by Meta).
        Example buttons: [{"id": "fl_1", "title": "Emirates (₹21.5k)"}, ...]
        """
        formatted_buttons = [
            {
                "type": "reply",
                "reply": {"id": btn["id"], "title": btn["title"][:20]},  # Max 20 chars
            }
            for btn in buttons[:3]
        ]

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": text},
                "action": {"buttons": formatted_buttons},
            },
        }
        return await self._post_message(payload)

    async def send_cta_payment_button(
        self, to_phone: str, body_text: str, button_text: str, payment_url: str
    ) -> Dict[str, Any]:
        """Send an interactive CTA URL button for Zoho Payment checkout."""
        # Note: WhatsApp Cloud API CTA URL button format
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": {
                "type": "cta_url",
                "body": {"text": body_text},
                "action": {
                    "name": "cta_url",
                    "parameters": {"display_text": button_text[:20], "url": payment_url},
                },
            },
        }
        return await self._post_message(payload)

    async def send_document(
        self, to_phone: str, document_url: str, filename: str, caption: str
    ) -> Dict[str, Any]:
        """Send an e-ticket PDF document to the WhatsApp customer."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "document",
            "document": {
                "link": document_url,
                "filename": filename,
                "caption": caption,
            },
        }
        return await self._post_message(payload)


whatsapp_service = WhatsAppService()
