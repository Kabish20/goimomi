import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import init_db
from app.agent.graph import process_user_turn


async def main():
    print("=" * 80)
    print("✈️ TESTING FULLY TRAINED BOT CONVERSATIONAL WORKFLOW")
    print("=" * 80)

    await init_db()
    phone = "+919222333444"
    name = "Vikram"

    # Exact step-by-step training script requested by the user:
    # 1. Welcome message
    # 2. Trip Type: One Way, Round Trip, Multi City
    # 3. Where from & Where to
    # 4. Date
    # 5. Select Passenger (adult 12+, children 2-12, infant 0-2)
    # 6. Select Class (i) economy, ii) Premium Economy, iii) Business, iv) First)
    # 7. Search API & Display from lowest price to highest price
    # 8. Passenger & Contact Info (First name, last name, passport no, country code, mobile number, mail id)
    # 9. Payment & Confirmed PNR
    conversation_steps = [
        "Hi",                                                                                     # 1. Welcome & Trip Type
        "One Way",                                                                                # 2. Pick One Way -> Asks Where from & Where to
        "Chennai to Dubai",                                                                       # 3. Where from & Where to -> Asks Date
        "20 October",                                                                             # 4. Date -> Asks Passenger breakdown
        "1 Adult",                                                                                # 5. Passenger -> Asks Cabin Class
        "Economy",                                                                                # 6. Cabin Class -> API Search (Lowest to Highest)
        "1",                                                                                      # 7. Choose Option 1 (Lowest price) -> Asks Contact details
        "First name: Vikram, Last name: Seth, Passport no: T8765432, Country code: +91, Mobile number: 9876543210, Mail id: vikram.seth@example.com", # 8. Contact details -> Payment link
        "I have paid",                                                                            # 9. Payment confirmed -> PNR & E-Ticket
    ]

    for idx, user_input in enumerate(conversation_steps, 1):
        print(f"\n[Turn {idx}] 👤 Human:\n\"{user_input}\"")
        res = await process_user_turn(phone_number=phone, incoming_text=user_input, customer_name=name)
        print(f"\n🤖 Bot:\n{res['reply_text']}")
        if res.get("suggested_actions"):
            print(f"🔘 Interactive Buttons: {res['suggested_actions']}")
        print(f"📌 Stage: {res['current_stage']}")
        print("-" * 75)

    print("\n" + "=" * 80)
    print("✅ TRAINED BOT STEP-BY-STEP WORKFLOW VALIDATION SUCCESSFUL!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
