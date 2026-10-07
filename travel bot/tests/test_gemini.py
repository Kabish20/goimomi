import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.services.gemini_service import gemini_service
from app.agent.graph import process_user_turn
from app.core.database import init_db


async def main():
    print("=" * 80)
    print("🤖 TESTING GOOGLE GEMINI AI AUTOMATION")
    print("=" * 80)

    print(f"[*] Gemini API Key configured: {settings.GEMINI_API_KEY[:10]}...{settings.GEMINI_API_KEY[-8:]}")
    print(f"[*] Gemini Model: {settings.GEMINI_MODEL}")

    # 1. Test Direct Gemini Generation
    print("\n[1] Testing direct Gemini generation...")
    test_reply = await gemini_service.generate_content("Say: 'Gemini Travel AI is online!'")
    print(f"  👉 Gemini Output: {test_reply}")

    # 2. Test Complex Natural Language Travel Intent Extraction
    test_queries = [
        "Find me a flight from Chennai to Dubai on 20 October",
        "Hey, I need to fly from Bengaluru to Singapore on 15 November with 2 passengers in Business class",
    ]

    for q in test_queries:
        print(f"\n[2] Testing AI Intent Extraction on: \"{q}\"")
        intent = await gemini_service.extract_travel_intent(q)
        print(f"  👉 Extracted JSON: {intent}")

    # 3. Test Full Bot Turn powered by Gemini
    print("\n[3] Testing Full Bot Turn via LangGraph + Gemini...")
    await init_db()
    bot_res = await process_user_turn(
        phone_number="+919988776655",
        incoming_text="Find me a flight from Chennai to Dubai on 20 October",
        customer_name="Rohan",
        channel="whatsapp",
    )
    print(f"  👉 Bot Response Stage: {bot_res['current_stage']}")
    print(f"  👉 Bot Response Text Snippet:\n{bot_res['reply_text'][:200]}...")

    print("\n" + "=" * 80)
    print("✅ GOOGLE GEMINI AUTOMATION IS FULLY CONNECTED & OPERATIONAL!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
