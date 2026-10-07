from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.payment import Payment
    from app.models.document import BookingDocument


class FlightSearch(Base, TimestampMixin):
    __tablename__ = "flight_searches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    origin: Mapped[str] = mapped_column(String(64), index=True)
    destination: Mapped[str] = mapped_column(String(64), index=True)
    travel_date: Mapped[str] = mapped_column(String(32), index=True)
    results_json: Mapped[dict] = mapped_column(JSON, default=dict)

    def __repr__(self) -> str:
        return f"<FlightSearch id={self.id} {self.origin}->{self.destination} on {self.travel_date}>"


class FlightBooking(Base, TimestampMixin):
    __tablename__ = "flight_bookings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    booking_ref: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    pnr: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    
    airline_name: Mapped[str] = mapped_column(String(128))
    airline_code: Mapped[str] = mapped_column(String(16))
    flight_number: Mapped[str] = mapped_column(String(32))
    origin: Mapped[str] = mapped_column(String(64))
    destination: Mapped[str] = mapped_column(String(64))
    departure_time: Mapped[str] = mapped_column(String(64))
    arrival_time: Mapped[str] = mapped_column(String(64))
    cabin_class: Mapped[str] = mapped_column(String(32), default="Economy")
    
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    status: Mapped[str] = mapped_column(String(32), default="pending_payment", index=True)
    # status: pending_payment, confirmed, cancelled, failed

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="bookings")
    passengers: Mapped[List["Passenger"]] = relationship(
        "Passenger", back_populates="booking", cascade="all, delete-orphan"
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="booking", cascade="all, delete-orphan"
    )
    documents: Mapped[List["BookingDocument"]] = relationship(
        "BookingDocument", back_populates="booking", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FlightBooking id={self.id} ref={self.booking_ref} pnr={self.pnr} status={self.status}>"


class Passenger(Base, TimestampMixin):
    __tablename__ = "passengers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("flight_bookings.id", ondelete="CASCADE"), index=True)
    
    title: Mapped[str] = mapped_column(String(16), default="Mr")
    first_name: Mapped[str] = mapped_column(String(64))
    last_name: Mapped[str] = mapped_column(String(64))
    date_of_birth: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    passport_or_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    seat_preference: Mapped[Optional[str]] = mapped_column(String(32), default="Window", nullable=True)

    # Relationships
    booking: Mapped["FlightBooking"] = relationship("FlightBooking", back_populates="passengers")

    def __repr__(self) -> str:
        return f"<Passenger id={self.id} name='{self.first_name} {self.last_name}'>"
