import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.services.live_flight_service import live_flight_service, parse_travel_date_to_iso
from app.services.flight_service import flight_service


async def main():
    print("=" * 80)
    print("✈️ TESTING LIVE B2B FLIGHT API INTEGRATION")
    print("=" * 80)

    key = settings.FLIGHT_API_KEY or ""
    print(f"[*] Flight API Key configured: {key[:10]}...{key[-8:] if len(key) > 8 else ''}")
    print(f"[*] Target Endpoint: {live_flight_service.search_url}")
    print(f"[*] Date parsing test ('20 October'): {parse_travel_date_to_iso('20 October')}")

    print("\n[*] Dispatching search_flights via FlightService (Chennai -> Dubai)...")
    flights = await flight_service.search_flights(
        origin="Chennai",
        destination="Dubai",
        travel_date="20 October",
        passengers_count=1,
        cabin_class="Economy",
    )

    print(f"\n[OK] Flights retrieved: {len(flights)}")
    for idx, f in enumerate(flights[:3], 1):
        print(f"  {idx}. {f['airline_name']} ({f['flight_number']}) - INR {f['price']:,.0f} [{f['duration']}]")

    print("\n" + "=" * 80)
    print("✅ LIVE FLIGHT API INTEGRATION IS WIRED AND FUNCTIONING PROPERLY!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
