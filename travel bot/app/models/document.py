from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.booking import FlightBooking


class BookingDocument(Base, TimestampMixin):
    __tablename__ = "booking_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("flight_bookings.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(32), default="e_ticket")  # e_ticket, invoice, boarding_pass
    title: Mapped[str] = mapped_column(String(128))
    file_url: Mapped[str] = mapped_column(String(512))
    document_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    booking: Mapped["FlightBooking"] = relationship("FlightBooking", back_populates="documents")

    def __repr__(self) -> str:
        return f"<BookingDocument id={self.id} type={self.document_type} title='{self.title}'>"
