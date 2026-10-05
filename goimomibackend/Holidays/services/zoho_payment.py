import logging
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.core.cache import cache
from zohopayments import ZohoPayments, Edition
from zohopayments.params import (
    PaymentSessionCreateParams,
    ConfigurationsParams,
    HostedPageParams,
    CustomerCreateParams,
    RefundCreateParams
)

logger = logging.getLogger(__name__)

class ZohoPaymentService:
    PAID_STATUSES = {'paid', 'succeeded', 'completed', 'success'}

    @staticmethod
    def _get_value(value, field, default=None):
        if isinstance(value, dict):
            return value.get(field, default)
        return getattr(value, field, default)

    @staticmethod
    def get_client():
        """
        Initializes and returns a ZohoPayments client instance.
        Uses cached access token if available, otherwise generates a new one.
        """
        account_id = getattr(settings, 'ZOHO_PAYMENTS_ACCOUNT_ID', '')
        client_id = getattr(settings, 'ZOHO_PAYMENTS_CLIENT_ID', '')
        client_secret = getattr(settings, 'ZOHO_PAYMENTS_CLIENT_SECRET', '')
        refresh_token = getattr(settings, 'ZOHO_PAYMENTS_REFRESH_TOKEN', '')
        redirect_uri = getattr(settings, 'ZOHO_PAYMENTS_REDIRECT_URI', 'https://goimomi.com')
        edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()

        if not account_id or not client_id or not client_secret or not refresh_token:
            logger.error("Zoho Payments configuration parameters missing in settings.")
            raise ValueError("Zoho Payments configuration is missing in settings.")

        # Map edition string to Edition enum
        # IMPORTANT: IN_SANDBOX requires scopes ZohoPaySandbox.* and soid=zohopaysandbox.<account_id>
        if edition_str == 'IN':
            edition = Edition.IN
        elif edition_str == 'US':
            edition = Edition.US
        elif edition_str == 'IN_SANDBOX':
            edition = Edition.IN_SANDBOX
        else:
            edition = Edition.IN_SANDBOX

        logger.info(f"[ZohoPayments] Initializing client | Edition={edition_str} | AccountID={account_id}")

        # Retrieve cached access token
        cache_key = f"zoho_payments_access_token_{account_id}_{edition_str}"
        access_token = cache.get(cache_key)

        if not access_token:
            logger.info("[ZohoPayments] No cached token found — generating a fresh OAuth access token.")
            try:
                fresh_token_obj = ZohoPayments.generate_access_token(
                    refresh_token=refresh_token,
                    client_id=client_id,
                    client_secret=client_secret,
                    redirect_uri=redirect_uri,
                    edition=edition
                )
                access_token = fresh_token_obj.access_token
                logger.info(f"[ZohoPayments] Fresh access token generated successfully.")

                # Cache token with safety margin (default Zoho tokens are 3600 seconds)
                expires_in = getattr(fresh_token_obj, 'expires_in', 3600)
                cache_timeout = max(int(expires_in) - 300, 60)
                cache.set(cache_key, access_token, cache_timeout)
                logger.info(f"[ZohoPayments] Access token cached for {cache_timeout} seconds.")
            except Exception as e:
                logger.error(f"[ZohoPayments] Error generating access token: {e}", exc_info=True)
                raise e

        # Build client
        client = (
            ZohoPayments.builder()
            .account_id(account_id)
            .edition(edition)
            .oauth_token(access_token)
            .build()
        )
        logger.info(f"[ZohoPayments] Client built successfully for edition={edition_str}")
        return client

    @classmethod
    def create_checkout_session(cls, booking, success_url, failure_url):
        """
        Creates a Zoho Payments session for a CabBooking.
        """
        try:
            client = cls.get_client()

            # Construct hosted page params
            hosted_params = HostedPageParams(
                description=f"Cab Booking {booking.booking_id} payment",
                success_url=success_url,
                failure_url=failure_url,
                name=f"{booking.first_name} {booking.last_name}",
                email=booking.email or "",
                phone=booking.phone or "",
            )

            config_params = ConfigurationsParams(
                hosted_page_parameters=hosted_params
            )

            # Determine currency based on edition or default to INR for India Sandbox
            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            currency = 'USD' if edition_str == 'US' else 'INR'

            create_params = PaymentSessionCreateParams(
                amount=float(booking.price),
                currency=currency,
                description=f"Goimomi Holidays Cab Booking - {booking.booking_id}",
                configurations=config_params,
                reference_number=booking.booking_id,
            )

            logger.info(f"[ZohoPayments] Creating payment session for booking={booking.booking_id}, amount={booking.price} {currency}")

            # Call the SDK API
            session = client.payment_sessions().create(create_params)
            logger.info(f"[ZohoPayments] Payment session created successfully for booking={booking.booking_id}")
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating checkout session for booking {booking.booking_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def create_product_checkout_session(cls, order, success_url, failure_url):
        """
        Creates a Zoho Payments session for a GoimomiProductOrder.
        """
        try:
            client = cls.get_client()

            # Construct hosted page params
            hosted_params = HostedPageParams(
                description=f"Product Order {order.order_id} payment",
                success_url=success_url,
                failure_url=failure_url,
                name=order.name,
                email=order.email or "",
                phone=order.phone or "",
            )

            config_params = ConfigurationsParams(
                hosted_page_parameters=hosted_params
            )

            # Determine currency based on edition or default to INR
            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            currency = 'USD' if edition_str == 'US' else 'INR'

            create_params = PaymentSessionCreateParams(
                amount=float(order.total_amount),
                currency=currency,
                description=f"Goimomi Holidays Product Order - {order.order_id}",
                configurations=config_params,
                reference_number=order.order_id,
            )

            logger.info(f"[ZohoPayments] Creating payment session for order={order.order_id}, amount={order.total_amount} {currency}")

            # Call the SDK API
            session = client.payment_sessions().create(create_params)
            logger.info(f"[ZohoPayments] Payment session created successfully for order={order.order_id}")
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating checkout session for order {order.order_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def create_visa_checkout_session(cls, application, success_url, failure_url):
        """
        Creates a Zoho Payments session for a VisaApplication.
        """
        try:
            client = cls.get_client()

            # First applicant or main contact details
            first_applicant = application.applicants.first()
            name = f"{first_applicant.first_name} {first_applicant.last_name}" if first_applicant else "Visa Applicant"
            email = ""
            phone = first_applicant.phone if (first_applicant and first_applicant.phone) else ""

            hosted_params = HostedPageParams(
                description=f"Visa Application #{application.id} - {application.visa.country} payment",
                success_url=success_url,
                failure_url=failure_url,
                name=name,
                email=email,
                phone=phone,
            )

            config_params = ConfigurationsParams(
                hosted_page_parameters=hosted_params
            )

            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            currency = 'USD' if edition_str == 'US' else 'INR'

            create_params = PaymentSessionCreateParams(
                amount=float(application.total_price),
                currency=currency,
                description=f"Goimomi Holidays Visa Application - #{application.id} ({application.visa.country})",
                configurations=config_params,
                reference_number=f"VISA-{application.id}",
            )

            logger.info(f"[ZohoPayments] Creating payment session for visa application={application.id}, amount={application.total_price} {currency}")

            session = client.payment_sessions().create(create_params)
            logger.info(f"[ZohoPayments] Payment session created successfully for visa application={application.id}")
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating checkout session for visa application {application.id}: {e}", exc_info=True)
            raise e

    @classmethod
    def create_package_checkout_session(cls, booking, success_url, failure_url):
        """
        Creates a Zoho Payments session for a PackageBooking.
        """
        try:
            client = cls.get_client()

            hosted_params = HostedPageParams(
                description=f"Package Booking {booking.booking_id} payment",
                success_url=success_url,
                failure_url=failure_url,
                name=booking.full_name,
                email=booking.email or "",
                phone=booking.phone or "",
            )

            config_params = ConfigurationsParams(
                hosted_page_parameters=hosted_params
            )

            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            currency = 'USD' if edition_str == 'US' else 'INR'

            create_params = PaymentSessionCreateParams(
                amount=float(booking.total_price),
                currency=currency,
                description=f"Goimomi Holidays Package Booking - {booking.booking_id}",
                configurations=config_params,
                reference_number=booking.booking_id,
            )

            logger.info(f"[ZohoPayments] Creating payment session for package booking={booking.booking_id}, amount={booking.total_price} {currency}")

            session = client.payment_sessions().create(create_params)
            logger.info(f"[ZohoPayments] Payment session created successfully for package booking={booking.booking_id}")
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating checkout session for package booking {booking.booking_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def create_flight_checkout_session(cls, booking_id, amount, name, email="", phone="", description=None, success_url=None, failure_url=None):
        """
        Creates a Zoho Payments session for a Flight Booking.
        """
        try:
            client = cls.get_client()

            hosted_params = HostedPageParams(
                description=description or f"Flight Booking {booking_id} payment",
                success_url=success_url,
                failure_url=failure_url,
                name=name or "Passenger",
                email=email or "",
                phone=phone or "",
            )

            config_params = ConfigurationsParams(
                hosted_page_parameters=hosted_params
            )

            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            currency = 'USD' if edition_str == 'US' else 'INR'

            create_params = PaymentSessionCreateParams(
                amount=float(amount),
                currency=currency,
                description=description or f"Goimomi Holidays Flight Booking - {booking_id}",
                configurations=config_params,
                reference_number=str(booking_id),
            )

            logger.info(f"[ZohoPayments] Creating payment session for flight booking={booking_id}, amount={amount} {currency}")

            session = client.payment_sessions().create(create_params)
            logger.info(f"[ZohoPayments] Payment session created successfully for flight booking={booking_id}")
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating checkout session for flight booking {booking_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def create_hotel_checkout_session(cls, booking_id, amount, name, email="", phone="", description=None, success_url=None, failure_url=None):
        """
        Creates a Zoho Payments session for a Hotel Booking.
        """
        try:
            client = cls.get_client()

            hosted_params = HostedPageParams(
                description=description or f"Hotel Booking {booking_id} payment",
                success_url=success_url,
                failure_url=failure_url,
                name=name or "Hotel Guest",
                email=email or "",
                phone=phone or "",
            )

            config_params = ConfigurationsParams(
                hosted_page_parameters=hosted_params
            )

            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            currency = 'USD' if edition_str == 'US' else 'INR'

            create_params = PaymentSessionCreateParams(
                amount=float(amount),
                currency=currency,
                description=description or f"Goimomi Holidays Hotel Booking - {booking_id}",
                configurations=config_params,
                reference_number=str(booking_id),
            )

            logger.info(f"[ZohoPayments] Creating payment session for hotel booking={booking_id}, amount={amount} {currency}")

            session = client.payment_sessions().create(create_params)
            logger.info(f"[ZohoPayments] Payment session created successfully for hotel booking={booking_id}")
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating checkout session for hotel booking {booking_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def get_payment_session(cls, session_id):
        """
        Retrieves the details of a Zoho Payment Session.
        """
        try:
            client = cls.get_client()
            session = client.payment_sessions().get(session_id)
            return session
        except Exception as e:
            logger.error(f"[ZohoPayments] Error retrieving payment session {session_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def verify_paid_session(cls, session_id, *, reference_number, amount, currency):
        """Return whether Zoho confirms the exact stored checkout session was paid."""
        if not session_id:
            return False

        session = cls.get_payment_session(session_id)
        actual_session_id = cls._get_value(session, 'payments_session_id')
        actual_reference = cls._get_value(session, 'reference_number')
        actual_currency = cls._get_value(session, 'currency')
        actual_amount = cls._get_value(session, 'amount')

        if actual_session_id != session_id or actual_reference != reference_number:
            logger.warning("[ZohoPayments] Payment session identity or reference mismatch for %s", reference_number)
            return False

        if str(actual_currency or '').upper() != str(currency or '').upper():
            logger.warning("[ZohoPayments] Payment currency mismatch for %s", reference_number)
            return False

        try:
            expected_amount = Decimal(str(amount)).quantize(Decimal('0.01'))
            received_amount = Decimal(str(actual_amount)).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            logger.warning("[ZohoPayments] Invalid payment amount returned for %s", reference_number)
            return False

        if received_amount != expected_amount:
            logger.warning("[ZohoPayments] Payment amount mismatch for %s", reference_number)
            return False

        session_status = str(cls._get_value(session, 'status', '')).lower()
        payment_statuses = {
            str(cls._get_value(payment, 'status', '')).lower()
            for payment in (cls._get_value(session, 'payments', []) or [])
        }
        return session_status in cls.PAID_STATUSES or bool(payment_statuses & cls.PAID_STATUSES)

    @classmethod
    def create_customer(cls, name, email, phone=None, country_code=None):
        """
        Creates a Zoho Payments customer profile.
        """
        try:
            client = cls.get_client()
            params = CustomerCreateParams(
                name=name,
                email=email,
                phone=phone,
                phone_country_code=country_code
            )
            customer = client.customers().create(params)
            return customer
        except Exception as e:
            logger.error(f"[ZohoPayments] Error creating customer {email}: {e}", exc_info=True)
            raise e

    @classmethod
    def process_refund(cls, payment_id, amount, reason, initiated_by="initiated_by_merchant", description=None):
        """
        Processes a refund for a successful payment.
        """
        try:
            client = cls.get_client()
            params = RefundCreateParams(
                amount=float(amount),
                reason=reason,
                type=initiated_by,
                description=description
            )
            refund = client.refunds().create(payment_id, params)
            return refund
        except Exception as e:
            logger.error(f"[ZohoPayments] Error processing refund for payment {payment_id}: {e}", exc_info=True)
            raise e

    @classmethod
    def clear_token_cache(cls):
        """
        Clears the cached Zoho Payments access token, forcing a fresh one on next request.
        Call this after updating the refresh token in .env.
        """
        account_id = getattr(settings, 'ZOHO_PAYMENTS_ACCOUNT_ID', '')
        edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
        cache_key = f"zoho_payments_access_token_{account_id}_{edition_str}"
        cache.delete(cache_key)
        logger.info(f"[ZohoPayments] Token cache cleared for account={account_id} edition={edition_str}")
