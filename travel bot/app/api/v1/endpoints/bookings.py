from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.booking import FlightBooking, Passenger
from app.schemas.booking import (
    FlightBookingResponse,
    BookingCancelRequest,
    BookingModifyRequest,
)

router = APIRouter()


@router.get("", response_model=List[FlightBookingResponse], summary="List all bookings")
@router.get("/", response_model=List[FlightBookingResponse], include_in_schema=False)
async def list_bookings(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(FlightBooking)
        .options(selectinload(FlightBooking.passengers))
        .offset(skip)
        .limit(limit)
        .order_by(FlightBooking.id.desc())
    )
    if customer_id:
        query = query.where(FlightBooking.customer_id == customer_id)
    if status_filter:
        query = query.where(FlightBooking.status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{booking_id}", response_model=FlightBookingResponse, summary="Get booking by ID")
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(FlightBooking)
        .options(selectinload(FlightBooking.passengers))
        .where(FlightBooking.id == booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


@router.post("/{booking_id}/cancel", response_model=FlightBookingResponse, summary="Cancel booking")
async def cancel_booking(booking_id: int, payload: BookingCancelRequest, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(FlightBooking)
        .options(selectinload(FlightBooking.passengers))
        .where(FlightBooking.id == booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = "cancelled"
    await db.commit()
    await db.refresh(booking)
    return booking


@router.post("/{booking_id}/modify", response_model=FlightBookingResponse, summary="Modify booking travel dates")
async def modify_booking(booking_id: int, payload: BookingModifyRequest, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(FlightBooking)
        .options(selectinload(FlightBooking.passengers))
        .where(FlightBooking.id == booking_id)
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Update date string
    booking.departure_time = f"{payload.new_travel_date} 04:15"
    booking.arrival_time = f"{payload.new_travel_date} 07:05"
    await db.commit()
    await db.refresh(booking)
    return booking
