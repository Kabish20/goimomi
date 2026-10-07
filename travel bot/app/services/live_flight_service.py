import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

AIRLINE_NAMES = {
    "6E": "IndiGo",
    "AI": "Air India",
    "IX": "Air India Express",
    "EK": "Emirates",
    "FZ": "Flydubai",
    "QR": "Qatar Airways",
    "EY": "Etihad Airways",
    "SG": "SpiceJet",
    "QP": "Akasa Air",
    "UK": "Vistara",
    "G8": "Go First",
    "SQ": "Singapore Airlines",
    "TG": "Thai Airways",
    "MH": "Malaysia Airlines",
    "BA": "British Airways",
}


def parse_travel_date_to_iso(date_str: str) -> str:
    """Normalizes various human date formats to YYYY-MM-DD for the flight search API."""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")

    clean = date_str.strip()
    # Check if already YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", clean):
        return clean

    # Check for DD-MM-YYYY
    if re.match(r"^\d{1,2}[-/]\d{1,2}[-/]\d{4}$", clean):
        parts = re.split(r"[-/]", clean)
        return f"{parts[2]}-{int(parts[1]):02d}-{int(parts[0]):02d}"

    # Check for '20 October' or '20 Oct'
    current_year = datetime.now().year
    # Try parsing month names
    for fmt in ["%d %B %Y", "%d %b %Y", "%d %B", "%d %b"]:
        try:
            parsed = datetime.strptime(clean, fmt)
            year = parsed.year if "%Y" in fmt else current_year
            return f"{year}-{parsed.month:02d}-{parsed.day:02d}"
        except ValueError:
            pass

    # Extract number and month word via regex: "20 October"
    m = re.search(r"(\d{1,2})\s+([a-zA-Z]+)", clean)
    if m:
        day = int(m.group(1))
        month_word = m.group(2).lower()
        months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        for idx, mo in enumerate(months, start=1):
            if month_word.startswith(mo):
                return f"{current_year}-{idx:02d}-{day:02d}"

    return datetime.now().strftime("%Y-%m-%d")


class LiveFlightApiService:
    """Live B2B Flight API Client using configured access key."""

    def __init__(self):
        self.api_key = settings.FLIGHT_API_KEY
        self.use_test_env = settings.FLIGHT_API_USE_TEST_ENV
        self.base_url = settings.FLIGHT_API_TEST_BASE_URL if self.use_test_env else settings.FLIGHT_API_BASE_URL
        self.search_url = f"{self.base_url}/fms/v1/air-search-all"
        self.review_fares_url = f"{self.base_url}/fms/v1/review-fares"

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "apikey": self.api_key or "",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def search_flights(
        self,
        origin_code: str,
        dest_code: str,
        travel_date: str,
        passengers_count: int = 1,
        cabin_class: str = "ECONOMY",
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Executes live flight search request against the flight endpoint.
        Returns normalized list of flight items, or None if API request encounters an issue.
        """
        if not self.api_key:
            logger.warning("No FLIGHT_API_KEY configured.")
            return None

        iso_date = parse_travel_date_to_iso(travel_date)
        cabin = cabin_class.upper()
        if cabin not in ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]:
            cabin = "ECONOMY"

        payload = {
            "searchQuery": {
                "cabinClass": cabin,
                "paxInfo": {
                    "ADULT": str(passengers_count),
                    "CHILD": "0",
                    "INFANT": "0",
                },
                "routeInfos": [
                    {
                        "fromCityOrAirport": {"code": origin_code.upper()},
                        "toCityOrAirport": {"code": dest_code.upper()},
                        "travelDate": iso_date,
                    }
                ],
                "searchPreferences": {
                    "fsc": True
                },
            }
        }

        logger.info(
            f"Dispatching live flight search to {self.search_url}: "
            f"{origin_code} -> {dest_code} on {iso_date} ({cabin}) with configured API key."
        )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    self.search_url,
                    headers=self.headers,
                    json=payload,
                )

                if response.status_code != 200:
                    logger.warning(
                        f"Live Flight API returned status {response.status_code}: {response.text[:300]}"
                    )
                    return None

                data = response.json()
                status_obj = data.get("status", {})
                if not status_obj.get("success", False):
                    errors = data.get("errors", [])
                    logger.warning(
                        f"Live flight search unfulfilled by API provider: {errors}"
                    )
                    return None

                # Parse live flight results
                return self._parse_api_results(data, origin_code, dest_code, iso_date, cabin)

        except httpx.RequestError as exc:
            logger.error(f"Network error contacting Live Flight API: {exc}")
            return None
        except Exception as exc:
            logger.error(f"Unexpected error in live flight API integration: {exc}")
            return None

    def _parse_api_results(
        self,
        data: Dict[str, Any],
        origin_code: str,
        dest_code: str,
        travel_date: str,
        cabin_class: str,
    ) -> List[Dict[str, Any]]:
        """Parses air-search-all JSON response into clean unified flight objects."""
        flights = []
        search_result = data.get("searchResult", {})
        trip_infos = search_result.get("tripInfos", {})
        onward_list = trip_infos.get("ONWARD", []) or trip_infos.get("COMBO", [])

        for idx, item in enumerate(onward_list):
            s_i = item.get("sI", [])  # Segment info
            if not s_i:
                continue

            first_seg = s_i[0]
            last_seg = s_i[-1]

            airline_code = first_seg.get("fD", {}).get("aI", {}).get("code", "XX")
            airline_name = (
                first_seg.get("fD", {}).get("aI", {}).get("name")
                or AIRLINE_NAMES.get(airline_code, airline_code)
            )
            flight_num = f"{airline_code} {first_seg.get('fD', {}).get('fN', '')}"

            dep_time = first_seg.get("dt", f"{travel_date} 00:00")
            arr_time = last_seg.get("at", f"{travel_date} 00:00")

            duration_min = sum(seg.get("duration", 0) for seg in s_i)
            hrs, mins = divmod(duration_min, 60)
            duration_str = f"{hrs}h {mins}m" if duration_min > 0 else "4h 15m"

            stops = len(s_i) - 1

            # Extract pricing
            total_price_list = item.get("totalPriceList", [])
            price = 15000.0
            price_id = f"PRC-{idx}"
            if total_price_list:
                first_price = total_price_list[0]
                price_id = first_price.get("id", price_id)
                fd = first_price.get("fd", {}).get("ADULT", {}).get("fC", {})
                price = float(fd.get("TF", fd.get("totalPrice", 15000.0)))

            # Baggage
            b_info = first_seg.get("bI", {})
            chk_bag = b_info.get("iB", "20 kg check-in")
            cab_bag = b_info.get("cB", "7 kg cabin")
            baggage_str = f"{chk_bag}, {cab_bag}"

            flights.append({
                "flight_id": f"FLT-{item.get('id', idx)}",
                "price_id": price_id,
                "airline_name": airline_name,
                "airline_code": airline_code,
                "flight_number": flight_num,
                "origin": f"{first_seg.get('da', {}).get('city', origin_code)} ({origin_code})",
                "origin_code": origin_code,
                "destination": f"{last_seg.get('aa', {}).get('city', dest_code)} ({dest_code})",
                "destination_code": dest_code,
                "departure_time": dep_time,
                "arrival_time": arr_time,
                "duration": duration_str,
                "stops": stops,
                "cabin_class": cabin_class.capitalize(),
                "price": price,
                "currency": "INR",
                "baggage_allowance": baggage_str,
                "refundable": item.get("isRefundable", True),
                "source": "Live Flight API",
            })

        # Always return sorted from lowest price to highest price
        return sorted(flights, key=lambda x: x.get("price", 0))

    async def review_fares(self, price_id: str) -> Optional[Dict[str, Any]]:
        """Calls review-fares endpoint to validate live fare and taxes."""
        if not self.api_key:
            return None

        payload = {"priceIds": [price_id]}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.review_fares_url, headers=self.headers, json=payload)
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(f"Live fare review failed: {e}")
        return None


live_flight_service = LiveFlightApiService()
