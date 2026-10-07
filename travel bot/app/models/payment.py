import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Float, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.booking import FlightBooking


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("flight_bookings.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    
    payment_gateway: Mapped[str] = mapped_column(String(32), default="zoho")
    gateway_order_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    gateway_payment_id: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    payment_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    # status: pending, success, failed, expired, refunded
    
    raw_callback: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    paid_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="payments")
    booking: Mapped["FlightBooking"] = relationship("FlightBooking", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} order={self.gateway_order_id} amount={self.amount} status={self.status}>"
