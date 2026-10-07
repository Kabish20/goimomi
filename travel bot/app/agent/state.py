from typing import List, Dict, Any, Optional, Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class TravelRequirements(TypedDict, total=False):
    trip_type: Optional[str]  # 'One Way', 'Round Trip', 'Multi City'
    origin: Optional[str]
    destination: Optional[str]
    travel_date: Optional[str]
    return_date: Optional[str]
    multi_city_legs: Optional[List[Dict[str, str]]]  # [{'from': ..., 'to': ..., 'date': ...}, ...]
    passengers_count: int
    adults_count: int      # Age 12+
    children_count: int    # Age 2 - 12
    infants_count: int     # Age 0 - 2
    cabin_class: Optional[str]  # 'Economy', 'Premium Economy', 'Business', 'First'
    special_fare: Optional[str]  # 'Regular', 'Student', 'Senior Citizen', 'Corporate', 'Armed Forces'
    time_preference: Optional[str]  # 'morning', 'afternoon', 'evening', 'night'

    # Customer Contact & Passenger Details
    first_name: Optional[str]
    last_name: Optional[str]
    passport_no: Optional[str]
    country_code: Optional[str]
    mobile_number: Optional[str]
    mail_id: Optional[str]


class AgentState(TypedDict, total=False):
    messages: Annotated[List[BaseMessage], add_messages]
    phone_number: str
    customer_name: Optional[str]
    customer_id: Optional[int]
    conversation_id: Optional[int]
    
    # State Machine Flow Stages:
    # 'idle', 'awaiting_trip_type', 'awaiting_route', 'awaiting_dates', 'awaiting_passengers', 'awaiting_cabin_class',
    # 'flights_offered', 'flight_selected', 'collecting_passengers', 'awaiting_payment', 'confirmed'
    current_stage: str
    
    travel_details: TravelRequirements
    flight_results: List[Dict[str, Any]]
    selected_flight: Optional[Dict[str, Any]]
    fare_details: Optional[Dict[str, Any]]
    passengers: List[Dict[str, Any]]
    
    booking_ref: Optional[str]
    pnr: Optional[str]
    ticket_pdf_url: Optional[str]
    
    payment_info: Optional[Dict[str, Any]]
    
    last_bot_reply: str
    interactive_buttons: Optional[List[Dict[str, str]]]
    payment_url: Optional[str]
