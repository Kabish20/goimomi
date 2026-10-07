from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PassengerInput(BaseModel):
    title: str = Field("Mr", example="Mr")
    first_name: str = Field(..., example="Kabir")
    last_name: str = Field(..., example="Sharma")
    date_of_birth: Optional[str] = Field(None, example="1992-05-14")
    gender: Optional[str] = Field(None, example="Male")
    passport_or_id: Optional[str] = Field(None, example="A12345678")
    seat_preference: Optional[str] = Field("Aisle", example="Window")


class PassengerResponse(PassengerInput):
    id: int
    booking_id: int

    model_config = ConfigDict(from_attributes=True)


class FlightBookRequest(BaseModel):
    flight_id: str
    customer_phone: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    conversation_id: Optional[int] = None
    passengers: List[PassengerInput]


class FlightBookingResponse(BaseModel):
    id: int
    booking_ref: str
    pnr: Optional[str] = None
    status: str
    airline_name: str
    airline_code: str
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    total_amount: float
    currency: str
    passengers: List[PassengerResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingCancelRequest(BaseModel):
    reason: Optional[str] = "Customer requested cancellation"


class BookingModifyRequest(BaseModel):
    new_travel_date: str
    notes: Optional[str] = None
