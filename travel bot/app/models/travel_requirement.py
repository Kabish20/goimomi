from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.conversation import Conversation


class TravelRequirement(Base, TimestampMixin):
    __tablename__ = "travel_requirements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    origin: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    travel_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    return_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    passengers_count: Mapped[int] = mapped_column(Integer, default=1)
    cabin_class: Mapped[str] = mapped_column(String(32), default="Economy")
    budget_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)
    raw_query: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="travel_requirements")

    def __repr__(self) -> str:
        return f"<TravelRequirement id={self.id} {self.origin}->{self.destination} date={self.travel_date}>"
