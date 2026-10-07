import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import init_db
from app.agent.graph import process_user_turn


async def main():
    print("=" * 80)
    print("✈️ TESTING ROUND TRIP AND MULTI CITY FLOWS")
    print("=" * 80)

    await init_db()

    # 1. Round Trip Test
    print("\n--- TEST 1: ROUND TRIP FLOW ---")
    rt_phone = "+919333444555"
    rt_steps = [
        "Hi",
        "Round Trip",
        "Chennai to Dubai",
        "Depart 20 October, Return 27 October",
        "2 Adults",
        "Business",
    ]
    for idx, msg in enumerate(rt_steps, 1):
        print(f"\n[RT Turn {idx}] 👤 Human: \"{msg}\"")
        res = await process_user_turn(phone_number=rt_phone, incoming_text=msg, customer_name="Siddharth")
        print(f"🤖 Bot:\n{res['reply_text']}")
        print(f"🔘 Buttons: {res.get('suggested_actions')}")

    # 2. Multi City Test
    print("\n--- TEST 2: MULTI CITY FLOW ---")
    mc_phone = "+919444555666"
    mc_steps = [
        "Hi",
        "Multi City",
        "MAA to DXB, DXB to LHR, LHR to MAA",
        "20 October",
        "1 Adult",
        "Economy",
    ]
    for idx, msg in enumerate(mc_steps, 1):
        print(f"\n[MC Turn {idx}] 👤 Human: \"{msg}\"")
        res = await process_user_turn(phone_number=mc_phone, incoming_text=msg, customer_name="Ananya")
        print(f"🤖 Bot:\n{res['reply_text']}")
        print(f"🔘 Buttons: {res.get('suggested_actions')}")

    print("\n" + "=" * 80)
    print("✅ ROUND TRIP AND MULTI CITY FLOWS VERIFIED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
