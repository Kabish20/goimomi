import logging
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage

from app.agent.state import AgentState
from app.agent.nodes import parse_and_route_node
from app.services.whatsapp_service import whatsapp_service
from app.core.database import get_session_context
from app.models.customer import Customer
from app.models.conversation import Conversation, Message
from app.models.booking import FlightBooking, Passenger
from app.models.payment import Payment
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Build the LangGraph StateGraph
builder = StateGraph(AgentState)
builder.add_node("process_turn", parse_and_route_node)
builder.add_edge(START, "process_turn")
builder.add_edge("process_turn", END)

checkpointer = MemorySaver()
agent_graph = builder.compile(checkpointer=checkpointer)

# In-memory session tracking for quick state preservation per phone
phone_session_cache: Dict[str, Dict[str, Any]] = {}


async def process_user_turn(
    phone_number: str,
    incoming_text: str,
    customer_name: Optional[str] = None,
    channel: str = "whatsapp",
    whatsapp_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main orchestration function:
    1. Loads / Creates Customer & Conversation in DB
    2. Retrieves active state
    3. Runs LangGraph state transition
    4. Persists message records and bookings to DB
    5. Dispatches reply via WhatsApp Cloud API
    """
    clean_phone = phone_number.strip().replace(" ", "").replace("-", "")

    # Retrieve existing state or initialize new
    current_state = phone_session_cache.get(clean_phone, {
        "phone_number": clean_phone,
        "customer_name": customer_name or "Traveler",
        "current_stage": "idle",
        "messages": [],
        "travel_details": {},
        "flight_results": [],
        "selected_flight": None,
        "passengers": [],
        "booking_ref": None,
        "pnr": None,
        "payment_info": None,
    })

    # Append new human message
    current_messages = list(current_state.get("messages", []))
    current_messages.append(HumanMessage(content=incoming_text))
    current_state["messages"] = current_messages

    # Run LangGraph with phone thread config
    config = {"configurable": {"thread_id": clean_phone}}
    updated_state = await agent_graph.ainvoke(current_state, config)

    # Merge state update back
    for k, v in updated_state.items():
        if v is not None:
            current_state[k] = v

    bot_reply = current_state.get("last_bot_reply", "How can I help you today?")
    current_messages.append(AIMessage(content=bot_reply))
    current_state["messages"] = current_messages
    phone_session_cache[clean_phone] = current_state

    # Persist in Database asynchronously
    try:
        async with get_session_context() as session:
            # 1. Fetch or create customer
            stmt = select(Customer).where(Customer.phone_number == clean_phone)
            res = await session.execute(stmt)
            customer = res.scalar_one_or_none()

            if not customer:
                customer = Customer(
                    phone_number=clean_phone,
                    name=customer_name or "Traveler",
                    whatsapp_id=clean_phone,
                )
                session.add(customer)
                await session.flush()

            # 2. Fetch or create active conversation
            conv_stmt = (
                select(Conversation)
                .where(Conversation.customer_id == customer.id, Conversation.status == "active")
                .order_by(Conversation.id.desc())
            )
            c_res = await session.execute(conv_stmt)
            conv = c_res.scalar_one_or_none()

            if not conv:
                conv = Conversation(
                    customer_id=customer.id,
                    channel=channel,
                    status="active",
                    current_stage=current_state.get("current_stage", "idle"),
                )
                session.add(conv)
                await session.flush()
            else:
                conv.current_stage = current_state.get("current_stage", "idle")

            # 3. Save incoming customer message
            session.add(
                Message(
                    conversation_id=conv.id,
                    sender="customer",
                    message_type="text",
                    content=incoming_text,
                    whatsapp_message_id=whatsapp_message_id,
                )
            )

            # 4. Save outgoing bot message
            session.add(
                Message(
                    conversation_id=conv.id,
                    sender="bot",
                    message_type="interactive" if current_state.get("interactive_buttons") else "text",
                    content=bot_reply,
                )
            )

            # 5. If booking confirmed, persist flight booking & passengers
            if current_state.get("current_stage") == "confirmed" and current_state.get("pnr"):
                sel = current_state.get("selected_flight", {})
                existing_b_stmt = select(FlightBooking).where(FlightBooking.pnr == current_state.get("pnr"))
                existing_b = (await session.execute(existing_b_stmt)).scalar_one_or_none()

                if not existing_b:
                    flight_booking = FlightBooking(
                        booking_ref=current_state.get("booking_ref", "TB-2026"),
                        pnr=current_state.get("pnr"),
                        customer_id=customer.id,
                        conversation_id=conv.id,
                        airline_name=sel.get("airline_name", "Airline"),
                        airline_code=sel.get("airline_code", "XX"),
                        flight_number=sel.get("flight_number", "XX 100"),
                        origin=sel.get("origin", "Origin"),
                        destination=sel.get("destination", "Destination"),
                        departure_time=sel.get("departure_time", ""),
                        arrival_time=sel.get("arrival_time", ""),
                        total_amount=sel.get("price", 0.0),
                        currency=sel.get("currency", "INR"),
                        status="confirmed",
                    )
                    session.add(flight_booking)
                    await session.flush()

                    for p in current_state.get("passengers", []):
                        session.add(
                            Passenger(
                                booking_id=flight_booking.id,
                                title=p.get("title", "Mr"),
                                first_name=p.get("first_name", "Traveler"),
                                last_name=p.get("last_name", "Passenger"),
                                passport_or_id=p.get("passport_or_id"),
                                seat_preference=p.get("seat_preference", "Window"),
                            )
                        )

            await session.commit()
    except Exception as db_err:
        logger.warning(f"Database sync note: {db_err}")

    # Dispatch to WhatsApp Cloud API
    try:
        buttons = current_state.get("interactive_buttons")
        payment_url = current_state.get("payment_url")

        if current_state.get("current_stage") == "awaiting_payment" and payment_url:
            await whatsapp_service.send_cta_payment_button(
                to_phone=clean_phone,
                body_text=bot_reply,
                button_text="Pay with Zoho",
                payment_url=payment_url,
            )
        elif buttons and len(buttons) > 0:
            await whatsapp_service.send_interactive_buttons(
                to_phone=clean_phone,
                text=bot_reply,
                buttons=buttons,
            )
        else:
            await whatsapp_service.send_text_message(
                to_phone=clean_phone,
                text=bot_reply,
            )

        # If confirmed, also send ticket document link
        if current_state.get("current_stage") == "confirmed" and current_state.get("ticket_pdf_url"):
            await whatsapp_service.send_document(
                to_phone=clean_phone,
                document_url=current_state["ticket_pdf_url"],
                filename=f"E-Ticket_{current_state.get('pnr')}.pdf",
                caption=f"Official E-Ticket for PNR {current_state.get('pnr')}",
            )
    except Exception as wa_err:
        logger.error(f"WhatsApp dispatch error: {wa_err}")

    return {
        "phone_number": clean_phone,
        "reply_text": bot_reply,
        "current_stage": current_state.get("current_stage"),
        "booking_ref": current_state.get("booking_ref"),
        "pnr": current_state.get("pnr"),
        "payment_url": current_state.get("payment_url"),
        "suggested_actions": [b["title"] for b in current_state.get("interactive_buttons", [])] if current_state.get("interactive_buttons") else [],
    }
