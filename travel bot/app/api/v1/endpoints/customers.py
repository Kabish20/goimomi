from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerResponse

router = APIRouter()


@router.get("", response_model=List[CustomerResponse], summary="List all customers")
@router.get("/", response_model=List[CustomerResponse], include_in_schema=False)
async def list_customers(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = select(Customer).offset(skip).limit(limit).order_by(Customer.id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{customer_id}", response_model=CustomerResponse, summary="Get customer by ID")
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(stmt)
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED, summary="Create new customer")
async def create_customer(payload: CustomerCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(Customer).where(Customer.phone_number == payload.phone_number)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")

    customer = Customer(
        phone_number=payload.phone_number,
        whatsapp_id=payload.whatsapp_id or payload.phone_number,
        name=payload.name,
        email=payload.email,
        preferences=payload.preferences or {},
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer
