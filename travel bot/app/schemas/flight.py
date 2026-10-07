from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FlightSearchRequest(BaseModel):
    origin: str = Field(..., example="Chennai", description="Departure city or airport IATA code (e.g. MAA)")
    destination: str = Field(..., example="Dubai", description="Destination city or airport IATA code (e.g. DXB)")
    travel_date: str = Field(..., example="2026-10-20", description="Date of travel (YYYY-MM-DD or readable string)")
    return_date: Optional[str] = Field(None, example="2026-10-27")
    passengers_count: int = Field(1, ge=1, le=9)
    cabin_class: str = Field("Economy", example="Economy")


class FlightOption(BaseModel):
    flight_id: str
    airline_name: str
    airline_code: str
    flight_number: str
    origin: str
    origin_code: str
    destination: str
    destination_code: str
    departure_time: str
    arrival_time: str
    duration: str
    stops: int = 0
    cabin_class: str = "Economy"
    price: float
    currency: str = "INR"
    baggage_allowance: str = "30 kg check-in, 7 kg cabin"
    refundable: bool = True


class FlightSearchResponse(BaseModel):
    search_id: Optional[str] = None
    origin: str
    destination: str
    travel_date: str
    total_found: int
    flights: List[FlightOption]


class FlightFareBreakdown(BaseModel):
    flight_id: str
    airline_name: str
    flight_number: str
    base_fare: float
    taxes_and_surcharges: float
    total_fare: float
    currency: str = "INR"
    baggage_rules: str
    cancellation_fee: str
    date_change_fee: str
