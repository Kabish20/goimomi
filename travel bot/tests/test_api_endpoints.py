import sys
import asyncio
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import init_db
from app.main import app


async def test_all_endpoints():
    print("[*] Running API Endpoint Validation...")
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/")
        assert res.status_code == 200, f"Root failed: {res.text}"
        print(" [OK] GET / (Root health check)")

        # 2. Flight search
        flight_payload = {
            "origin": "Chennai",
            "destination": "Dubai",
            "travel_date": "2026-10-20",
            "passengers_count": 1,
            "cabin_class": "Economy"
        }
        res = await client.post("/api/flights/search", json=flight_payload)
        assert res.status_code == 200, f"Flight search failed: {res.text}"
        data = res.json()
        assert data["total_found"] > 0, "No flights found"
        print(f" [OK] POST /api/flights/search (Found {data['total_found']} flights)")

        # 3. Fare breakdown
        res = await client.get("/api/flights/fare?flight_id=FL-EK543")
        assert res.status_code == 200, f"Fare failed: {res.text}"
        fare = res.json()
        print(f" [OK] GET /api/flights/fare (Base: INR {fare['base_fare']}, Total: INR {fare['total_fare']})")

        # 4. AI Chat endpoint
        chat_payload = {
            "phone_number": "+919876543210",
            "message": "Find me a flight from Chennai to Dubai on 20 October",
            "customer_name": "Kabir Sharma"
        }
        res = await client.post("/api/ai/chat", json=chat_payload)
        assert res.status_code == 200, f"AI chat failed: {res.text}"
        chat_res = res.json()
        assert chat_res["current_stage"] == "flights_offered"
        print(f" [OK] POST /api/ai/chat (Stage: {chat_res['current_stage']})")

        # 5. Customers list
        res = await client.get("/api/customers/")
        assert res.status_code == 200, f"Customers failed: {res.text}"
        customers = res.json()
        print(f" [OK] GET /api/customers/ ({len(customers)} registered customers)")

        # 6. Bookings list
        res = await client.get("/api/bookings/")
        assert res.status_code == 200, f"Bookings failed: {res.text}"
        bookings = res.json()
        print(f" [OK] GET /api/bookings/ ({len(bookings)} bookings logged)")

    print("\n[SUCCESS] ALL REST & AI ENDPOINTS VALIDATED AND PASSING!")


if __name__ == "__main__":
    asyncio.run(test_all_endpoints())
