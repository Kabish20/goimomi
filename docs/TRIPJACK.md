# TripJack Flights integration

Reference: https://tripjack.com/page/api-doc and the supplied Flights API v2.0.2 text.

## Configuration

Set these in `goimomibackend/.env` (the Django settings load this file):

```dotenv
TRIPJACK_API_KEY=
TRIPJACK_ENVIRONMENT=uat
TRIPJACK_BOOKING_ENABLED=False
```

Use separate UAT/production credentials. Never put the key in Vite variables or browser code. Whitelist your backend server's IPv4 address with TripJack. The connector chooses fixed HTTPS hosts, sends `apikey`, uses endpoints without trailing slashes and never retries requests automatically.

## Customer experience

`/flights` offers one-way, return and up to six multi-city legs, cabin and passenger selection, airline preferences and regular/student/senior fares. The navigation and footer link to this page. Search redirects to `/flights/results`, with sorting, date changes, fare selection, comparison and filters derived from supplier data. Selecting all journey fares calls review and redirects to `/flights/review`. Review shows the authoritative fare, session lifetime and fare-change acknowledgement before the travel-team handoff. Search/review context is retained in tab session storage for refresh and back navigation, with search results cached for at most 15 minutes. No passenger identity or payment details are stored.

The search layout follows the supplied screenshots using the existing local aircraft-wing image. SOTO/NDC are visibly unavailable because the supplied API contract does not define those modifiers. Invoice/net pricing toggles are not offered without supported pricing data. No sample flight results or indicative fares are displayed in the customer app. Unconfigured installations display the supplier-service error; backend connection failures now display the proxy error instead of a misleading input-validation message.

Frontend browser verification: run `npm run test:browser:flights` in `goimomifrontend` with Vite running on port 5174 (override with `VERIFY_BASE_URL`). This uses mocked supplier responses and saves desktop/mobile screenshots under `goimomifrontend/output/flights`.

Public endpoints:

- `POST /api/flights/search/`: documented `{searchQuery: {...}}`; returns the supplier result plus a signed `searchToken` and `expiresIn: 900`.
- `POST /api/flights/review/`: `{searchToken, priceIds}`. Enforces the search lifetime, one fare per journey and matching special-return fares. Returns itinerary, price, conditions and alerts, excluding the supplier booking ID.

Prices in search are multiplied by passenger counts. Review is authoritative; FAREALERT is displayed. Customer checkout/payment and ticket delivery are **not implemented**: customers contact the travel team after reviewing. Public users cannot access bookings or account balances.

## Staff API adapter

Authenticated Django staff can POST supplier-format JSON to `/api/flights/staff/<operation>/`. This is a low-level integration adapter for staff tooling, not an automated checkout workflow. Supplier validation remains authoritative. `user-detail` uses GET; every other operation uses POST.

Supported operations are listed in `Holidays/tripjack.py`: search, fare-rules, review, seats, fare-validate, book, hold-validate, confirm-book, booking-details, unhold, amendment-charges, submit-amendment, amendment-details, fetch-ssr, fetch-seats, add-ssr, reissue-query, reissue-search, reissue-review, reissue-book and user-detail.

Mutations (including holds and cancellations) require `TRIPJACK_BOOKING_ENABLED=True`. Enable only when staff tooling is ready. The adapter does not persist orders or reconcile payments. Staff callers must implement the following documented workflow before using these operations:

1. Review price IDs; enforce the returned `conditions.st` lifetime and acknowledge FAREALERT changes.
2. Call seats only when `conditions.isa` is true. Collect travellers and required DOB/passport/GST/emergency contact/document fields from review conditions.
3. Validate fare before committing. Instant book includes `paymentInfos: [{amount: <review TF>}]`; never send a payment medium. Hold omits paymentInfos and requires `conditions.isBA`.
4. For a hold, use hold-validate before confirm-book. Check changes and expiration before ticketing.
5. Wait at least five seconds before booking-details, then poll pending orders. A timeout is an unknown outcome: check details before any retry. Do not blindly repeat mutations.
6. Amend only SUCCESS orders. Submit cancellation/VOIDED/FULL_REFUND with remarks and poll amendment-details at ten-second intervals, at most five times before staff escalation.
7. For reissue use query, search, review, book; preserve original passenger data, allow one trip at a time and no cabin downgrade. Ancillaries use supplier segment/pax IDs and SSR amounts.

No real supplier call, booking or payment is made by the automated tests. Before launch complete TripJack's UAT cases (one-way, domestic/international return, multi-city, special return, passport, GST and SSR), securely provide certification logs through the agreed support channel, obtain approval and production credentials, then change environment. Do not commit credentials or passenger logs.

The pasted reference has inconsistent passenger guidance: error 1006 says nine passengers while UAT examples include 5 adults, 3 children and 2 infants. The search validator limits seated passengers to nine and infants to adults; confirm this interpretation during certification. The VOID operation table also says VOID while detailed requests say VOIDED; staff callers should use the detailed contract and verify in UAT.

## Verification

```powershell
cd goimomibackend
python manage.py test Holidays.test_flights --settings=backend.test_settings
```

### Fare rules and workflow verification
Public POST /api/flights/fare-rules/ accepts searchToken and priceId, validates the signed 15-minute search context, and forces SEARCH flow to fms/v2/farerule. Results > View Details > View fare rules loads the selected fare's cancellation, date-change, no-show and seat policies, with miscInfo fallback. Rules are rendered as text.
The TripJack flight website redirected to its login page during the September 29, 2026 review. Its authenticated screen sequence has not been verified. Current customer flow remains search, results, optional fare rules, fare review and travel-team contact. Traveller collection, payment and ticket confirmation are not implemented as customer checkout; live supplier verification requires configured credentials.

