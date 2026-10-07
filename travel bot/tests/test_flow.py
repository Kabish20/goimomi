import sys
import asyncio
import json
import logging

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import init_db
from app.agent.graph import process_user_turn

logging.basicConfig(level=logging.WARNING)


async def main():
    print("=" * 80)
    print("[*] STARTING AI WHATSAPP TRAVEL BOT FLOW VERIFICATION")
    print("=" * 80)

    # 1. Initialize DB schema
    await init_db()

    customer_phone = "+919876543210"
    customer_name = "Kabir Sharma"

    steps = [
        "Find me a flight from Chennai to Dubai on 20 October",
        "1",                                                     # Select option 1 (Emirates)
        "Mr Kabir Sharma, Passport A9876543",                   # Passenger details
        "I have paid",                                          # Payment confirmation
    ]

    for step_num, user_msg in enumerate(steps, start=1):
        print(f"\n[Step {step_num}] Customer says:")
        print(f"  > \"{user_msg}\"")
        print("-" * 60)

        response = await process_user_turn(
            phone_number=customer_phone,
            incoming_text=user_msg,
            customer_name=customer_name,
            channel="whatsapp",
        )

        print("[AI Travel Bot WhatsApp Response]:")
        # Print with encoding safety
        print(response["reply_text"].encode("utf-8", errors="replace").decode("utf-8"))
        print(f"\n[Current Stage]: {response['current_stage']}")
        if response.get("suggested_actions"):
            print(f"[Interactive Buttons]: {response['suggested_actions']}")
        if response.get("pnr"):
            print(f"[Confirmed PNR]: {response['pnr']}")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
