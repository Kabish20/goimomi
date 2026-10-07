from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    phone_number: str = Field(..., example="+919876543210")
    message: str = Field(..., example="Find me a flight from Chennai to Dubai on 20 October")
    customer_name: Optional[str] = Field(None, example="Arjun")
    channel: str = Field("whatsapp", example="whatsapp")


class AIChatResponse(BaseModel):
    phone_number: str
    reply_text: str
    current_stage: str
    suggested_actions: Optional[List[str]] = None
    payment_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
