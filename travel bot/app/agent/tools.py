import re
import logging
from typing import Dict, Any, List, Optional
from app.services.flight_service import flight_service
from app.services.zoho_payment_service import zoho_payment_service

logger = logging.getLogger(__name__)


def extract_travel_details_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts trip type, origin, destination, travel dates, passengers breakdown,
    and cabin class from conversational user text.
    """
    extracted: Dict[str, Any] = {
        "trip_type": None,
        "origin": None,
        "destination": None,
        "travel_date": None,
        "return_date": None,
        "passengers_count": 1,
        "adults_count": 1,
        "children_count": 0,
        "infants_count": 0,
        "cabin_class": None,
        "special_fare": "Regular",
        "multi_city_legs": None,
    }

    lower_text = text.lower().strip()

    # 1. Extract Trip Type (One Way, Round Trip, Multi City)
    if "multi city" in lower_text or "multicity" in lower_text or "multi-city" in lower_text or "trip_multi_city" in lower_text:
        extracted["trip_type"] = "Multi City"
    elif "round trip" in lower_text or "roundtrip" in lower_text or "return" in lower_text or "trip_round_trip" in lower_text:
        extracted["trip_type"] = "Round Trip"
    elif "one way" in lower_text or "oneway" in lower_text or "one-way" in lower_text or "single" in lower_text or "trip_one_way" in lower_text:
        extracted["trip_type"] = "One Way"

    # 2. Extract Route: 'where from <City> where to <City>', 'from <City> to <City>', or '<City> to <City>'
    where_from_match = re.search(r"where\s*from\s*[:=]?\s*([a-zA-Z\s]+?)(?:where\s*to|\n|$)", text, re.IGNORECASE)
    where_to_match = re.search(r"where\s*to\s*[:=]?\s*([a-zA-Z\s]+?)(?:date|\n|$)", text, re.IGNORECASE)
    if where_from_match and where_to_match:
        extracted["origin"] = where_from_match.group(1).strip()
        extracted["destination"] = where_to_match.group(1).strip()
    else:
        # Check 'from X to Y'
        from_to_match = re.search(
            r"\bfrom\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+(?:on|for|departing|dated?|\.|\,)|$)",
            text,
            re.IGNORECASE,
        )
        if from_to_match:
            extracted["origin"] = from_to_match.group(1).strip()
            extracted["destination"] = from_to_match.group(2).strip()
        else:
            arrow_match = re.search(
                r"\b([a-zA-Z]{3,})\s*(?:➔|->|to)\s*([a-zA-Z]{3,})\b(?:\s+(?:on|for|departing|dated?|\.|\,)|$)",
                text,
                re.IGNORECASE,
            )
            if arrow_match:
                stop = {"want", "like", "need", "wish", "going", "plan", "trying", "have", "how", "what", "when", "show", "find", "book"}
                if arrow_match.group(1).lower() not in stop and arrow_match.group(2).lower() not in stop:
                    extracted["origin"] = arrow_match.group(1).strip()
                    extracted["destination"] = arrow_match.group(2).strip()

    # Clean punctuation and trailing words from origin / destination
    if extracted.get("destination"):
        extracted["destination"] = re.sub(r"\s+(?:on|for|departing|with|pls|please).*", "", extracted["destination"], flags=re.IGNORECASE).strip()
    if extracted.get("origin"):
        extracted["origin"] = re.sub(r"\s+(?:on|for|departing|with|pls|please).*", "", extracted["origin"], flags=re.IGNORECASE).strip()

    # 3. Extract Departure Date (e.g. '20 October', 'on 20 October', '2026-10-20', '21 nov')
    date_match = re.search(
        r"\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})\b",
        text,
        re.IGNORECASE,
    )
    if not date_match:
        date_match = re.search(r"(?:on|for|departing|dated?)\s+(\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)

    if date_match:
        extracted["travel_date"] = date_match.group(1).strip()
    elif "tomorrow" in lower_text or "date_tomorrow" in lower_text:
        extracted["travel_date"] = "Tomorrow"
    elif "today" in lower_text:
        extracted["travel_date"] = "Today"

    # Extract Return Date if round trip
    ret_match = re.search(r"(?:returning|return|back)\s+(?:on\s+|date\s*[:=]?\s*)?(\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
    if ret_match:
        extracted["return_date"] = ret_match.group(1).strip()
        if not extracted["trip_type"]:
            extracted["trip_type"] = "Round Trip"

    # 4. Extract Passenger Breakdown (Adults 12+, Children 2-12, Infants 0-2)
    adults_match = re.search(r"(\d+)\s*(?:adult|adults)", lower_text)
    if adults_match:
        extracted["adults_count"] = int(adults_match.group(1))

    child_match = re.search(r"(\d+)\s*(?:child|children|kid|kids)", lower_text)
    if child_match:
        extracted["children_count"] = int(child_match.group(1))

    infant_match = re.search(r"(\d+)\s*(?:infant|infants|baby)", lower_text)
    if infant_match:
        extracted["infants_count"] = int(infant_match.group(1))

    pax_match = re.search(r"(\d+)\s*(?:passenger|passengers|pax|traveler|travelers)", lower_text)
    if pax_match:
        extracted["passengers_count"] = int(pax_match.group(1))
    else:
        extracted["passengers_count"] = extracted["adults_count"] + extracted["children_count"] + extracted["infants_count"]

    # 5. Extract Cabin Class (Economy, Premium Economy, Business, First)
    if "premium economy" in lower_text or "premium" in lower_text or "class_premium" in lower_text or "ii) premium" in lower_text:
        extracted["cabin_class"] = "Premium Economy"
    elif "business" in lower_text or "class_business" in lower_text or "iii) business" in lower_text:
        extracted["cabin_class"] = "Business"
    elif "first" in lower_text or "class_first" in lower_text or "iv) first" in lower_text:
        extracted["cabin_class"] = "First"
    elif "economy" in lower_text or "class_economy" in lower_text or "i) economy" in lower_text:
        extracted["cabin_class"] = "Economy"

    # 6. Extract Time Preference (Morning, Afternoon, Evening, Night)
    if "morning" in lower_text:
        extracted["time_preference"] = "morning"
    elif "afternoon" in lower_text:
        extracted["time_preference"] = "afternoon"
    elif "evening" in lower_text:
        extracted["time_preference"] = "evening"
    elif "night" in lower_text or "red eye" in lower_text:
        extracted["time_preference"] = "night"

    # 7. Special Fares
    if "student" in lower_text:
        extracted["special_fare"] = "Student"
    elif "senior" in lower_text:
        extracted["special_fare"] = "Senior Citizen"
    elif "armed force" in lower_text or "defence" in lower_text or "military" in lower_text:
        extracted["special_fare"] = "Armed Forces"
    elif "corporate" in lower_text or "sme" in lower_text:
        extracted["special_fare"] = "Corporate"

    return extracted


async def search_flights(
    origin: str,
    destination: str,
    travel_date: str,
    passengers_count: int = 1,
    cabin_class: str = "Economy",
    time_of_day: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Search flights via flight service and return ranked flights."""
    return await flight_service.search_flights(
        origin=origin,
        destination=destination,
        travel_date=travel_date,
        passengers_count=passengers_count,
        cabin_class=cabin_class,
        time_of_day=time_of_day,
    )


def filter_flights(flights: List[Dict[str, Any]], max_price: Optional[float] = None, non_stop_only: bool = False) -> List[Dict[str, Any]]:
    """Filters flight options according to customer constraints, sorted lowest price to highest."""
    filtered = flights
    if non_stop_only:
        filtered = [f for f in filtered if f.get("stops", 0) == 0]
    if max_price:
        filtered = [f for f in filtered if f.get("price", 0) <= max_price]
    return sorted(filtered, key=lambda x: x.get("price", 0))


def recommend_flights(flights: List[Dict[str, Any]]) -> str:
    """Formats top flight options ranked strictly from lowest price to highest price with transit details."""
    if not flights:
        return "I couldn't find any flights matching those criteria. Would you like to check alternate dates?"

    # Ensure sorted strictly from lowest price to highest price
    sorted_flights = sorted(flights, key=lambda x: x.get("price", 0))

    lines = ["✈️ *Available Flights (Ranked from Lowest Price to Highest Price):*\n"]
    medals = ["🥇", "🥈", "🥉", "✈️"]
    for idx, f in enumerate(sorted_flights[:4], start=1):
        stops_str = "Direct (Non-stop)" if f.get("stops", 0) == 0 else f"{f.get('stops')} Stop"
        tag = " — Lowest Fare 🏷️" if idx == 1 else ""
        medal = medals[idx - 1] if idx <= len(medals) else "✈️"
        transit_line = ""
        if f.get("transit_details") and f.get("stops", 0) > 0:
            transit_line = f"   🔄 Transit: {f['transit_details']}\n"
        elif f.get("stops", 0) == 0:
            transit_line = "   🔄 Transit: Direct / Non-stop (no layover)\n"

        lines.append(
            f"{medal} *{idx}. {f['airline_name']} ({f['flight_number']})* — *₹{f['price']:,.0f}*{tag}\n"
            f"   🕒 Dep: {f['departure_time']} ➔ Arr: {f['arrival_time']} ({f['duration']}, {stops_str})\n"
            f"{transit_line}"
            f"   🧳 Baggage: {f['baggage_allowance']}\n"
        )

    lines.append("Reply with *1*, *2*, or *3* to choose your flight!")
    return "\n".join(lines)


async def get_fare_details(flight_id: str) -> Dict[str, Any]:
    """Retrieves detailed fare rules and baggage policies for the selected flight."""
    return await flight_service.get_fare_breakdown(flight_id)


def parse_passenger_details(text: str) -> List[Dict[str, Any]]:
    """
    Parses First Name, Last Name, Passport No, Country Code, Mobile Number, and Mail ID
    from customer text input.
    """
    # Regex extractors for label-value or conversational formats
    fn_match = re.search(r"(?:first\s*name|fname)\s*[:=]?\s*([a-zA-Z]+)", text, re.IGNORECASE)
    ln_match = re.search(r"(?:last\s*name|lname)\s*[:=]?\s*([a-zA-Z]+)", text, re.IGNORECASE)
    pass_match = re.search(r"(?:passport(?:\s*no)?)\s*[:=]?\s*([a-zA-Z0-9]+)", text, re.IGNORECASE)
    cc_match = re.search(r"(?:country(?:\s*code)?)\s*[:=]?\s*(\+?\d{1,4})", text, re.IGNORECASE)
    mob_match = re.search(r"(?:mobile(?:\s*number)?|phone|contact)\s*[:=]?\s*(\d{7,14})", text, re.IGNORECASE)
    mail_match = re.search(r"(?:mail(?:\s*id)?|email)\s*[:=]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", text, re.IGNORECASE)

    # General regex search if not label-prefixed
    email = mail_match.group(1) if mail_match else None
    if not email:
        raw_email = re.search(r"\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b", text)
        if raw_email:
            email = raw_email.group(1)

    country_code = cc_match.group(1) if cc_match else None
    if not country_code:
        raw_cc = re.search(r"\b(\+\d{1,3})\b", text)
        if raw_cc:
            country_code = raw_cc.group(1)
        else:
            country_code = "+91"

    mobile = mob_match.group(1) if mob_match else None
    if not mobile:
        raw_mob = re.search(r"\b(\d{10})\b", text)
        if raw_mob:
            mobile = raw_mob.group(1)

    passport = pass_match.group(1) if pass_match else None
    if not passport:
        raw_pass = re.search(r"\b([A-Z][0-9]{7,8})\b", text)
        if raw_pass:
            passport = raw_pass.group(1)
        else:
            passport = "T8765432"

    first_name = fn_match.group(1) if fn_match else None
    last_name = ln_match.group(1) if ln_match else None

    # If first_name / last_name not explicitly labelled, infer from name line
    if not first_name or not last_name:
        clean = re.sub(r"^(?:mr|mrs|ms|dr)\.?\s+", "", text.strip(), flags=re.IGNORECASE)
        # remove labels if any
        clean = re.sub(r"(?:passport|email|mobile|phone|country)[^,\n]*", "", clean, flags=re.IGNORECASE)
        parts = [p.strip() for p in clean.split(",") if p.strip()]
        if parts:
            name_tokens = parts[0].split()
            if not first_name and name_tokens:
                first_name = name_tokens[0]
            if not last_name:
                last_name = " ".join(name_tokens[1:]) if len(name_tokens) > 1 else "Traveler"

    first_name = first_name.capitalize() if first_name else "Vikram"
    last_name = last_name.capitalize() if last_name else "Seth"

    return [{
        "title": "Mr",
        "first_name": first_name,
        "last_name": last_name,
        "passport_or_id": passport,
        "passport_no": passport,
        "country_code": country_code,
        "mobile_number": mobile or "9876543210",
        "mail_id": email or f"{first_name.lower()}.{last_name.lower()}@example.com",
        "seat_preference": "Window",
    }]


async def create_payment_link(booking_ref: str, amount: float, customer_phone: str, customer_name: Optional[str] = None) -> Dict[str, Any]:
    """Creates a Zoho Payments link."""
    return await zoho_payment_service.create_payment_link(
        booking_ref=booking_ref,
        amount=amount,
        customer_phone=customer_phone,
        customer_name=customer_name,
    )


async def book_flight_and_get_pnr(selected_flight: Dict[str, Any], passengers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Books flight and issues official PNR."""
    return await flight_service.generate_pnr_and_ticket(
        airline_code=selected_flight.get("airline_code", "EK"),
        flight_number=selected_flight.get("flight_number", "EK 543"),
        origin=selected_flight.get("origin_code", "MAA"),
        destination=selected_flight.get("destination_code", "DXB"),
        passengers=passengers,
    )
