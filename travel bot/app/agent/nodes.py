import uuid
import logging
import re
from typing import Dict, Any, List, Optional
from langchain_core.messages import AIMessage, HumanMessage
from app.agent.state import AgentState
from app.agent.tools import (
    extract_travel_details_from_text,
    search_flights,
    filter_flights,
    recommend_flights,
    get_fare_details,
    parse_passenger_details,
    create_payment_link,
    book_flight_and_get_pnr,
)
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# HELPER: Strict passenger details detection
# A message ONLY counts as passenger details if it contains ACTUAL structured
# fields (first_name/last_name labels, a real email address, or a passport no)
# AND the user is in the correct stage (collecting_passengers).
# ---------------------------------------------------------------------------
def _is_real_passenger_submission(text: str, stage: str) -> bool:
    """
    Returns True ONLY if the message contains genuine passenger form data:
    - Must be in 'collecting_passengers' stage
    - Must have labeled fields (first name:, last name:, passport, mail id, email) OR
      a real @-email address combined with labeled first/last name
    - A plain travel query like 'i want to fly from X to Y on date' must NEVER pass
    """
    if stage != "collecting_passengers":
        return False

    lower = text.lower()

    # Hard blockers: these are clearly flight search phrases, not passenger data
    search_indicators = [
        "i want", "i need", "i would", "looking for", "find flight",
        "book flight", "search flight", "fly from", "travel from",
        "going to", "going from", "want to go", "want go",
        "flight from", "ticket from", "chennai", "mumbai", "delhi",
        "bangalore", "bengaluru", "hyderabad", "dubai", "london", "paris",
        "on oct", "on nov", "on dec", "on jan", "on feb", "on mar",
        "20 oct", "21 nov", "22 dec", "morning", "afternoon", "evening",
    ]
    for indicator in search_indicators:
        if indicator in lower:
            return False

    # Must have explicit labeled passenger fields
    has_first_name_label = bool(re.search(r"first\s*name\s*[:=]", text, re.IGNORECASE))
    has_last_name_label = bool(re.search(r"last\s*name\s*[:=]", text, re.IGNORECASE))
    has_passport_label = bool(re.search(r"passport\s*(?:no|number)?\s*[:=]", text, re.IGNORECASE))
    has_mail_label = bool(re.search(r"(?:mail\s*id|email)\s*[:=]", text, re.IGNORECASE))
    has_real_email = bool(re.search(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", text))
    has_mobile_label = bool(re.search(r"mobile\s*(?:number)?\s*[:=]", text, re.IGNORECASE))

    # Count how many passenger-specific labeled fields are present
    labeled_fields = sum([
        has_first_name_label,
        has_last_name_label,
        has_passport_label,
        has_mail_label or has_real_email,
        has_mobile_label,
    ])

    return labeled_fields >= 2


# ---------------------------------------------------------------------------
# HELPER: Classify whether user is making a flight search request
# ---------------------------------------------------------------------------
def _is_flight_search_intent(action: str, clean_msg: str, existing_travel: dict, stage: str) -> bool:
    """Returns True if we should execute a flight search."""
    if action == "search_flights":
        return True
    if stage in ["collecting_passengers", "awaiting_payment", "confirmed"]:
        return False
    if stage == "flights_offered":
        return False  # Already searching, user should select/ask
    # Has full route + date extracted and no flights offered yet
    if (
        existing_travel.get("origin")
        and existing_travel.get("destination")
        and existing_travel.get("travel_date")
    ):
        return True
    return False


# ---------------------------------------------------------------------------
# MAIN AGENT NODE
# ---------------------------------------------------------------------------
async def parse_and_route_node(state: AgentState) -> Dict[str, Any]:
    """
    Autonomous AI Travel Agent Reasoning Loop (LangGraph + Google Gemini AI).

    Strict flow:
    1. idle → user asks for flight → search_flights → flights_offered
    2. flights_offered → user selects option → collecting_passengers
    3. collecting_passengers → user provides labeled passenger form → confirmed
    4. Any stage → user can ask general questions freely
    """
    messages = state.get("messages", [])
    if not messages:
        return {
            "last_bot_reply": (
                "👋 *Welcome to FlySmart Travel Assistant!* ✈️\n\n"
                "I am your personal AI flight travel assistant. How can I help you today?\n\n"
                "_You can ask me to search flights, check timings, baggage rules, compare fares, or book a trip._"
            )
        }

    last_user_msg = messages[-1].content.strip()
    stage = state.get("current_stage", "idle")
    existing_travel = dict(state.get("travel_details", {}) or {})
    clean_msg = last_user_msg.lower().strip()

    logger.info(f"[AI AGENT] stage='{stage}' | message='{last_user_msg}'")

    # ===========================================================
    # STEP 1 — Gemini AI Reasoning
    # ===========================================================
    agent_decision = {}
    try:
        agent_decision = await gemini_service.reason_agent_turn(
            user_message=last_user_msg,
            conversation_history=messages,
            current_state=state,
        ) or {}
    except Exception as exc:
        logger.warning(f"[AI AGENT] Gemini reasoning error: {exc}")

    action = agent_decision.get("action", "ask_info")
    thought = agent_decision.get("thought", "")
    extracted = agent_decision.get("extracted", {}) or {}

    logger.info(f"[AI AGENT DECISION] action='{action}' | thought='{thought}'")

    # ===========================================================
    # STEP 2 — Merge extracted entities into travel context
    # ===========================================================
    for k in ["trip_type", "origin", "destination", "travel_date", "return_date", "cabin_class", "time_preference"]:
        val = extracted.get(k)
        if val:
            existing_travel[k] = val

    for k in ["adults_count", "children_count", "infants_count", "passengers_count"]:
        val = extracted.get(k)
        if val is not None:
            existing_travel[k] = val

    # Always compute total pax count
    existing_travel.setdefault("adults_count", 1)
    existing_travel.setdefault("children_count", 0)
    existing_travel.setdefault("infants_count", 0)
    total_pax = (
        (existing_travel.get("adults_count") or 1)
        + (existing_travel.get("children_count") or 0)
        + (existing_travel.get("infants_count") or 0)
    )
    existing_travel["passengers_count"] = existing_travel.get("passengers_count") or total_pax

    # Rule-based entity extraction as safety complement
    rule_extracted = extract_travel_details_from_text(last_user_msg)
    for k, v in rule_extracted.items():
        if v and not existing_travel.get(k):
            existing_travel[k] = v

    # ===========================================================
    # STEP 3 — Classify message intent (strict, ordered checks)
    # ===========================================================

    # 3a. Is it an inquiry / Q&A (NOT a booking action)?
    is_inquiry = (
        action == "general_qa"
        or any(q in clean_msg for q in [
            "what", "whats", "what's", "how", "timing", "transit", "layover",
            "baggage", "luggage", "refund", "meal", "food",
            "tell me", "explain", "is it", "does it", "can i",
            "minimum", "maximum", "difference", "compare", "vs",
        ])
        or (clean_msg.endswith("?"))
    )

    # 3b. Is it a genuine passenger form submission?
    is_passenger_submission = (
        _is_real_passenger_submission(last_user_msg, stage)
        or (
            stage == "collecting_passengers"
            and action == "collect_passenger"
            and (
                re.search(r"first\s*name\s*[:=]", last_user_msg, re.IGNORECASE)
                or re.search(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", last_user_msg)
            )
        )
    )

    # 3c. Is it an explicit flight selection?
    explicit_selection_patterns = [
        r"^\s*[1-5]\s*$",         # just a digit 1–5
        r"\boption\s*[1-5]\b",
        r"\bselect\s+[1-5]\b",
        r"\bchoose\s+[1-5]\b",
        r"\bbook\s+(?:option\s*)?[1-5]\b",
        r"\bgo\s+with\s+(option\s*)?[1-5]\b",
        r"\bi'll?\s+take\s+[1-5]\b",
        r"\bfirst\s+one\b",
        r"\bsecond\s+one\b",
        r"\bthird\s+one\b",
    ]
    is_explicit_selection = (
        stage == "flights_offered"
        and not is_inquiry
        and not is_passenger_submission
        and (
            action == "select_flight"
            or any(re.search(p, clean_msg) for p in explicit_selection_patterns)
            or any(f["airline_name"].lower() in clean_msg for f in state.get("flight_results", []))
        )
    )

    # ===========================================================
    # GATE A — Already confirmed booking
    # ===========================================================
    if stage == "confirmed":
        is_new_search = any(k in clean_msg for k in [
            "new flight", "another flight", "search again", "book again",
            "different flight", "book new", "new booking", "restart",
        ])
        if is_new_search or action == "search_flights":
            # Reset state for new search
            existing_travel = {}
            stage = "idle"
            # Fall through to search/QA below
        else:
            pnr = state.get("pnr", "")
            return {
                "current_stage": "confirmed",
                "last_bot_reply": (
                    f"✅ Your booking *{pnr}* is already confirmed! 🎫\n\n"
                    "Would you like to search for another flight or do you have any questions?"
                ),
                "interactive_buttons": [
                    {"id": "btn_new", "title": "🔍 Search New Flight"},
                    {"id": "btn_help", "title": "❓ Help"},
                ],
            }

    # ===========================================================
    # GATE B — Passenger form submission → Book & confirm
    # ===========================================================
    if is_passenger_submission:
        passengers = parse_passenger_details(last_user_msg)
        selected = state.get("selected_flight") or {}
        if not selected and state.get("flight_results"):
            selected = state["flight_results"][0]

        if not selected:
            # No flight selected yet — ask user to select first
            return {
                "current_stage": "flights_offered" if state.get("flight_results") else "idle",
                "last_bot_reply": (
                    "✈️ Please first select a flight option before providing passenger details.\n\n"
                    "Reply with *1*, *2*, or *3* to choose your preferred flight."
                ),
                "travel_details": existing_travel,
                "interactive_buttons": None,
            }

        booking_ref = state.get("booking_ref") or f"TB-{uuid.uuid4().hex[:8].upper()}"
        p = passengers[0] if passengers else {}

        # Validate: must have a real first name (not a city name or search phrase)
        first_name = p.get("first_name", "")
        city_words = {
            "chennai", "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad",
            "kolkata", "pune", "dubai", "london", "paris", "want", "i", "the",
        }
        if first_name.lower() in city_words:
            return {
                "current_stage": "collecting_passengers",
                "last_bot_reply": (
                    "📝 *Please provide your passenger details in this format:*\n\n"
                    "*First name:* [Your first name]\n"
                    "*Last name:* [Your last name]\n"
                    "*Passport no:* [Your passport number]\n"
                    "*Country code:* +91\n"
                    "*Mobile number:* [Your 10-digit number]\n"
                    "*Mail id:* [Your email address]"
                ),
                "travel_details": existing_travel,
                "interactive_buttons": None,
            }

        pax_name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
        phone = p.get("mobile_number") or state.get("phone_number", "")

        booking_details = await book_flight_and_get_pnr(selected, passengers)
        pnr = booking_details["pnr"]
        pdf_url = booking_details["ticket_pdf_url"]

        reply = (
            f"🎉 *CONGRATULATIONS! YOUR FLIGHT IS CONFIRMED!* 🎉\n\n"
            f"🎫 *Airline PNR: {pnr}*\n"
            f"🔖 Booking Reference: *{booking_ref}*\n\n"
            f"✈️ *Confirmed Flight Itinerary:*\n"
            f"• Airline: {selected.get('airline_name', '')} ({selected.get('flight_number', '')})\n"
            f"• Route: {selected.get('origin', '')} ➔ {selected.get('destination', '')}\n"
            f"• Date: {selected.get('travel_date', existing_travel.get('travel_date', ''))}\n"
            f"• Departure: {selected.get('departure_time', '')}\n"
            f"• Arrival: {selected.get('arrival_time', '')}\n"
            f"• Duration: {selected.get('duration', '')}\n"
            f"• Passenger: {pax_name}\n"
            f"• Passport: {p.get('passport_no', 'N/A')}\n"
            f"• Contact: {p.get('country_code', '+91')} {phone}\n"
            f"• Email: {p.get('mail_id', 'N/A')}\n"
            f"• Total Fare: ₹{selected.get('price', 0):,.0f}\n\n"
            f"📄 *Download Official E-Ticket PDF:* {pdf_url}\n\n"
            f"Have a wonderful and safe journey! 🧳✈️"
        )

        return {
            "current_stage": "confirmed",
            "pnr": pnr,
            "ticket_pdf_url": pdf_url,
            "passengers": passengers,
            "selected_flight": selected,
            "travel_details": existing_travel,
            "booking_ref": booking_ref,
            "last_bot_reply": reply,
            "interactive_buttons": [
                {"id": "btn_download", "title": "📄 Download E-Ticket"},
                {"id": "btn_new_flight", "title": "🔍 Search Another Flight"},
            ],
        }

    # ===========================================================
    # GATE C — Flight selection → Ask for passenger details
    # ===========================================================
    if is_explicit_selection and state.get("flight_results"):
        flight_results = state["flight_results"]
        # Determine which flight index
        idx = extracted.get("selected_flight_index") or 1
        if re.search(r"\b(?:2|two|second|option\s*2)\b", clean_msg):
            idx = 2
        elif re.search(r"\b(?:3|three|third|option\s*3)\b", clean_msg):
            idx = 3
        elif re.search(r"\b(?:4|four|fourth|option\s*4)\b", clean_msg):
            idx = 4
        elif re.search(r"\b(?:5|five|fifth|option\s*5)\b", clean_msg):
            idx = 5
        else:
            for i, f in enumerate(flight_results, 1):
                if f["airline_name"].lower() in clean_msg:
                    idx = i
                    break

        selected = flight_results[min(idx - 1, len(flight_results) - 1)]
        booking_ref = f"TB-{uuid.uuid4().hex[:8].upper()}"

        # Get passenger count for the form
        adults = existing_travel.get("adults_count", 1)
        children = existing_travel.get("children_count", 0)
        infants = existing_travel.get("infants_count", 0)

        pax_info = f"• {adults} Adult(s)"
        if children:
            pax_info += f", {children} Child(ren)"
        if infants:
            pax_info += f", {infants} Infant(s)"

        reply = (
            f"✅ *Flight Selected:* {selected['airline_name']} ({selected['flight_number']}) — *₹{selected['price']:,.0f}*\n"
            f"🛫 Route: {selected['origin']} ➔ {selected['destination']}\n"
            f"🕒 Timing: {selected['departure_time']} - {selected['arrival_time']} ({selected['duration']})\n"
            f"💺 Class: {selected.get('cabin_class', existing_travel.get('cabin_class', 'Economy'))}\n"
            f"🧳 Baggage: {selected.get('baggage_allowance', 'Included')}\n"
            f"👥 Passengers: {pax_info}\n\n"
            f"📝 *Please provide your Passenger & Contact Details:*\n"
            f"• *First name:* [as per passport]\n"
            f"• *Last name:* [as per passport]\n"
            f"• *Passport no:*\n"
            f"• *Country code:* (e.g. +91)\n"
            f"• *Mobile number:*\n"
            f"• *Mail id:*\n\n"
            f"_Example:_\n"
            f"*First name: Rahul*\n"
            f"*Last name: Sharma*\n"
            f"*Passport no: P1234567*\n"
            f"*Country code: +91*\n"
            f"*Mobile number: 9876543210*\n"
            f"*Mail id: rahul.sharma@gmail.com*"
        )

        return {
            "current_stage": "collecting_passengers",
            "selected_flight": selected,
            "booking_ref": booking_ref,
            "travel_details": existing_travel,
            "last_bot_reply": reply,
            "interactive_buttons": None,
        }

    # ===========================================================
    # GATE D — Flight search → Show available flights
    # ===========================================================
    if _is_flight_search_intent(action, clean_msg, existing_travel, stage):
        origin = existing_travel.get("origin", "")
        destination = existing_travel.get("destination", "")
        travel_date = existing_travel.get("travel_date", "")
        pax = existing_travel.get("passengers_count", 1)
        cabin = existing_travel.get("cabin_class", "Economy")
        time_pref = existing_travel.get("time_preference")

        # If critical params are missing, ask Gemini to respond
        if not origin or not destination or not travel_date:
            if agent_decision.get("reply_text"):
                btn_labels = agent_decision.get("suggested_buttons") or []
                buttons = [{"id": f"btn_{i}", "title": b} for i, b in enumerate(btn_labels[:3])] if btn_labels else None
                return {
                    "current_stage": stage,
                    "travel_details": existing_travel,
                    "last_bot_reply": agent_decision["reply_text"],
                    "interactive_buttons": buttons,
                }
            # Deterministic ask
            missing = []
            if not origin:
                missing.append("*Where are you flying from?* (departure city)")
            if not destination:
                missing.append("*Where are you flying to?* (destination city)")
            if not travel_date:
                missing.append("*What is your travel date?* (e.g. 25 November)")
            return {
                "current_stage": stage,
                "travel_details": existing_travel,
                "last_bot_reply": (
                    "✈️ I'd love to find flights for you! Could you please share a few more details?\n\n"
                    + "\n".join(f"• {m}" for m in missing)
                ),
                "interactive_buttons": None,
            }

        flights = await search_flights(
            origin=origin,
            destination=destination,
            travel_date=travel_date,
            passengers_count=pax,
            cabin_class=cabin,
            time_of_day=time_pref,
        )

        # Normalize date for display in header (e.g. '21 Nov 2026')
        from app.services.live_flight_service import parse_travel_date_to_iso
        from datetime import datetime as _dt
        try:
            iso = parse_travel_date_to_iso(travel_date)
            display_travel_date = _dt.strptime(iso, "%Y-%m-%d").strftime("%d %b %Y")
        except Exception:
            display_travel_date = travel_date

        if not flights:
            return {
                "current_stage": "idle",
                "travel_details": existing_travel,
                "last_bot_reply": (
                    f"😔 I'm sorry, I couldn't find any flights from *{origin}* to *{destination}* on *{display_travel_date}*.\n\n"
                    "Would you like to try a different date or route?"
                ),
                "interactive_buttons": None,
            }

        # Sort lowest to highest price
        flights = sorted(flights, key=lambda x: x.get("price", 0))
        recommendation_text = recommend_flights(flights)

        # Build header
        time_tag = f" | 🌅 *{time_pref.capitalize()} Flights*" if time_pref else ""
        adults = existing_travel.get("adults_count", 1)
        children = existing_travel.get("children_count", 0)
        infants = existing_travel.get("infants_count", 0)
        pax_summary = f"{adults}A" + (f"+{children}C" if children else "") + (f"+{infants}I" if infants else "")

        full_reply = (
            f"✈️ *Flights: {origin} ➔ {destination}* ({display_travel_date})\n"
            f"💺 Class: {cabin} | 👥 Passengers: {pax_summary}{time_tag}\n\n"
            f"{recommendation_text}"
        )

        interactive_btns = []
        for i, f in enumerate(flights[:3], start=1):
            interactive_btns.append({
                "id": f"select_flight_{i}",
                "title": f"Option {i} ({f['airline_name']})",
            })

        return {
            "current_stage": "flights_offered",
            "travel_details": existing_travel,
            "flight_results": flights,
            "last_bot_reply": full_reply,
            "interactive_buttons": interactive_btns,
        }

    # ===========================================================
    # GATE E — Still collecting passengers, user sent wrong format
    # ===========================================================
    if stage == "collecting_passengers" and not is_passenger_submission:
        # Remind user what format to use
        if agent_decision.get("reply_text"):
            # Let Gemini handle it naturally
            btn_labels = agent_decision.get("suggested_buttons") or []
            buttons = [{"id": f"btn_{i}", "title": b} for i, b in enumerate(btn_labels[:3])] if btn_labels else None
            return {
                "current_stage": "collecting_passengers",
                "travel_details": existing_travel,
                "last_bot_reply": agent_decision["reply_text"],
                "interactive_buttons": buttons,
            }
        selected = state.get("selected_flight", {})
        return {
            "current_stage": "collecting_passengers",
            "travel_details": existing_travel,
            "last_bot_reply": (
                "📝 *Please share your passenger details in this format:*\n\n"
                "*First name:* [Your first name]\n"
                "*Last name:* [Your last name]\n"
                "*Passport no:* [Your passport number]\n"
                "*Country code:* +91\n"
                "*Mobile number:* [10-digit mobile]\n"
                "*Mail id:* [Your email address]\n\n"
                f"_Flight selected: {selected.get('airline_name', '')} {selected.get('flight_number', '')} — "
                f"₹{selected.get('price', 0):,.0f}_"
            ),
            "interactive_buttons": None,
        }

    # ===========================================================
    # GATE F — General Q&A / Conversational (Gemini handles it)
    # ===========================================================
    if agent_decision.get("reply_text"):
        agent_reply = agent_decision["reply_text"]
        btn_labels = agent_decision.get("suggested_buttons") or []
        buttons = [{"id": f"btn_{i}", "title": b} for i, b in enumerate(btn_labels[:3])] if btn_labels else None

        return {
            "current_stage": stage,
            "travel_details": existing_travel,
            "last_bot_reply": agent_reply,
            "interactive_buttons": buttons,
        }

    # ===========================================================
    # GATE G — Absolute fallback
    # ===========================================================
    return {
        "current_stage": "idle",
        "travel_details": existing_travel,
        "last_bot_reply": (
            "👋 *Hi! I'm FlySmart AI Travel Assistant.* ✈️\n\n"
            "How can I help you today? You can ask me to:\n"
            "• Search and compare flights\n"
            "• Check flight timings and baggage rules\n"
            "• Book a flight with instant PNR confirmation\n\n"
            "_Just tell me where you'd like to fly!_"
        ),
        "interactive_buttons": None,
    }
