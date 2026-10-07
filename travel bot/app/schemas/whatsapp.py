from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class WhatsAppProfile(BaseModel):
    name: Optional[str] = None


class WhatsAppContact(BaseModel):
    profile: Optional[WhatsAppProfile] = None
    wa_id: str


class WhatsAppTextMessage(BaseModel):
    body: str


class WhatsAppInteractiveButtonReply(BaseModel):
    id: str
    title: str


class WhatsAppInteractiveListReply(BaseModel):
    id: str
    title: str
    description: Optional[str] = None


class WhatsAppInteractiveMessage(BaseModel):
    type: str
    button_reply: Optional[WhatsAppInteractiveButtonReply] = None
    list_reply: Optional[WhatsAppInteractiveListReply] = None


class WhatsAppIncomingMessage(BaseModel):
    from_: str = Field(..., alias="from")
    id: str
    timestamp: str
    type: str
    text: Optional[WhatsAppTextMessage] = None
    interactive: Optional[WhatsAppInteractiveMessage] = None


class WhatsAppValue(BaseModel):
    messaging_product: str
    metadata: Dict[str, Any]
    contacts: Optional[List[WhatsAppContact]] = None
    messages: Optional[List[WhatsAppIncomingMessage]] = None


class WhatsAppChange(BaseModel):
    value: WhatsAppValue
    field: str


class WhatsAppEntry(BaseModel):
    id: str
    changes: List[WhatsAppChange]


class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[WhatsAppEntry]
