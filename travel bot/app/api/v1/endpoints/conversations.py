from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ConversationResponse, MessageResponse

router = APIRouter()


@router.get("/", response_model=List[ConversationResponse], summary="List conversations")
async def list_conversations(
    customer_id: Optional[int] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(Conversation).options(selectinload(Conversation.messages)).offset(skip).limit(limit).order_by(Conversation.id.desc())
    if customer_id:
        query = query.where(Conversation.customer_id == customer_id)
    if channel:
        query = query.where(Conversation.channel == channel)
    if status:
        query = query.where(Conversation.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{conversation_id}", response_model=ConversationResponse, summary="Get conversation by ID")
async def get_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse], summary="List messages in a conversation")
async def get_conversation_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
