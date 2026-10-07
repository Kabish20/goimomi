from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.booking import FlightBooking
    from app.models.payment import Payment


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    phone_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    whatsapp_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="customer", cascade="all, delete-orphan"
    )
    bookings: Mapped[List["FlightBooking"]] = relationship(
        "FlightBooking", back_populates="customer"
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="customer"
    )

    def __repr__(self) -> str:
        return f"<Customer id={self.id} phone={self.phone_number} name={self.name}>"
