import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import init_db
from app.agent.graph import process_user_turn


async def main():
    print("=" * 80)
    print("✈️ TESTING GUIDED QUESTION & ANSWER FLIGHT WORKFLOW")
    print("=" * 80)

    await init_db()
    phone = "+919111222333"
    name = "Vikram"

    steps = [
        "Hi",                                # User says Hi
        "Chennai to Dubai",                  # User answers Step 1 (Route)
        "20 October, One-way",               # User answers Step 2 (Date & Trip Type)
        "1",                                 # User selects Option 1 (Flight)
        "Mr Vikram Seth, Passport T8765432", # User provides passenger details
        "I have paid"                        # User confirms payment
    ]

    for idx, user_input in enumerate(steps, 1):
        print(f"\n[Turn {idx}] Human: \"{user_input}\"")
        res = await process_user_turn(phone_number=phone, incoming_text=user_input, customer_name=name)
        print(f"🤖 Bot:\n{res['reply_text']}")
        if res.get("suggested_actions"):
            print(f"🔘 Options/Buttons: {res['suggested_actions']}")
        print(f"📌 Stage: {res['current_stage']}")
        print("-" * 60)

    print("\n✅ STEP-BY-STEP WORKFLOW VALIDATION COMPLETE!")


if __name__ == "__main__":
    asyncio.run(main())
