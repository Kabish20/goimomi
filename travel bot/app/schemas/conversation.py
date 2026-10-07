from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MessageBase(BaseModel):
    sender: str
    message_type: str = "text"
    content: str
    raw_payload: Optional[Dict[str, Any]] = None
    whatsapp_message_id: Optional[str] = None


class MessageCreate(MessageBase):
    conversation_id: int


class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationBase(BaseModel):
    customer_id: int
    channel: str = "whatsapp"
    status: str = "active"
    current_stage: str = "idle"
    session_metadata: Optional[Dict[str, Any]] = None


class ConversationCreate(ConversationBase):
    pass


class ConversationResponse(ConversationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)
