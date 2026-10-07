import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.services.flight_service import flight_service
from app.schemas.flight import (
    FlightSearchRequest,
    FlightSearchResponse,
    FlightFareBreakdown,
    FlightOption,
)
from app.schemas.booking import FlightBookRequest, FlightBookingResponse
from app.models.customer import Customer
from app.models.booking import FlightSearch, FlightBooking, Passenger

router = APIRouter()


@router.post("/search", response_model=FlightSearchResponse, summary="Search Flights")
async def search_flights_endpoint(payload: FlightSearchRequest, db: AsyncSession = Depends(get_db)):
    """Search available flights across carriers."""
    flights_data = await flight_service.search_flights(
        origin=payload.origin,
        destination=payload.destination,
        travel_date=payload.travel_date,
        return_date=payload.return_date,
        passengers_count=payload.passengers_count,
        cabin_class=payload.cabin_class,
    )

    search_id = f"SRCH-{uuid.uuid4().hex[:8].upper()}"

    # Log search in DB
    try:
        db_search = FlightSearch(
            origin=payload.origin,
            destination=payload.destination,
            travel_date=payload.travel_date,
            results_json={"flights": flights_data},
        )
        db.add(db_search)
        await db.commit()
    except Exception:
        pass

    flight_options = [FlightOption(**f) for f in flights_data]

    return FlightSearchResponse(
        search_id=search_id,
        origin=payload.origin,
        destination=payload.destination,
        travel_date=payload.travel_date,
        total_found=len(flight_options),
        flights=flight_options,
    )


@router.get("/fare", response_model=FlightFareBreakdown, summary="Get Flight Fare Rules & Breakdown")
async def get_flight_fare(flight_id: str = Query(..., examples=["FL-EK543"])):
    """Get tax breakdown, baggage limits, and cancellation terms."""
    breakdown = await flight_service.get_fare_breakdown(flight_id)
    return FlightFareBreakdown(
        flight_id=flight_id,
        airline_name="Selected Airline",
        flight_number=flight_id.replace("FL-", ""),
        base_fare=breakdown["base_fare"],
        taxes_and_surcharges=breakdown["taxes_and_surcharges"],
        total_fare=breakdown["total_fare"],
        currency=breakdown["currency"],
        baggage_rules=breakdown["baggage_rules"],
        cancellation_fee=breakdown["cancellation_fee"],
        date_change_fee=breakdown["date_change_fee"],
    )


@router.post("/book", response_model=FlightBookingResponse, status_code=status.HTTP_201_CREATED, summary="Direct Flight Booking")
async def book_flight(payload: FlightBookRequest, db: AsyncSession = Depends(get_db)):
    """Book a flight and issue PNR."""
    # Find or create customer
    stmt = select(Customer).where(Customer.phone_number == payload.customer_phone)
    cust = (await db.execute(stmt)).scalar_one_or_none()
    if not cust:
        cust = Customer(
            phone_number=payload.customer_phone,
            name=payload.customer_name or "Traveler",
            email=payload.customer_email,
        )
        db.add(cust)
        await db.flush()

    ticket_info = await flight_service.generate_pnr_and_ticket(
        airline_code="EK",
        flight_number="EK 543",
        origin="MAA",
        destination="DXB",
        passengers=[p.model_dump() for p in payload.passengers],
    )

    booking = FlightBooking(
        booking_ref=ticket_info["booking_ref"],
        pnr=ticket_info["pnr"],
        customer_id=cust.id,
        conversation_id=payload.conversation_id,
        airline_name="Emirates",
        airline_code="EK",
        flight_number="EK 543",
        origin="Chennai (MAA)",
        destination="Dubai (DXB)",
        departure_time="2026-10-20 04:15",
        arrival_time="2026-10-20 07:05",
        total_amount=21500.0 * len(payload.passengers),
        currency="INR",
        status="confirmed",
    )
    db.add(booking)
    await db.flush()

    for p in payload.passengers:
        db.add(
            Passenger(
                booking_id=booking.id,
                title=p.title,
                first_name=p.first_name,
                last_name=p.last_name,
                date_of_birth=p.date_of_birth,
                gender=p.gender,
                passport_or_id=p.passport_or_id,
                seat_preference=p.seat_preference,
            )
        )

    await db.commit()
    await db.refresh(booking)

    # Reload with passengers
    res_b = await db.execute(
        select(FlightBooking)
        .options(select.lazyload if hasattr(select, "lazyload") else lambda x: x)
        .where(FlightBooking.id == booking.id)
    )
    return booking
