import logging
from typing import Dict, Any
from fastapi import APIRouter, Query, Request, Response, HTTPException, status
from app.core.config import settings
from app.schemas.chat import AIChatRequest, AIChatResponse
from app.agent.graph import process_user_turn

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=AIChatResponse, summary="Direct AI Chat Endpoint")
async def chat_with_agent(payload: AIChatRequest):
    """
    Direct REST endpoint to chat with the AI Travel Agent.
    Used by testing tools, web chat widgets, and simulator interfaces.
    """
    result = await process_user_turn(
        phone_number=payload.phone_number,
        incoming_text=payload.message,
        customer_name=payload.customer_name,
        channel=payload.channel,
    )
    return AIChatResponse(
        phone_number=result["phone_number"],
        reply_text=result["reply_text"],
        current_stage=result["current_stage"],
        suggested_actions=result.get("suggested_actions", []),
        payment_url=result.get("payment_url"),
        data={
            "booking_ref": result.get("booking_ref"),
            "pnr": result.get("pnr"),
            "payment_url": result.get("payment_url"),
        },
    )


@router.get("/webhook/whatsapp", summary="WhatsApp Webhook Verification")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Verification endpoint required by Meta WhatsApp Cloud API setup.
    Meta makes a GET request to verify the webhook URL with hub.verify_token.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp Webhook verified successfully!")
        return Response(content=hub_challenge, media_type="text/plain")

    logger.warning("WhatsApp Webhook verification failed. Invalid token.")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@router.post("/webhook/whatsapp", summary="WhatsApp Inbound Message Webhook")
async def receive_whatsapp_message(request: Request):
    """
    Receives incoming WhatsApp messages from Meta Cloud API.
    Parses text, interactive button clicks, and list replies, then executes the LangGraph Agent turn.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    logger.info(f"Incoming WhatsApp webhook payload: {body}")

    # Process Meta Webhook entry format
    entries = body.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            messages = value.get("messages", [])
            contacts = value.get("contacts", [])

            contact_name = None
            if contacts:
                contact_name = contacts[0].get("profile", {}).get("name")

            for msg in messages:
                sender_phone = msg.get("from")
                msg_id = msg.get("id")
                msg_type = msg.get("type")

                incoming_text = ""
                if msg_type == "text":
                    incoming_text = msg.get("text", {}).get("body", "")
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    # Button reply or list reply
                    if "button_reply" in interactive:
                        incoming_text = interactive["button_reply"].get("id") or interactive["button_reply"].get("title")
                    elif "list_reply" in interactive:
                        incoming_text = interactive["list_reply"].get("id") or interactive["list_reply"].get("title")

                if sender_phone and incoming_text:
                    await process_user_turn(
                        phone_number=sender_phone,
                        incoming_text=incoming_text,
                        customer_name=contact_name,
                        channel="whatsapp",
                        whatsapp_message_id=msg_id,
                    )

    return {"status": "success", "message": "Processed WhatsApp event"}
