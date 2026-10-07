# ✈️ AI-Powered WhatsApp Travel Booking Bot

An enterprise-ready, conversational travel assistant built with **FastAPI**, **LangGraph**, **OpenAI**, **PostgreSQL**, **WhatsApp Business Cloud API**, and **Zoho Payments**.

---

## 🏛️ System Architecture

```
                    CUSTOMER
                       │
                       ▼
              WhatsApp Business API (Cloud API)
                       │
                       ▼
                ┌───────────────┐
                │ FastAPI       │
                │ Backend       │
                └───────┬───────┘
                        │
                        ▼
              ┌──────────────────┐
              │   AI AGENT       │
              │ OpenAI + LangGraph│
              └────────┬─────────┘
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
   Conversation    Tool Calling     Knowledge
     Memory           Layer           Base
        │              │               │
        ▼              ▼               ▼
   PostgreSQL      Travel APIs       pgvector
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
    Flights          Hotels            Cabs
       │               │                │
       └───────────────┼────────────────┘
                       ▼
                 Booking Engine
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Payment             Confirmation
          Gateway (Zoho)      / PNR / E-Ticket
             │                   │
             └─────────┬─────────┘
                       ▼
                    WhatsApp
```

---

## 🔁 End-to-End Customer Booking Flow

```
Customer: "Find me a flight from Chennai to Dubai on 20 October"
   ↓
extract_travel_details()   -> (Origin: MAA, Destination: DXB, Date: 2026-10-20)
   ↓
search_flights()           -> Queries Flight Engine (Emirates, IndiGo, Air India, Flydubai)
   ↓
filter_flights()           -> Rank by price & duration
   ↓
recommend_flights()        -> Send WhatsApp Interactive Cards / Reply Buttons
   ↓
Customer selects flight    -> (e.g., Option 1: Emirates EK 543)
   ↓
get_fare_details()         -> Show Base Fare + Taxes + Baggage policy
   ↓
collect_passenger_details()-> Prompt customer for Name & Passport/Govt ID
   ↓
create_payment_link()      -> Generate secure Zoho Payments link
   ↓
verify_payment()           -> Zoho Webhook receives payment success
   ↓
book_flight()              -> Lock airline seats
   ↓
get_PNR()                  -> Issue official Airline PNR (e.g. EK849X)
   ↓
send_confirmation_whatsapp()-> Deliver confirmation card + E-Ticket PDF via WhatsApp
```

---

## 🚀 Key Features

- **Multi-Turn State Machine**: Powered by **LangGraph** with state checkpointing and conversation memory.
- **WhatsApp Cloud API Integration**: Supports text messaging, interactive quick-reply buttons, CTA URL payment links, and document delivery.
- **Zoho Payments Ready**: Checkout link generation and secure webhook callback verification.
- **Flight Engine**: Rich mock and production-ready adapters with realistic flight schedules, taxes, and baggage allowances.
- **Dual Database Support**: Native asynchronous PostgreSQL with automatic SQLite fallback for rapid local offline development.
- **Built-in WhatsApp Simulator**: Visual web simulator accessible at `http://localhost:8000/simulator` to test conversations without needing live Meta API credentials upfront.
- **Full REST API Suite**: Comprehensive endpoints for customers, conversations, searches, bookings, and payments.

---

## 📂 Project Structure

```
travel-bot/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── ai_chat.py         # /api/ai/chat & /api/ai/webhook/whatsapp
│   │       │   ├── customers.py       # /api/customers
│   │       │   ├── conversations.py   # /api/conversations & messages
│   │       │   ├── flights.py         # /api/flights/search, /fare, /book
│   │       │   ├── payments.py        # /api/payments/create, /verify (Zoho webhook)
│   │       │   └── bookings.py        # /api/bookings, /{id}/cancel, /{id}/modify
│   │       └── router.py              # Aggregated API routes
│   ├── core/
│   │   ├── config.py                  # Pydantic Settings
│   │   └── database.py                # Async SQLAlchemy engine & session factory
│   ├── models/                        # SQLAlchemy Models
│   │   ├── customer.py                # Customer
│   │   ├── conversation.py            # Conversation, Message
│   │   ├── travel_requirement.py      # TravelRequirement
│   │   ├── booking.py                 # FlightSearch, FlightBooking, Passenger
│   │   ├── payment.py                 # Payment
│   │   └── document.py                # BookingDocument
│   ├── schemas/                       # Pydantic Request/Response DTOs
│   │   ├── customer.py
│   │   ├── conversation.py
│   │   ├── flight.py
│   │   ├── booking.py
│   │   ├── payment.py
│   │   ├── chat.py
│   │   └── whatsapp.py
│   ├── services/
│   │   ├── flight_service.py          # Flight Search & PNR generator
│   │   ├── zoho_payment_service.py    # Zoho payment links & webhook signatures
│   │   └── whatsapp_service.py        # WhatsApp Cloud API client
│   ├── agent/                         # LangGraph AI Layer
│   │   ├── state.py                   # AgentState definition
│   │   ├── tools.py                   # Tool calling implementations
│   │   ├── nodes.py                   # State machine nodes
│   │   └── graph.py                   # Compiled StateGraph & turn runner
│   └── main.py                        # FastAPI entrypoint & WhatsApp Simulator
├── docker-compose.yml                 # PostgreSQL + pgvector + Redis
├── requirements.txt                   # Dependencies
├── test_flow.py                       # End-to-end booking journey test runner
├── .env.example                       # Environment template
└── README.md
```

---

## 🛠️ Installation & Setup

### 1. Clone & Setup Virtual Environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```env
PROJECT_NAME="AI Travel Assistant"
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/travelbot"
USE_SQLITE_FALLBACK=true

OPENAI_API_KEY="sk-..."
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_ACCESS_TOKEN="..."
WHATSAPP_VERIFY_TOKEN="travelbot_secure_verify_token_2026"
ZOHO_CLIENT_ID="..."
ZOHO_CLIENT_SECRET="..."

# Live B2B Flight API
FLIGHT_API_KEY="2136600e825085-3cb6-4361-b5cf-910217fd6152"
FLIGHT_API_BASE_URL="https://api.flightengine.com"
FLIGHT_API_USE_TEST_ENV=false
```

### 3. Start Database (Optional Docker)
```bash
docker-compose up -d
```
*(If Docker is not running, the app automatically runs seamlessly using SQLite fallback `travelbot.db`)*

### 4. Start the Application
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🧪 Testing the Booking Journey

### Option A: Interactive WhatsApp Visual Simulator
Open your browser and navigate to:
👉 **`http://localhost:8000/simulator`**

You will see an interactive mobile chat UI simulating WhatsApp messages, button taps, and payment confirmations in real time.

### Option B: Automated End-to-End CLI Script
Run:
```bash
python test_flow.py
```
This tests:
1. "Find me a flight from Chennai to Dubai on 20 October"
2. Flight options parsing & ranking
3. Selecting Option 1 (Emirates)
4. Passing passenger details
5. Generating Zoho payment link
6. Simulating payment confirmation & issuing airline PNR!

### Option C: Interactive Swagger Documentation
Explore all REST endpoints at:
👉 **`http://localhost:8000/docs`**

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/chat` | Direct conversation endpoint for web widgets & testers |
| `GET` | `/api/ai/webhook/whatsapp` | Meta WhatsApp Cloud API verification webhook |
| `POST` | `/api/ai/webhook/whatsapp` | Meta WhatsApp inbound message webhook receiver |
| `GET` | `/api/customers` | List all customer profiles |
| `POST` | `/api/customers` | Register a new customer |
| `GET` | `/api/conversations` | List conversations and stages |
| `GET` | `/api/conversations/{id}/messages` | Message history log |
| `POST` | `/api/flights/search` | Search available flights |
| `GET` | `/api/flights/fare` | Get flight tax breakdown & baggage policies |
| `POST` | `/api/flights/book` | Direct booking & PNR issuance |
| `POST` | `/api/payments/create` | Generate Zoho payment link for booking |
| `POST` | `/api/payments/verify` | Zoho payment webhook receiver |
| `GET` | `/api/bookings` | List all bookings |
| `GET` | `/api/bookings/{id}` | Get booking details & passengers |
| `POST` | `/api/bookings/{id}/cancel` | Cancel booking |
| `POST` | `/api/bookings/{id}/modify` | Reschedule travel date |
