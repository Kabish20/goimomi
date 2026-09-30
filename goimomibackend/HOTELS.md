# TripJack Hotels v3

Customer routes: `/hotel` (image-led search), `/hotel/results` (listing, filters and room options), `/hotel/review` (price review). Supports destination lookup, 1–9 rooms, adults and child ages, nationality, listing, dynamic room options, and price review. The UI uses INR, displays management fee and management fee tax separately, and renders booking notes and embedded cancellation penalties in IST. Review is not a reservation; the customer can contact the travel team afterward. The hero image is a generated local asset; hotel card photos, star ratings and property types come from the static-content API. Listing rates and room options remain dynamic supplier data.

## Setup

Set `TRIPJACK_HOTEL_API_KEY` in the backend `.env` (falls back to `TRIPJACK_API_KEY`). Keep `TRIPJACK_ENVIRONMENT=uat` until TripJack certification and production approval. Never put a key in Vite environment variables.

Run `python manage.py sync_hotel_destinations` to fetch every cursor page of city-region data into the ignored local `hotel_destinations.json`. Refresh this catalogue periodically and distribute it to each backend instance. Existing catalogue is retained if sync fails. Start Django and the frontend as described in README.

Public backend routes under `/api/hotels/`: GET `destinations/?q=...`, GET `nationalities/` (TripJack nationality IDs), GET `countries/` (TripJack hotel-country names), POST `search/`, POST `pricing/`, POST `review/`. The nationality dropdown uses `nationalities/`; Country of Residence uses `countries/` for display. TripJack's v3 listing request accepts nationality but does not define a residence field, so residence is kept as a UI preference and is not sent to the supplier.

If TripJack credentials are absent or the list endpoints cannot be reached, the two dropdown APIs serve the project's existing Country and Nationality tables. Local nationality entries carry `countryId: local:<id>` and cannot be used for supplier searches; the UI explains this before submitting. This fallback keeps the selectors usable without pretending that local IDs are TripJack IDs.

City searches map one page of up to 100 hotel IDs into a listing request. “Next hotels” searches the next mapping page, replacing the displayed batch. This is not a globally sorted result set. Dynamic detail is authoritative for room options. Signed 15-minute contexts preserve dates, room order, nationality and correlationId; pricing does not extend the original expiry. Invalid hotel/option selections are rejected before supplier calls. Keys remain server-side. Review booking IDs are withheld from public responses.

## Reference decisions and remaining work

The pasted September 2026 reference contains contradictions: the overview mentions searchId/reviewId while detailed requests use correlationId, hid and reviewHash, and Review returns bookingId. Implementation follows the detailed examples. Listing uses hids, not the obsolete cityCode. UAT nationality uses apitest.tripjack.com, other search APIs use apitest-hms.tripjack.com; production uses hms-search.tripjack.com.

Hotel images/static descriptions, guest collection, PAN/passport collection, payments, instant/hold booking, confirmation, persistent orders and cancellations are not implemented by this change. Booking requires a separate verified checkout workflow; no supplier booking call is made by this UI. Live responses and UAT certification still need valid credentials, IP whitelisting and TripJack verification. No sample inventory or rates are shown to customers when service configuration is missing.

Validation: `python manage.py test Holidays.test_hotels --settings=backend.test_settings`; frontend lint/build and `node scripts/verify-hotels.mjs` with Vite on port 5174. Browser and unit tests mock supplier APIs.
