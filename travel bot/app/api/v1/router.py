from fastapi import APIRouter
from app.api.v1.endpoints import (
    ai_chat,
    customers,
    conversations,
    flights,
    payments,
    bookings,
)

api_router = APIRouter()

api_router.include_router(ai_chat.router, prefix="/ai", tags=["AI & WhatsApp Webhook"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations & Messages"])
api_router.include_router(flights.router, prefix="/flights", tags=["Flight Search & Fares"])
api_router.include_router(payments.router, prefix="/payments", tags=["Zoho Payments"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings & PNR"])
