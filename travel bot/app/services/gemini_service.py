import json
import logging
import re
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiAIService:
    """Handles Google Gemini AI Automation for Travel Intent Extraction & Conversational Intelligence."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    @property
    def endpoint_url(self) -> str:
        return f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"

    async def generate_content(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
        """Calls Google Gemini API generateContent endpoint."""
        if not self.api_key:
            return None

        contents = [{"parts": [{"text": prompt}]}]
        payload: Dict[str, Any] = {"contents": contents}

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    self.endpoint_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                if res.status_code != 200:
                    logger.warning(f"Gemini API returned {res.status_code}: {res.text[:200]}")
                    return None

                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception as exc:
            logger.warning(f"Gemini generation error: {exc}")
        return None

    async def extract_travel_intent(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Uses Gemini AI to extract origin, destination, travel_date, passengers_count, and cabin_class
        from conversational messages.
        """
        if not self.api_key:
            return None

        system_instruction = (
            "You are an AI Travel Assistant intent parser for a flight booking portal. Extract travel parameters from the user's message. "
            "Output strictly valid JSON with no markdown wrapping or code blocks. JSON fields: "
            "{\"trip_type\": \"One Way\" or \"Round Trip\" or \"Multi City\" or null, "
            "\"origin\": \"string or null\", \"destination\": \"string or null\", "
            "\"travel_date\": \"string or null\", \"return_date\": \"string or null\", "
            "\"passengers_count\": integer or null, \"adults_count\": integer or null, \"children_count\": integer or null, \"infants_count\": integer or null, "
            "\"cabin_class\": \"Economy\" or \"Premium Economy\" or \"Business\" or \"First\" or null, "
            "\"special_fare\": \"Regular\" or \"Student\" or \"Senior Citizen\" or \"Corporate\" or \"Armed Forces\" or null, "
            "\"first_name\": \"string or null\", \"last_name\": \"string or null\", \"passport_no\": \"string or null\", "
            "\"country_code\": \"string or null\", \"mobile_number\": \"string or null\", \"mail_id\": \"string or null\"}"
        )

        prompt = f"Customer message: \"{text}\""

        raw_output = await self.generate_content(prompt=prompt, system_instruction=system_instruction)
        if not raw_output:
            return None

        # Clean markdown codeblocks if model included them
        clean_json = re.sub(r"^```(?:json)?\s*", "", raw_output, flags=re.MULTILINE)
        clean_json = re.sub(r"\s*```$", "", clean_json, flags=re.MULTILINE).strip()

        try:
            data = json.loads(clean_json)
            if isinstance(data, dict):
                logger.info(f"Gemini extracted travel intent: {data}")
                return data
        except Exception as json_err:
            logger.warning(f"Failed to parse Gemini output as JSON: {raw_output} ({json_err})")

        return None

    async def reason_agent_turn(
        self,
        user_message: str,
        conversation_history: list,
        current_state: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Core AI Agent Brain: Analyzes user message within full conversational context,
        reasons about user goals, determines agent actions (search, select, book, ask, answer),
        extracts travel/passenger entities, and crafts natural WhatsApp responses.
        """
        if not self.api_key:
            return None

        # Format past turns
        history_lines = []
        for msg in conversation_history[-8:]:
            role = "Customer" if getattr(msg, "type", "") == "human" or (isinstance(msg, dict) and msg.get("role") == "user") else "Assistant"
            content = getattr(msg, "content", "") if hasattr(msg, "content") else (msg.get("content", "") if isinstance(msg, dict) else str(msg))
            if content:
                history_lines.append(f"{role}: {content[:180]}")
        history_str = "\n".join(history_lines) if history_lines else "None"

        # Format current state summary
        travel = current_state.get("travel_details", {}) or {}
        stage = current_state.get("current_stage", "idle")
        flights = current_state.get("flight_results", [])
        selected = current_state.get("selected_flight")

        flight_list_lines = []
        if flights:
            for idx, fl in enumerate(flights, 1):
                trans = fl.get("transit_details") or fl.get("transit_info") or (
                    "Direct / Non-stop (0 stops, 0 layover)" if fl.get("stops", 0) == 0
                    else f"{fl.get('stops')} Stop(s), Layover: {fl.get('transit_duration', 'N/A')} at {fl.get('transit_airport', 'Hub')}"
                )
                flight_list_lines.append(
                    f"Option {idx}: {fl.get('airline_name')} ({fl.get('flight_number')}) | "
                    f"Fare: ₹{fl.get('price'):,.0f} | "
                    f"Dep: {fl.get('departure_time')} -> Arr: {fl.get('arrival_time')} ({fl.get('duration')}) | "
                    f"Transit/Layover: {trans} | Baggage: {fl.get('baggage_allowance', 'Included')} | "
                    f"Refundable: {fl.get('refundable', True)}"
                )
        flight_context_str = "\n".join(flight_list_lines) if flight_list_lines else "No flights currently loaded."

        state_summary = (
            f"Stage: {stage}\n"
            f"Trip Type: {travel.get('trip_type', 'Unknown')}\n"
            f"Origin: {travel.get('origin', 'Unknown')} -> Destination: {travel.get('destination', 'Unknown')}\n"
            f"Travel Date: {travel.get('travel_date', 'Unknown')}, Return Date: {travel.get('return_date', 'None')}\n"
            f"Time Preference: {travel.get('time_preference', 'Any')}\n"
            f"Passengers: Adults={travel.get('adults_count', 1)}, Children={travel.get('children_count', 0)}, Infants={travel.get('infants_count', 0)}\n"
            f"Cabin Class: {travel.get('cabin_class', 'Economy')}\n"
            f"Selected Flight: {selected.get('airline_name') if selected else 'None'}\n\n"
            f"OFFERED FLIGHTS IN CURRENT SESSION:\n{flight_context_str}"
        )

        system_instruction = (
            "You are FlySmart AI — a professional, warm, and autonomous AI Travel Agent operating on WhatsApp. "
            "You think and communicate like an expert human travel consultant: concise, helpful, and natural. "
            "\n\nCRITICAL ACTION RULES:\n"
            "- 'search_flights': User provides a route/date/passengers to search (e.g. 'flights from Chennai to Bangalore on 29 Oct'). ALWAYS choose this even if they say 'I want to go', 'I need a flight', 'book me a flight' — these are search requests, NOT bookings."
            "- 'select_flight': User EXPLICITLY picks one of the numbered options shown to them (e.g. 'option 2', 'book option 1', 'I'll take IndiGo')."
            "- 'collect_passenger': ONLY when user provides LABELED passenger form fields like 'First name: Rahul, Last name: Sharma, Passport no: P123..., Mobile: 98765..., Mail id: rahul@...' with at least 3 labeled fields. NEVER classify a travel search phrase as collect_passenger."
            "- 'general_qa': Any question about timings, baggage, layover, transit, refund, meals, or flight details."
            "- 'ask_info': You need more info to proceed (missing origin, destination, or date)."
            "\nIMPORTANT: A message like 'i want go to chennai to bengalure on oct 29' is ALWAYS 'search_flights', never 'collect_passenger'."
            "\nNever sound like a rigid questionnaire. Be warm, natural, and professional."
            "\nOutput strictly valid JSON. No markdown. No code blocks."
        )

        prompt = f"""
CONVERSATION HISTORY:
{history_str}

CURRENT BOOKING CONTEXT:
{state_summary}

LATEST USER MESSAGE:
"{user_message}"

TASK:
1. Determine the correct action:
   a) 'search_flights' — User wants to find/check flights. Phrases like "i want to go", "find flights", "i need a flight", "book me a flight from X to Y on date", "going to X on date" ALL mean search_flights. Extract origin, destination, travel_date.
   b) 'select_flight' — User EXPLICITLY selects one of the numbered options shown ("option 2", "I'll take 1", "go with IndiGo"). Only after flights have been offered.
   c) 'collect_passenger' — ONLY when user provides LABELED passenger form fields with at least first name, last name, and one more field (passport/mobile/email). This NEVER applies to travel search phrases.
   d) 'general_qa' — Questions about timing, baggage, transit, layover, meals, refund, pricing details for a specific shown option.
   e) 'ask_info' — Missing critical info (origin, destination, or date) needed to search.
2. Extract entities: origin (city name), destination (city name), travel_date, adults_count, children_count, infants_count, cabin_class, time_preference, selected_flight_index.
3. Write a warm, professional, natural WhatsApp reply in 'reply_text' using *bold* and emojis.
4. Suggest 1–3 short, relevant quick-action button labels.

Respond with STRICT JSON matching this schema:
{{
  "thought": "Reasoning of user intent and agent next step",
  "action": "search_flights" | "select_flight" | "collect_passenger" | "confirm_payment" | "ask_info" | "general_qa",
  "reply_text": "Natural conversational response",
  "extracted": {{
    "trip_type": "One Way" | "Round Trip" | "Multi City" | null,
    "origin": "string or null",
    "destination": "string or null",
    "travel_date": "string or null",
    "return_date": "string or null",
    "adults_count": integer or null,
    "children_count": integer or null,
    "infants_count": integer or null,
    "passengers_count": integer or null,
    "cabin_class": "Economy" | "Premium Economy" | "Business" | "First" | null,
    "time_preference": "morning" | "afternoon" | "evening" | "night" | null,
    "selected_flight_index": integer or null,
    "passenger": {{
      "first_name": "string or null",
      "last_name": "string or null",
      "passport_no": "string or null",
      "country_code": "string or null",
      "mobile_number": "string or null",
      "mail_id": "string or null"
    }} or null
  }},
  "suggested_buttons": ["Button 1", "Button 2"]
}}
"""

        raw_output = await self.generate_content(prompt=prompt, system_instruction=system_instruction)
        if not raw_output:
            return None

        clean_json = re.sub(r"^```(?:json)?\s*", "", raw_output, flags=re.MULTILINE)
        clean_json = re.sub(r"\s*```$", "", clean_json, flags=re.MULTILINE).strip()

        try:
            data = json.loads(clean_json)
            if isinstance(data, dict):
                logger.info(f"Gemini AI Agent Decision: action='{data.get('action')}', thought='{data.get('thought')}'")
                return data
        except Exception as json_err:
            logger.warning(f"Failed to parse Gemini Agent JSON: {raw_output} ({json_err})")

        return None


gemini_service = GeminiAIService()

