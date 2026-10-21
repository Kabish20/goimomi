import os
import base64
import io
from datetime import datetime
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

def format_time_field(raw_time):
    if not raw_time or raw_time == "N/A":
        return "N/A"
    parts = raw_time.strip().split()
    time_part = parts[1] if len(parts) == 2 else parts[0]
    if ":" in time_part:
        try:
            t_obj = datetime.strptime(time_part, "%H:%M")
            return t_obj.strftime("%I:%M %p")
        except Exception:
            try:
                t_obj = datetime.strptime(time_part, "%H:%M:%S")
                return t_obj.strftime("%I:%M %p")
            except Exception:
                return time_part
    return "N/A"

def generate_booking_pdf(booking):
    """
    Generates a highly-stylized, vector-based PDF voucher for the booking
    using a dedicated HTML template and xhtml2pdf.
    """
    import os
    import io
    import base64
    import requests
    import urllib.parse
    import django.utils.timezone as timezone
    from datetime import timedelta
    from django.template.loader import render_to_string
    from django.db.models import Q
    from xhtml2pdf import pisa
    from Holidays.models import CabBooking, VehicleMaster

    # Helper to convert image (file path or remote URL) to base64 Data URI
    def get_image_as_base64_uri(image_url_or_path):
        if not image_url_or_path:
            return ""
        if os.path.exists(image_url_or_path):
            try:
                with open(image_url_or_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    ext = os.path.splitext(image_url_or_path)[1].lower()
                    mime = "image/png"
                    if ext in [".jpg", ".jpeg"]:
                        mime = "image/jpeg"
                    elif ext == ".gif":
                        mime = "image/gif"
                    return f"data:{mime};base64,{encoded}"
            except Exception as e:
                print(f"Error reading local image {image_url_or_path}: {e}")
                return ""
        if image_url_or_path.startswith("http"):
            try:
                resp = requests.get(image_url_or_path, timeout=5)
                if resp.status_code == 200:
                    encoded = base64.b64encode(resp.content).decode("utf-8")
                    content_type = resp.headers.get("content-type", "image/png")
                    return f"data:{content_type};base64,{encoded}"
            except Exception as e:
                print(f"Error downloading remote image {image_url_or_path}: {e}")
        return ""

    # Fetch related bookings created around the same time (within 10 seconds)
    start_time = booking.created_at - timedelta(seconds=10) if booking.created_at else timezone.now() - timedelta(seconds=10)
    end_time = booking.created_at + timedelta(seconds=10) if booking.created_at else timezone.now() + timedelta(seconds=10)
    related_bookings_qs = CabBooking.objects.filter(
        email=booking.email,
        created_at__range=(start_time, end_time)
    ).order_by('id')
    
    related_bookings = list(related_bookings_qs)
    if not related_bookings:
        related_bookings = [booking]

    bookings_contexts = []
    total_amount = 0
    booking_ids = []
    
    for b in related_bookings:
        try:
            travel_date_str = b.pickup_date.strftime('%d %b %Y') if b.pickup_date else "N/A"
        except Exception:
            travel_date_str = str(b.pickup_date) if b.pickup_date else "N/A"
            
        total_amount += b.price if b.price is not None else 0
        b_id = b.booking_id or f"GO-TRN-{str(b.pk).zfill(4)}"
        booking_ids.append(b_id)
        
        formatted_time = format_time_field(b.pickup_time or b.arrival_time)
        
        # Vehicle Photo
        vehicle_photo = "https://goimomi.com/media/vehicles/download_2_YaJg5h3.jpeg"
        vm = None
        try:
            vm = VehicleMaster.objects.filter(
                Q(name__icontains=b.vehicle_name) | 
                Q(brand__name__icontains=b.vehicle_name)
            ).first()
            if not vm and b.vehicle_category:
                vm = VehicleMaster.objects.filter(
                    Q(name__icontains=b.vehicle_category) | 
                    Q(brand__name__icontains=b.vehicle_category)
                ).first()
        except Exception:
            pass
            
        if vm and vm.photo:
            if hasattr(vm.photo, 'path') and os.path.exists(vm.photo.path):
                vehicle_photo = vm.photo.path
            else:
                vehicle_photo = f"https://goimomi.com{vm.photo.url}"

        # Convert vehicle photo to base64 Data URI
        vehicle_photo_uri = get_image_as_base64_uri(vehicle_photo)
            
        # Extract location types (e.g. "Airport" or "CITY") from pickup_location_details
        pickup_type = ""
        drop_type = ""
        if b.pickup_location_details:
            try:
                if "Pickup:" in b.pickup_location_details:
                    pickup_type = b.pickup_location_details.split("Pickup:")[1].split(",")[0].strip()
                if "Drop:" in b.pickup_location_details:
                    drop_type = b.pickup_location_details.split("Drop:")[1].split(".")[0].strip()
            except Exception:
                pass

        if pickup_type:
            pickup_location_formatted = f"{b.from_city} ({pickup_type.title()})"
        elif b.airport_name and b.transfer_type == 'airport':
            pickup_location_formatted = b.airport_name
        else:
            pickup_location_formatted = b.from_city

        if drop_type:
            drop_location_formatted = f"{b.to_city} ({drop_type.title()})"
        else:
            drop_location_formatted = b.to_city

        bookings_contexts.append({
            'booking_id': b_id,
            'travel_date': travel_date_str,
            'pickup_location': pickup_location_formatted,
            'pickup_time': formatted_time,
            'vehicle_category': b.vehicle_category or "Sedan",
            'vehicle_name': b.vehicle_name,
            'vehicle_photo': vehicle_photo_uri,
            'guests': b.guests or 1,
            'luggage_count': b.luggage_count or "0",
            'drop_location': drop_location_formatted,
        })
        
    try:
        total_amount_str = f"{total_amount:,.2f}"
    except Exception:
        total_amount_str = str(total_amount)
        
    customer_name = f"{booking.title} {booking.first_name} {booking.last_name}".strip()
    customer_email = booking.email or "N/A"
    phone = booking.phone or "N/A"
    
    # Construct consolidated QR code text
    qr_text = f"Goimomi Holidays Cab Booking\n"
    qr_text += f"-----------------------------\n"
    for idx, rb in enumerate(related_bookings):
        p_type = ""
        d_type = ""
        if rb.pickup_location_details:
            try:
                if "Pickup:" in rb.pickup_location_details:
                    p_type = rb.pickup_location_details.split("Pickup:")[1].split(",")[0].strip()
                if "Drop:" in rb.pickup_location_details:
                    d_type = rb.pickup_location_details.split("Drop:")[1].split(".")[0].strip()
            except Exception:
                pass
        p_loc = f"{rb.from_city} ({p_type.title()})" if p_type else rb.from_city
        d_loc = f"{rb.to_city} ({d_type.title()})" if d_type else rb.to_city
        b_id = booking_ids[idx]
        
        qr_text += f"ID: {b_id}\n"
        qr_text += f"Vehicle: {rb.vehicle_name} ({rb.vehicle_category or 'Sedan'})\n"
        qr_text += f"Route: {p_loc} to {d_loc}\n\n"
    
    qr_text += f"Guest: {customer_name}\n"
    qr_text += f"Phone: {phone}\n"
    qr_text += f"Status: {booking.status.upper()}"

    # Fetch and encode QR Code
    qr_code_data_uri = ""
    try:
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=138048&data={urllib.parse.quote(qr_text)}"
        qr_code_data_uri = get_image_as_base64_uri(qr_url)
    except Exception as e:
        print(f"Error generating QR code base64 for PDF: {e}")

    # Fetch and encode Logo
    logo_data_uri = get_image_as_base64_uri("https://goimomi.com/logo.png")

    # Render HTML content
    html_content = render_to_string(
        'emails/car_booking_voucher_pdf.html',
        {
            'bookings': bookings_contexts,
            'customer_name': customer_name,
            'customer_email': customer_email,
            'phone': phone,
            'total_amount': total_amount_str,
            'booking_ids': ", ".join(booking_ids),
            'payment_status': booking.status,
            'total_guests': sum([rb.guests or 1 for rb in related_bookings]),
            'qr_code_data_uri': qr_code_data_uri,
            'logo_data_uri': logo_data_uri,
        }
    )

    # Generate PDF from HTML content
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        io.BytesIO(html_content.encode("utf-8")),
        dest=pdf_buffer
    )
    
    if pisa_status.err:
        print(f"xhtml2pdf generation failed with error code: {pisa_status.err}")
    
    return pdf_buffer.getvalue()


def send_booking_voucher(booking):
    """
    Sends the booking voucher HTML email with generated PDF attachment to
    both the customer and the company email.
    Consolidates parallel bookings created by the same user within 10 seconds into a single email.
    """
    import time
    import io
    import requests
    from PIL import Image
    import django.utils.timezone as timezone
    from datetime import timedelta
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings
    from django.template.loader import render_to_string
    from Holidays.models import CabBooking, VehicleMaster
    from django.db.models import Q
    
    # 1. Debounce to let all parallel bookings complete their DB insert
    time.sleep(1.8)
    
    # 2. Get all bookings created by this email around the same time (within 10 seconds)
    start_time = booking.created_at - timedelta(seconds=10) if booking.created_at else timezone.now() - timedelta(seconds=10)
    end_time = booking.created_at + timedelta(seconds=10) if booking.created_at else timezone.now() + timedelta(seconds=10)
    related_bookings_qs = CabBooking.objects.filter(
        email=booking.email,
        created_at__range=(start_time, end_time)
    ).order_by('id')
    
    related_bookings = list(related_bookings_qs)
    if not related_bookings:
        related_bookings = [booking]
        
    # 3. Only send from the last booking request in the batch to avoid duplicate emails
    if booking.id != related_bookings[-1].id:
        print(f"Skipping email for booking {booking.booking_id} as it is part of a batch. Latest is {related_bookings[-1].booking_id}.")
        return True
        
    # 4. Prepare consolidated context
    bookings_contexts = []
    total_amount = 0
    booking_ids = []
    
    for b in related_bookings:
        try:
            travel_date_str = b.pickup_date.strftime('%d %b %Y') if b.pickup_date else "N/A"
        except Exception:
            travel_date_str = str(b.pickup_date) if b.pickup_date else "N/A"
            
        try:
            price_str = f"{b.price:,.2f}"
        except (TypeError, ValueError):
            price_str = str(b.price) if b.price is not None else "0.00"
            
        total_amount += b.price if b.price is not None else 0
        booking_ids.append(b.booking_id)
        
        formatted_time = format_time_field(b.pickup_time or b.arrival_time)
        
        # Vehicle Photo
        vehicle_photo = "https://goimomi.com/media/vehicles/download_2_YaJg5h3.jpeg"
        vm = None
        try:
            vm = VehicleMaster.objects.filter(
                Q(name__icontains=b.vehicle_name) | 
                Q(brand__name__icontains=b.vehicle_name)
            ).first()
            if not vm and b.vehicle_category:
                vm = VehicleMaster.objects.filter(
                    Q(name__icontains=b.vehicle_category) | 
                    Q(brand__name__icontains=b.vehicle_category)
                ).first()
        except Exception:
            pass
        if vm and vm.photo:
            vehicle_photo = f"https://goimomi.com{vm.photo.url}"
            
        # Extract location types (e.g. "Airport" or "CITY") from pickup_location_details
        pickup_type = ""
        drop_type = ""
        if b.pickup_location_details:
            try:
                if "Pickup:" in b.pickup_location_details:
                    pickup_type = b.pickup_location_details.split("Pickup:")[1].split(",")[0].strip()
                if "Drop:" in b.pickup_location_details:
                    drop_type = b.pickup_location_details.split("Drop:")[1].split(".")[0].strip()
            except Exception:
                pass

        if pickup_type:
            pickup_location_formatted = f"{b.from_city} ({pickup_type.title()})"
        elif b.airport_name and b.transfer_type == 'airport':
            pickup_location_formatted = b.airport_name
        else:
            pickup_location_formatted = b.from_city

        if drop_type:
            drop_location_formatted = f"{b.to_city} ({drop_type.title()})"
        else:
            drop_location_formatted = b.to_city

        # Construct detailed QR code text
        qr_text = (
            f"Goimomi Holidays Cab Booking\n"
            f"-----------------------------\n"
            f"Booking ID: {b.booking_id}\n"
            f"Guest: {b.title} {b.first_name} {b.last_name}\n"
            f"Phone: {b.phone or 'N/A'}\n"
            f"Date: {travel_date_str}\n"
            f"Time: {formatted_time}\n"
            f"Vehicle: {b.vehicle_name} ({b.vehicle_category or 'Sedan'})\n"
            f"Pickup: {pickup_location_formatted}\n"
            f"Dropoff: {drop_location_formatted}\n"
            f"Status: {b.status.upper()}"
        )
        import urllib.parse
        qr_data_encoded = urllib.parse.quote(qr_text)

        bookings_contexts.append({
            'booking_id': b.booking_id,
            'customer_name': f"{b.title} {b.first_name} {b.last_name}".strip(),
            'customer_email': b.email or "N/A",
            'phone': b.phone or "N/A",
            'vehicle_type': f"{b.vehicle_name} ({b.vehicle_category})" if b.vehicle_category else b.vehicle_name,
            'vehicle_name': b.vehicle_name,
            'vehicle_category': b.vehicle_category or "Sedan",
            'vehicle_photo': vehicle_photo,
            'pickup_location': pickup_location_formatted,
            'drop_location': drop_location_formatted,
            'travel_date': travel_date_str,
            'pickup_time': formatted_time,
            'total_amount': price_str,
            'payment_status': b.status,
            'guests': b.guests or 1,
            'luggage_count': b.luggage_count or "0",
            'special_requirements': b.special_requirements or "None",
            'driver': b.driver or "Not Assigned Yet",
            'qr_data': qr_data_encoded,
        })
        
    try:
        total_amount_str = f"{total_amount:,.2f}"
    except Exception:
        total_amount_str = str(total_amount)
        
    customer_name = f"{booking.title} {booking.first_name} {booking.last_name}".strip()
    customer_email = booking.email or "N/A"
    phone = booking.phone or "N/A"
    
    # Construct consolidated QR code text for email
    qr_text = f"Goimomi Holidays Cab Booking\n"
    qr_text += f"-----------------------------\n"
    for rb in related_bookings:
        p_type = ""
        d_type = ""
        if rb.pickup_location_details:
            try:
                if "Pickup:" in rb.pickup_location_details:
                    p_type = rb.pickup_location_details.split("Pickup:")[1].split(",")[0].strip()
                if "Drop:" in rb.pickup_location_details:
                    d_type = rb.pickup_location_details.split("Drop:")[1].split(".")[0].strip()
            except Exception:
                pass
        p_loc = f"{rb.from_city} ({p_type.title()})" if p_type else rb.from_city
        d_loc = f"{rb.to_city} ({d_type.title()})" if d_type else rb.to_city
        
        qr_text += f"ID: {rb.booking_id}\n"
        qr_text += f"Vehicle: {rb.vehicle_name} ({rb.vehicle_category or 'Sedan'})\n"
        qr_text += f"Route: {p_loc} to {d_loc}\n\n"
    
    qr_text += f"Guest: {customer_name}\n"
    qr_text += f"Phone: {phone}\n"
    qr_text += f"Status: {booking.status.upper()}"

    import urllib.parse
    email_qr_data = urllib.parse.quote(qr_text)



    # Render HTML content
    html_content = render_to_string(
        'emails/car_booking_voucher.html',
        {
            'bookings': bookings_contexts,
            'customer_name': customer_name,
            'customer_email': customer_email,
            'phone': phone,
            'total_amount': total_amount_str,
            'booking_ids': ", ".join(booking_ids),
            'payment_status': booking.status,
            'total_guests': sum([rb.guests or 1 for rb in related_bookings]),
            'qr_data': email_qr_data,
        }
    )
    
    # Subject line listing all booking IDs
    subject = f"Goimomi Holidays - Booking Confirmation - {', '.join(booking_ids)}"
    
    # Fallback plain text message
    text_content = f"""
Dear {customer_name},

Thank you for choosing Goimomi Holidays. Your booking(s) have been confirmed!

Booking Reference(s): {', '.join(booking_ids)}
Total Fare Amount: INR {total_amount_str}

A professional PDF voucher containing all booking tickets is attached to this email.

For support, contact our 24/7 Travel Desk:
Call: +91 81100 82222
Email: hello@goimomi.com

Thank you,
Goimomi Holidays
"""
    
    # Add company email from settings (default to Reservations@goimomi.com if not defined)
    company_email = getattr(settings, 'COMPANY_EMAIL', 'Reservations@goimomi.com')

    # Compile recipients list
    recipients = []
    if booking.email:
        recipients.append(booking.email)
        
    # Ensure recipients is a list of unique non-empty emails
    recipients = list(set(recipients))
    if not recipients:
        if company_email:
            recipients = [company_email]
            bcc_recipients = []
        else:
            print("Error: No email recipients found for booking.")
            return False
    else:
        bcc_recipients = [company_email] if company_email else []
        
    # Build email message
    sender = getattr(settings, 'CAB_BOOKING_FROM_EMAIL', 'Goimomi Holidays <Reservations@goimomi.com>')
    if not sender:
        sender = 'Goimomi Holidays <Reservations@goimomi.com>'
        
    cc_recipients = ['hello@goimomi.com', 'Reservations@goimomi.com']
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=sender,
        to=recipients,
        cc=cc_recipients,
        bcc=bcc_recipients,
        reply_to=['Reservations@goimomi.com', 'hello@goimomi.com']
    )
    email.attach_alternative(html_content, "text/html")


    
    # Generate Voucher PDF and attach
    try:
        pdf_bytes = generate_booking_pdf(booking)
        pdf_filename = f"Voucher_{'_'.join(booking_ids[:2])}.pdf"
        email.attach(
            filename=pdf_filename,
            content=pdf_bytes,
            mimetype="application/pdf"
        )
    except Exception as e:
        print(f"Error generating or attaching PDF voucher: {e}")

    # Generate Invoice PDF and attach
    try:
        invoice_pdf_bytes = generate_booking_invoice_pdf(booking)
        if invoice_pdf_bytes:
            invoice_filename = f"Invoice_{'_'.join(booking_ids[:2])}.pdf"
            email.attach(
                filename=invoice_filename,
                content=invoice_pdf_bytes,
                mimetype="application/pdf"
            )
    except Exception as e:
        print(f"Error generating or attaching PDF invoice: {e}")

    # Send email
    try:
        email.send(fail_silently=True)
        print(f"Booking confirmation email with Voucher & Invoice sent successfully to {recipients} for bookings {booking_ids}")
        return True
    except Exception as e:
        print(f"Error sending booking confirmation email: {e}")
        return False


def send_enquiry_email(enquiry, enquiry_type):
    """
    Sends an enquiry confirmation email to the customer and a BCC copy to the company.
    """
    # Build a clean subject line
    subject = f"Goimomi Holidays - {enquiry_type} Enquiry Received - #{enquiry.id}"
    
    # Safely get full name
    customer_name = getattr(enquiry, 'full_name', getattr(enquiry, 'name', 'Customer'))
    
    # Safely format date
    travel_date_val = getattr(enquiry, 'travel_date', None)
    try:
        travel_date_str = travel_date_val.strftime('%d %b %Y') if travel_date_val else "N/A"
    except Exception:
        travel_date_str = str(travel_date_val) if travel_date_val else "N/A"

    # Gather all fields into details based on what enquiry model has
    details = []
    
    # Common fields
    if hasattr(enquiry, 'email') and enquiry.email:
        details.append({'label': 'Email Address', 'value': enquiry.email})
    if hasattr(enquiry, 'phone') and enquiry.phone:
        details.append({'label': 'Phone Number', 'value': enquiry.phone})
    if hasattr(enquiry, 'nationality') and enquiry.nationality:
        details.append({'label': 'Nationality', 'value': enquiry.nationality})
        
    # Travel parameters
    if hasattr(enquiry, 'start_city') and enquiry.start_city:
        details.append({'label': 'Starting City', 'value': enquiry.start_city})
    elif hasattr(enquiry, 'from_city') and enquiry.from_city:
        details.append({'label': 'From City', 'value': enquiry.from_city})
        
    if hasattr(enquiry, 'to_city') and enquiry.to_city:
        details.append({'label': 'To City', 'value': enquiry.to_city})
    elif hasattr(enquiry, 'destination') and enquiry.destination:
        details.append({'label': 'Destination', 'value': enquiry.destination})
        
    if travel_date_val:
        details.append({'label': 'Travel Date', 'value': travel_date_str})
        
    # Package specific details
    if hasattr(enquiry, 'package_type') and enquiry.package_type:
        details.append({'label': 'Package Type', 'value': enquiry.package_type})
    if hasattr(enquiry, 'holiday_type') and enquiry.holiday_type:
        details.append({'label': 'Holiday Type', 'value': enquiry.holiday_type})
    if hasattr(enquiry, 'nights') and enquiry.nights:
        details.append({'label': 'Number of Nights', 'value': str(enquiry.nights)})
    if hasattr(enquiry, 'rooms') and enquiry.rooms:
        details.append({'label': 'Rooms Required', 'value': str(enquiry.rooms)})
    if hasattr(enquiry, 'star_rating') and enquiry.star_rating:
        details.append({'label': 'Hotel Star Rating', 'value': enquiry.star_rating})
    if hasattr(enquiry, 'room_type') and enquiry.room_type:
        details.append({'label': 'Room Type Preference', 'value': enquiry.room_type})
    if hasattr(enquiry, 'meal_plan') and enquiry.meal_plan:
        details.append({'label': 'Meal Plan Preference', 'value': enquiry.meal_plan})
    if hasattr(enquiry, 'transfer_details') and enquiry.transfer_details:
        details.append({'label': 'Transfer Details', 'value': enquiry.transfer_details})
        
    # Passengers
    passenger_info = []
    if hasattr(enquiry, 'adults') and enquiry.adults:
        passenger_info.append(f"{enquiry.adults} Adults")
    if hasattr(enquiry, 'children') and enquiry.children:
        passenger_info.append(f"{enquiry.children} Children")
    if hasattr(enquiry, 'infants') and enquiry.infants:
        passenger_info.append(f"{enquiry.infants} Infants")
    if passenger_info:
        details.append({'label': 'Travelers', 'value': ", ".join(passenger_info)})
        
    # Vehicle and Budget
    if hasattr(enquiry, 'vehicle') and enquiry.vehicle:
        details.append({'label': 'Vehicle Preference', 'value': enquiry.vehicle})
    if hasattr(enquiry, 'budget') and enquiry.budget:
        details.append({'label': 'Expected Budget', 'value': enquiry.budget})
        
    # Purpose / Message
    if hasattr(enquiry, 'purpose') and enquiry.purpose:
        details.append({'label': 'Purpose of Travel', 'value': enquiry.purpose})
    if hasattr(enquiry, 'message') and enquiry.message:
        details.append({'label': 'Additional Comments', 'value': enquiry.message})
        
    # Render HTML content
    html_content = render_to_string(
        'emails/enquiry_notification.html',
        {
            'enquiry_type': enquiry_type,
            'customer_name': customer_name,
            'details': details
        }
    )
    
    # Fallback plain text
    text_content = f"Dear {customer_name},\n\nThank you for contacting Goimomi Holidays.\nWe have received your request for: {enquiry_type} Enquiry.\n\nOur travel experts will review your request and get back to you shortly.\n\nRegards,\nGoimomi Holidays"
    
    # Compile recipient list
    company_email = getattr(settings, 'COMPANY_EMAIL', 'Reservations@goimomi.com')
    customer_email = getattr(enquiry, 'email', None)
    
    recipients = []
    if customer_email:
        recipients.append(customer_email)
        
    recipients = list(set(recipients))
    if not recipients:
        if company_email:
            recipients = [company_email]
            bcc_recipients = []
        else:
            print(f"Error: No email recipients found for enquiry {enquiry.id}.")
            return False
    else:
        bcc_recipients = [company_email] if company_email else []
        
    sender = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Reservations@goimomi.com')
    if not sender:
        sender = 'Reservations@goimomi.com'
        
    email_msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=sender,
        to=recipients,
        bcc=bcc_recipients
    )
    email_msg.attach_alternative(html_content, "text/html")
    
    try:
        email_msg.send(fail_silently=False)
        print(f"Enquiry confirmation email sent successfully to {recipients} for enquiry {enquiry.id}")
        return True
    except Exception as e:
        print(f"Error sending enquiry confirmation email: {e}")
        return False





def update_env_file(key: str, value: str) -> bool:
    """
    Updates or appends a key-value pair in the backend .env file.
    """
    import os
    from django.conf import settings
    
    env_path = os.path.join(settings.BASE_DIR, '.env')
    if not os.path.exists(env_path):
        print(f"[update_env_file] .env file not found at {env_path}")
        return False
        
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        key_found = False
        new_lines = []
        for line in lines:
            if line.strip().startswith(f"{key}="):
                new_lines.append(f"{key}={value}\n")
                key_found = True
            else:
                new_lines.append(line)
                
        if not key_found:
            if new_lines and not new_lines[-1].endswith('\n'):
                new_lines[-1] = new_lines[-1] + '\n'
            new_lines.append(f"{key}={value}\n")
            
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
            
        return True
    except Exception as e:
        print(f"[update_env_file] Exception: {e}")
        return False


def get_zoho_crm_access_token() -> str:
    """
    Gets a fresh OAuth2 access token for Zoho CRM using client credentials and refresh token.
    """
    import requests
    url = "https://accounts.zoho.in/oauth/v2/token"
    params = {
        'refresh_token': settings.ZOHO_CRM_REFRESH_TOKEN,
        'client_id': settings.ZOHO_CRM_CLIENT_ID,
        'client_secret': settings.ZOHO_CRM_CLIENT_SECRET,
        'grant_type': 'refresh_token'
    }
    response = requests.post(url, data=params, timeout=10)
    response.raise_for_status()
    return response.json()['access_token']


def upsert_zoho_crm_contact(customer_data: dict) -> dict:
    """
    Creates or updates (upserts) a contact in Zoho CRM based on email address.
    """
    import requests
    try:
        access_token = get_zoho_crm_access_token()
        headers = {
            'Authorization': f'Zoho-oauthtoken {access_token}',
            'Content-Type': 'application/json'
        }
        
        # Prepare payload for upsert
        payload = {
            "data": [
                {
                    "First_Name": customer_data.get('first_name', ''),
                    "Last_Name": customer_data.get('last_name', 'Customer'),  # Last_Name is mandatory in Zoho CRM
                    "Email": customer_data.get('email', ''),
                    "Phone": customer_data.get('phone', ''),
                    "Lead_Source": "Website Payment"
                }
            ],
            "duplicate_check_fields": ["Email"]
        }
        
        url = "https://www.zohoapis.in/crm/v6/Contacts/upsert"
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error upserting Zoho CRM contact: {e}")
        return {}


def create_zoho_crm_lead(lead_data: dict) -> dict:
    """
    Creates a new Lead in Zoho CRM using WebToLead gateway, Zoho CRM API, and optional Webhook.
    Supports WebToLead Form endpoint, REST API upsert, and custom outgoing Webhook.
    """
    import os
    import requests

    full_name = str(lead_data.get('name') or lead_data.get('full_name') or lead_data.get('customer_name') or '').strip()
    first_name = str(lead_data.get('first_name') or '').strip()
    last_name = str(lead_data.get('last_name') or '').strip()

    if full_name and not (first_name and last_name):
        if ' ' in full_name:
            first_name, last_name = full_name.split(' ', 1)
        else:
            first_name = full_name
            last_name = full_name

    if not first_name:
        first_name = last_name or 'Traveler'
    if not last_name:
        last_name = first_name or 'Customer'

    email = str(lead_data.get('email') or '').strip()
    phone = str(lead_data.get('phone') or lead_data.get('mobile') or lead_data.get('whatsapp_number') or '').strip()
    street = str(lead_data.get('street') or lead_data.get('address') or '').strip()
    city = str(lead_data.get('city') or lead_data.get('destination') or '').strip()
    state = str(lead_data.get('state') or '').strip()
    zip_code = str(lead_data.get('zip_code') or lead_data.get('pincode') or '').strip()
    description = str(lead_data.get('description') or '').strip()
    lead_source = str(lead_data.get('lead_source') or 'Website Enquiry').strip()
    company = str(lead_data.get('company') or 'Individual').strip()

    result = {'success': False}

    # 1. Primary: Direct submission via Zoho CRM WebToLead gateway
    try:
        web_to_lead_payload = {
            'xnQsjsdp': 'f98456093f3d9fa012da9b1f392957a6f9a73df303a1745e5005096696b06141',
            'xmIwtLD': 'ca4c8c8f45e08494ccd44bede0849324b1a1f04a724600548b754da18ce709e1f7ad4e6116a66e64846484a5dfaa8824',
            'actionType': 'TGVhZHM=',
            'First Name': first_name,
            'Last Name': last_name,
            'Email': email,
            'Mobile': phone,
            'Phone': phone,
            'Street': street,
            'City': city,
            'State': state,
            'Zip Code': zip_code,
            'Description': description,
            'Lead Source': lead_source,
            'Company': company,
        }
        res = requests.post('https://crm.zoho.in/crm/WebToLeadForm', data=web_to_lead_payload, timeout=12)
        if res.status_code == 200:
            result['web_to_lead'] = 'success'
            result['success'] = True
            print(f"[Zoho CRM] Successfully submitted lead for {first_name} {last_name} ({email}) via WebToLead.")
        else:
            print(f"[Zoho CRM] WebToLead returned status {res.status_code} for {email}.")
    except Exception as wtl_err:
        print(f"[Zoho CRM] Error submitting lead via WebToLead: {wtl_err}")

    # 2. Secondary: Try Zoho CRM v6 REST API upsert if token is available
    try:
        access_token = get_zoho_crm_access_token()
        if access_token:
            headers = {
                'Authorization': f'Zoho-oauthtoken {access_token}',
                'Content-Type': 'application/json'
            }
            api_payload = {
                "data": [
                    {
                        "First_Name": first_name,
                        "Last_Name": last_name,
                        "Email": email,
                        "Phone": phone,
                        "Mobile": phone,
                        "Street": street,
                        "City": city,
                        "State": state,
                        "Zip_Code": zip_code,
                        "Description": description,
                        "Lead_Source": lead_source,
                        "Lead_Status": "Not Contacted",
                        "Company": company,
                    }
                ],
                "duplicate_check_fields": ["Email"] if email else []
            }
            api_res = requests.post("https://www.zohoapis.in/crm/v6/Leads/upsert", json=api_payload, headers=headers, timeout=10)
            if api_res.status_code in (200, 201):
                result['rest_api'] = api_res.json()
                result['success'] = True
                print(f"[Zoho CRM] REST API upsert lead successful for {email}.")
    except Exception:
        # Expected if OAuth token requires admin refresh
        pass

    # 3. Tertiary: Optional External Webhook URL (Zoho Flow, Zapier, Make, etc.)
    webhook_url = (
        getattr(settings, 'ZOHO_CRM_WEBHOOK_URL', '') or
        getattr(settings, 'ZOHO_LEAD_WEBHOOK_URL', '') or
        os.environ.get('ZOHO_CRM_WEBHOOK_URL', '') or
        os.environ.get('ZOHO_LEAD_WEBHOOK_URL', '')
    )
    if webhook_url and str(webhook_url).strip():
        webhook_url = str(webhook_url).strip()
        try:
            webhook_payload = {
                'First_Name': first_name,
                'Last_Name': last_name,
                'Full_Name': full_name or f"{first_name} {last_name}".strip(),
                'Email': email,
                'Phone': phone,
                'Mobile': phone,
                'Street': street,
                'City': city,
                'State': state,
                'Zip_Code': zip_code,
                'Description': description,
                'Lead_Source': lead_source,
                'Company': company,
                'raw_lead_data': lead_data
            }
            wh_res = requests.post(webhook_url, json=webhook_payload, timeout=12)
            if wh_res.status_code in (200, 201, 202, 204):
                result['webhook'] = 'success'
                result['success'] = True
                print(f"[Zoho CRM] Successfully posted lead to webhook {webhook_url}")
            else:
                print(f"[Zoho CRM] Webhook returned status {wh_res.status_code}")
        except Exception as wh_err:
            print(f"[Zoho CRM] Webhook error: {wh_err}")

    # 4. Record audit entry in ZohoWebhookLog
    try:
        from Holidays.models import ZohoWebhookLog
        ZohoWebhookLog.objects.create(
            event_type='lead_submission',
            module='CRM_LEAD',
            payload={
                'name': f"{first_name} {last_name}".strip(),
                'email': email,
                'phone': phone,
                'lead_source': lead_source,
                'city': city,
                'description': description
            },
            status='success' if result.get('success') else 'partial',
            response_message=f"WebToLead={result.get('web_to_lead', 'none')}, REST={bool(result.get('rest_api'))}, Webhook={result.get('webhook', 'none')}"
        )
    except Exception:
        pass

    return result


def _twilio_whatsapp_address(phone_number):
    raw_value = str(phone_number or '').strip()
    if raw_value.startswith('whatsapp:'):
        return raw_value
    digits = ''.join(filter(str.isdigit, raw_value))
    return f"whatsapp:+{digits}" if digits else None


def _send_twilio_whatsapp(phone_number, message):
    import requests

    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    sender = _twilio_whatsapp_address(getattr(settings, 'TWILIO_WHATSAPP_NUMBER', ''))
    recipient = _twilio_whatsapp_address(phone_number)
    if not (account_sid and auth_token and sender and recipient):
        print("Twilio credentials or WhatsApp phone numbers are not configured.")
        return None

    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data={'From': sender, 'To': recipient, 'Body': message},
        auth=(account_sid, auth_token),
        timeout=15,
    )
    response.raise_for_status()
    return response.json().get('sid')


def send_whatsapp_confirmation(phone_number: str, booking_id: str, amount: str):
    """Send a cab payment confirmation through Twilio WhatsApp."""
    try:
        return _send_twilio_whatsapp(
            phone_number,
            f"Hi! Your payment of INR {amount} for Booking ID {booking_id} has been received and confirmed. Thank you for booking with Goimomi Holidays!",
        )
    except Exception as e:
        print(f"Error sending WhatsApp notification: {e}")
        return None


def send_visa_whatsapp_msg(phone_number: str, message: str):
    """Send a custom WhatsApp message for a visa application update."""
    try:
        return _send_twilio_whatsapp(phone_number, message)
    except Exception as e:
        print(f"Error sending visa WhatsApp notification: {e}")
        return None


def generate_booking_invoice_pdf(booking):
    """
    Generates a billing invoice PDF voucher for the booking
    using a dedicated HTML template and xhtml2pdf.
    """
    import os
    import io
    import base64
    import requests
    import urllib.parse
    import django.utils.timezone as timezone
    from datetime import timedelta
    from django.template.loader import render_to_string
    from django.db.models import Q
    from xhtml2pdf import pisa
    from Holidays.models import CabBooking, VehicleMaster

    # Helper to convert image (file path or remote URL) to base64 Data URI
    def get_image_as_base64_uri(image_url_or_path):
        if not image_url_or_path:
            return ""
        if os.path.exists(image_url_or_path):
            try:
                with open(image_url_or_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    ext = os.path.splitext(image_url_or_path)[1].lower()
                    mime = "image/png"
                    if ext in [".jpg", ".jpeg"]:
                        mime = "image/jpeg"
                    elif ext == ".gif":
                        mime = "image/gif"
                    return f"data:{mime};base64,{encoded}"
            except Exception as e:
                print(f"Error reading local image {image_url_or_path}: {e}")
                return ""
        if image_url_or_path.startswith("http"):
            try:
                resp = requests.get(image_url_or_path, timeout=5)
                if resp.status_code == 200:
                    encoded = base64.b64encode(resp.content).decode("utf-8")
                    content_type = resp.headers.get("content-type", "image/png")
                    return f"data:{content_type};base64,{encoded}"
            except Exception as e:
                print(f"Error downloading remote image {image_url_or_path}: {e}")
        return ""

    # Fetch related bookings created around the same time (within 10 seconds)
    start_time = booking.created_at - timedelta(seconds=10) if booking.created_at else timezone.now() - timedelta(seconds=10)
    end_time = booking.created_at + timedelta(seconds=10) if booking.created_at else timezone.now() + timedelta(seconds=10)
    related_bookings_qs = CabBooking.objects.filter(
        email=booking.email,
        created_at__range=(start_time, end_time)
    ).order_by('id')
    
    related_bookings = list(related_bookings_qs)
    if not related_bookings:
        related_bookings = [booking]

    bookings_contexts = []
    total_amount = 0
    booking_ids = []
    
    for b in related_bookings:
        try:
            travel_date_str = b.pickup_date.strftime('%d %b %Y') if b.pickup_date else "N/A"
        except Exception:
            travel_date_str = str(b.pickup_date) if b.pickup_date else "N/A"
            
        total_amount += b.price if b.price is not None else 0
        b_id = b.booking_id or f"GO-TRN-{str(b.pk).zfill(4)}"
        booking_ids.append(b_id)
        
        # Extract location types (e.g. "Airport" or "CITY") from pickup_location_details
        pickup_type = ""
        drop_type = ""
        if b.pickup_location_details:
            try:
                if "Pickup:" in b.pickup_location_details:
                    pickup_type = b.pickup_location_details.split("Pickup:")[1].split(",")[0].strip()
                if "Drop:" in b.pickup_location_details:
                    drop_type = b.pickup_location_details.split("Drop:")[1].split(".")[0].strip()
            except Exception:
                pass

        if pickup_type:
            pickup_location_formatted = f"{b.from_city} ({pickup_type.title()})"
        elif b.airport_name and b.transfer_type == 'airport':
            pickup_location_formatted = b.airport_name
        else:
            pickup_location_formatted = b.from_city

        if drop_type:
            drop_location_formatted = f"{b.to_city} ({drop_type.title()})"
        else:
            drop_location_formatted = b.to_city

        try:
            price_str = f"{b.price:,.2f}"
        except Exception:
            price_str = str(b.price)

        bookings_contexts.append({
            'booking_id': b_id,
            'travel_date': travel_date_str,
            'pickup_location': pickup_location_formatted,
            'drop_location': drop_location_formatted,
            'vehicle_category': b.vehicle_category or "Sedan",
            'vehicle_name': b.vehicle_name,
            'total_amount': price_str,
            'guests': b.guests or 1,
            'luggage_count': b.luggage_count or "0",
        })
        
    try:
        total_amount_str = f"{total_amount:,.2f}"
    except Exception:
        total_amount_str = str(total_amount)
        
    customer_name = f"{booking.title} {booking.first_name} {booking.last_name}".strip()
    customer_email = booking.email or "N/A"
    phone = booking.phone or "N/A"
    
    # Fetch and encode Logo
    logo_data_uri = get_image_as_base64_uri("https://goimomi.com/logo.png")
    
    # Generate dynamic UPI Payment QR code
    payment_qr_data_uri = ""
    try:
        import urllib.parse
        inv_no = booking.invoice_number or f"INV-{booking_ids[0]}"
        upi_uri = f"upi://pay?pa=GOIMOMICOM.ibz1@icici&pn=GOIMOMI.COM&am={total_amount:.2f}&cu=INR&tn={inv_no}"
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=138048&data={urllib.parse.quote(upi_uri)}"
        payment_qr_data_uri = get_image_as_base64_uri(qr_url)
    except Exception as e:
        print(f"Error generating dynamic payment QR code: {e}")
        # Fallback to static QR
        payment_qr_path = os.path.join(os.path.dirname(__file__), "static", "Holidays", "images", "payment_qr.png")
        payment_qr_data_uri = get_image_as_base64_uri(payment_qr_path)
    
    
    try:
        invoice_date_str = booking.created_at.strftime('%d %b %Y') if booking.created_at else timezone.now().strftime('%d %b %Y')
    except Exception:
        invoice_date_str = timezone.now().strftime('%d %b %Y')

    # Render HTML content
    html_content = render_to_string(
        'emails/car_booking_invoice_pdf.html',
        {
            'bookings': bookings_contexts,
            'customer_name': customer_name,
            'customer_email': customer_email,
            'phone': phone,
            'total_amount': total_amount_str,
            'booking_ids': ", ".join(booking_ids),
            'invoice_number': booking.invoice_number or f"INV-{booking_ids[0]}",
            'invoice_date': invoice_date_str,
            'logo_data_uri': logo_data_uri,
            'payment_qr_data_uri': payment_qr_data_uri,
        }
    )

    # Generate PDF from HTML content
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        io.BytesIO(html_content.encode("utf-8")),
        dest=pdf_buffer
    )
    
    if pisa_status.err:
        print(f"xhtml2pdf invoice generation failed with error code: {pisa_status.err}")
    
    return pdf_buffer.getvalue()


def send_booking_invoice(booking):
    """
    Sends the payment invoice HTML email with generated PDF attachment to
    both the customer and the company email.
    Consolidates parallel bookings created by the same user within 10 seconds.
    """
    import time
    import io
    import requests
    import django.utils.timezone as timezone
    from datetime import timedelta
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings
    from django.template.loader import render_to_string
    from Holidays.models import CabBooking

    # 1. Debounce to let all parallel bookings complete their DB insert / status updates
    time.sleep(1.8)
    
    # 2. Get all bookings created by this email around the same time (within 10 seconds)
    start_time = booking.created_at - timedelta(seconds=10) if booking.created_at else timezone.now() - timedelta(seconds=10)
    end_time = booking.created_at + timedelta(seconds=10) if booking.created_at else timezone.now() + timedelta(seconds=10)
    related_bookings_qs = CabBooking.objects.filter(
        email=booking.email,
        created_at__range=(start_time, end_time)
    ).order_by('id')
    
    related_bookings = list(related_bookings_qs)
    if not related_bookings:
        related_bookings = [booking]
        
    # 3. Only send from the last booking request in the batch to avoid duplicate emails
    if booking.id != related_bookings[-1].id:
        print(f"Skipping invoice email for booking {booking.booking_id} as it is part of a batch.")
        return True
        
    # 4. Prepare consolidated context
    bookings_contexts = []
    total_amount = 0
    booking_ids = []
    
    for b in related_bookings:
        try:
            travel_date_str = b.pickup_date.strftime('%d %b %Y') if b.pickup_date else "N/A"
        except Exception:
            travel_date_str = str(b.pickup_date) if b.pickup_date else "N/A"
            
        try:
            price_str = f"{b.price:,.2f}"
        except Exception:
            price_str = str(b.price) if b.price is not None else "0.00"
            
        total_amount += b.price if b.price is not None else 0
        b_id = b.booking_id or f"GO-TRN-{str(b.pk).zfill(4)}"
        booking_ids.append(b_id)
        
        # Extract location types (e.g. "Airport" or "CITY") from pickup_location_details
        pickup_type = ""
        drop_type = ""
        if b.pickup_location_details:
            try:
                if "Pickup:" in b.pickup_location_details:
                    pickup_type = b.pickup_location_details.split("Pickup:")[1].split(",")[0].strip()
                if "Drop:" in b.pickup_location_details:
                    drop_type = b.pickup_location_details.split("Drop:")[1].split(".")[0].strip()
            except Exception:
                pass

        if pickup_type:
            pickup_location_formatted = f"{b.from_city} ({pickup_type.title()})"
        elif b.airport_name and b.transfer_type == 'airport':
            pickup_location_formatted = b.airport_name
        else:
            pickup_location_formatted = b.from_city

        if drop_type:
            drop_location_formatted = f"{b.to_city} ({drop_type.title()})"
        else:
            drop_location_formatted = b.to_city

        bookings_contexts.append({
            'booking_id': b_id,
            'travel_date': travel_date_str,
            'pickup_location': pickup_location_formatted,
            'drop_location': drop_location_formatted,
            'vehicle_category': b.vehicle_category or "Sedan",
            'vehicle_name': b.vehicle_name,
            'total_amount': price_str,
        })
        
    try:
        total_amount_str = f"{total_amount:,.2f}"
    except Exception:
        total_amount_str = str(total_amount)
        
    customer_name = f"{booking.title} {booking.first_name} {booking.last_name}".strip()
    customer_email = booking.email or "N/A"
    phone = booking.phone or "N/A"
    
    try:
        invoice_date_str = booking.created_at.strftime('%d %b %Y') if booking.created_at else timezone.now().strftime('%d %b %Y')
    except Exception:
        invoice_date_str = timezone.now().strftime('%d %b %Y')

    invoice_no = booking.invoice_number or f"INV-{booking_ids[0]}"

    # Render HTML content
    html_content = render_to_string(
        'emails/car_booking_invoice.html',
        {
            'bookings': bookings_contexts,
            'customer_name': customer_name,
            'customer_email': customer_email,
            'phone': phone,
            'total_amount': total_amount_str,
            'booking_ids': ", ".join(booking_ids),
            'invoice_number': invoice_no,
            'invoice_date': invoice_date_str,
        }
    )
    
    subject = f"Goimomi Holidays - Payment Invoice & Receipt - {invoice_no}"
    
    # Fallback plain text message
    text_content = f"""
Dear {customer_name},

Thank you for choosing Goimomi Holidays. We have successfully received your payment.

Invoice Number: {invoice_no}
Invoice Date: {invoice_date_str}
Total Amount Paid: INR {total_amount_str}

A copy of your official PDF Invoice receipt is attached to this email.

For support, contact our 24/7 Travel Desk:
Call: +91 81100 82222
Email: hello@goimomi.com

Thank you,
Goimomi Holidays
"""
    
    # Add company email from settings
    company_email = getattr(settings, 'COMPANY_EMAIL', 'Reservations@goimomi.com')

    # Compile recipients list
    recipients = []
    if booking.email:
        recipients.append(booking.email)
        
    recipients = list(set(recipients))
    if not recipients:
        if company_email:
            recipients = [company_email]
            bcc_recipients = []
        else:
            print("Error: No email recipients found for invoice.")
            return False
    else:
        bcc_recipients = [company_email] if company_email else []
        
    sender = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Reservations@goimomi.com')
    if not sender:
        sender = 'Reservations@goimomi.com'
        
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=sender,
        to=recipients,
        cc=['hello@goimomi.com'],
        bcc=bcc_recipients
    )
    email.attach_alternative(html_content, "text/html")
    
    # Generate Invoice PDF and attach
    try:
        pdf_bytes = generate_booking_invoice_pdf(booking)
        pdf_filename = f"Invoice_{invoice_no}.pdf"
        email.attach(
            filename=pdf_filename,
            content=pdf_bytes,
            mimetype="application/pdf"
        )
    except Exception as e:
        print(f"Error generating or attaching PDF invoice: {e}")
        pass
        
    try:
        email.send()
        print(f"Invoice email sent successfully for booking: {booking.booking_id}")
        return True
    except Exception as e:
        print(f"Failed to send invoice email: {e}")
        return False


def generate_product_order_invoice_pdf(order):
    """
    Generates a high-quality vector-based PDF Invoice for product orders
    using product_order_invoice_pdf.html and xhtml2pdf.
    Matches the exact UI layout of Cab Booking Invoices.
    """
    import os
    import io
    import base64
    import requests
    from django.template.loader import render_to_string
    from django.conf import settings
    import django.utils.timezone as timezone
    from xhtml2pdf import pisa

    if not order:
        return None

    def get_image_as_base64_uri(image_url_or_path):
        if not image_url_or_path:
            return ""
        if os.path.exists(image_url_or_path):
            try:
                with open(image_url_or_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    ext = os.path.splitext(image_url_or_path)[1].lower()
                    mime = "image/png" if ext == ".png" else "image/jpeg"
                    return f"data:{mime};base64,{encoded}"
            except Exception:
                return ""
        if image_url_or_path.startswith("http"):
            try:
                resp = requests.get(image_url_or_path, timeout=5)
                if resp.status_code == 200:
                    encoded = base64.b64encode(resp.content).decode("utf-8")
                    content_type = resp.headers.get("content-type", "image/png")
                    return f"data:{content_type};base64,{encoded}"
            except Exception:
                pass
        return ""

    order_ref = order.order_id or f"GO-ORD-{order.id}"
    inv_no = getattr(order, 'book_invoice_number', '') or order.invoice_number or order_ref
    order_date_str = order.created_at.strftime('%d %b %Y, %I:%M %p') if getattr(order, 'created_at', None) else timezone.now().strftime('%d %b %Y')

    items = []
    if order.cart_items and isinstance(order.cart_items, list):
        for item in order.cart_items:
            price = float(item.get('price', 0))
            qty = int(item.get('quantity', 1))
            items.append({
                'title': item.get('title', 'Product Item'),
                'quantity': qty,
                'price': f"{price:,.2f}",
                'total': f"{(price * qty):,.2f}"
            })
    elif order.product:
        unit_p = float(order.price or getattr(order.product, 'price', 0))
        items.append({
            'title': order.product.title,
            'quantity': order.quantity,
            'price': f"{unit_p:,.2f}",
            'total': f"{float(order.total_amount):,.2f}"
        })
    else:
        unit_p = float(order.price or order.total_amount)
        items.append({
            'title': "Product Order",
            'quantity': order.quantity,
            'price': f"{unit_p:,.2f}",
            'total': f"{float(order.total_amount):,.2f}"
        })

    logo_data_uri = ""
    logo_path = ""
    local_logo_paths = [
        os.path.join(settings.BASE_DIR, 'Holidays', 'static', 'goimomilogo.png'),
        os.path.join(os.path.dirname(settings.BASE_DIR), 'goimomifrontend', 'src', 'assets', 'goimomilogo.png'),
    ]
    for l_path in local_logo_paths:
        if os.path.exists(l_path):
            logo_path = l_path.replace('\\', '/')
            try:
                with open(l_path, "rb") as lf:
                    encoded_logo = base64.b64encode(lf.read()).decode("utf-8")
                    logo_data_uri = f"data:image/png;base64,{encoded_logo}"
                    break
            except Exception:
                pass

    if not logo_data_uri:
        logo_data_uri = get_image_as_base64_uri("https://goimomi.com/logo.png")

    context = {
        'logo_path': logo_path,
        'logo_data_uri': logo_data_uri,
        'customer_name': order.name,
        'order_id': order_ref,
        'order_date': order_date_str,
        'invoice_number': inv_no,
        'logistics_provider': getattr(order, 'logistics_provider', ''),
        'tracking_number': getattr(order, 'tracking_number', ''),
        'total_amount': f"{float(order.total_amount):,.2f}",
        'customer_phone': order.phone,
        'customer_email': order.email or '',
        'delivery_address': order.address,
        'items': items
    }

    html_content = render_to_string('emails/product_order_invoice_pdf.html', context)

    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        io.BytesIO(html_content.encode("utf-8")),
        dest=pdf_buffer
    )

    if pisa_status.err:
        print(f"xhtml2pdf generation failed for product invoice: {pisa_status.err}")

    return pdf_buffer.getvalue()


def generate_product_order_packing_slip_pdf(order):
    """
    Generates a professional vector-based Packing Slip PDF for product shipping
    using product_order_packing_slip_pdf.html and xhtml2pdf.
    Includes Goimomi address & logo, Ship To / Bill To customer address,
    Order #, Order Date & Time, Payment Method, Product items, images, quantity & subtotal.
    """
    import os
    import io
    import base64
    import requests
    from django.template.loader import render_to_string
    from django.conf import settings
    import django.utils.timezone as timezone
    from xhtml2pdf import pisa

    if not order:
        return None

    def get_image_as_base64_uri(image_url_or_path):
        if not image_url_or_path:
            return ""
        if isinstance(image_url_or_path, str) and os.path.exists(image_url_or_path):
            try:
                with open(image_url_or_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    ext = os.path.splitext(image_url_or_path)[1].lower()
                    mime = "image/png" if ext == ".png" else "image/jpeg"
                    return f"data:{mime};base64,{encoded}"
            except Exception:
                return ""
        if hasattr(image_url_or_path, 'path') and os.path.exists(getattr(image_url_or_path, 'path', '')):
            try:
                with open(image_url_or_path.path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    mime = "image/jpeg"
                    return f"data:{mime};base64,{encoded}"
            except Exception:
                return ""
        if isinstance(image_url_or_path, str) and image_url_or_path.startswith("http"):
            try:
                resp = requests.get(image_url_or_path, timeout=5)
                if resp.status_code == 200:
                    encoded = base64.b64encode(resp.content).decode("utf-8")
                    content_type = resp.headers.get("content-type", "image/png")
                    return f"data:{content_type};base64,{encoded}"
            except Exception:
                pass
        return ""

    order_ref = order.order_id or f"GO-ORD-{order.id}"
    order_date_str = order.created_at.strftime('%B %d, %Y %I:%M:%S %p') if getattr(order, 'created_at', None) else timezone.now().strftime('%B %d, %Y %I:%M:%S %p')

    def format_prod_id(raw_id):
        if raw_id is None or raw_id == "":
            return "—"
        str_id = str(raw_id).strip()
        if not str_id or str_id.lower() in ["none", "null", "undefined"]:
            return "—"
        if str_id.startswith("GO-PRO-"):
            return str_id
        digits = ''.join(filter(str.isdigit, str_id))
        if digits:
            return f"GO-PRO-{int(digits):04d}"
        return f"GO-PRO-{str_id.zfill(4)}"

    items = []
    if order.cart_items and isinstance(order.cart_items, list):
        for item in order.cart_items:
            price = float(item.get('price', 0))
            qty = int(item.get('quantity', 1))
            img_uri = ""
            if item.get('image'):
                img_uri = get_image_as_base64_uri(item.get('image'))
            elif item.get('image_url'):
                img_uri = get_image_as_base64_uri(item.get('image_url'))
            
            raw_p = (
                item.get('product_id') or 
                item.get('id') or 
                item.get('product') or 
                item.get('sku')
            )
            p_id = format_prod_id(raw_p)
            items.append({
                'product_id': p_id,
                'id': p_id,
                'title': item.get('title', 'Product Item'),
                'quantity': qty,
                'price': f"{price:,.2f}",
                'total': f"{(price * qty):,.2f}",
                'image_base64': img_uri,
                'variant': item.get('variant', '')
            })
    elif order.product:
        unit_p = float(order.price or getattr(order.product, 'price', 0))
        img_uri = ""
        if getattr(order.product, 'image', None):
            img_uri = get_image_as_base64_uri(order.product.image)
        
        prod_obj = order.product
        raw_p = (
            getattr(prod_obj, 'product_id', '') or 
            getattr(prod_obj, 'id', '') or 
            getattr(order, 'product_id', '') or 
            order.product
        )
        p_id = format_prod_id(raw_p)
        items.append({
            'product_id': p_id,
            'id': p_id,
            'title': getattr(prod_obj, 'title', 'Product Item'),
            'quantity': order.quantity,
            'price': f"{unit_p:,.2f}",
            'total': f"{float(order.total_amount):,.2f}",
            'image_base64': img_uri,
            'variant': ''
        })
    else:
        unit_p = float(order.price or order.total_amount)
        raw_p = getattr(order, 'product_id', '') or getattr(order, 'product', '')
        p_id = format_prod_id(raw_p)
        items.append({
            'product_id': p_id,
            'id': p_id,
            'title': "Product Order",
            'quantity': order.quantity,
            'price': f"{unit_p:,.2f}",
            'total': f"{float(order.total_amount):,.2f}",
            'image_base64': '',
            'variant': ''
        })

    logo_data_uri = ""
    logo_path = ""
    local_logo_paths = [
        os.path.join(settings.BASE_DIR, 'Holidays', 'static', 'goimomilogo.png'),
        os.path.join(os.path.dirname(settings.BASE_DIR), 'goimomifrontend', 'src', 'assets', 'goimomilogo.png'),
    ]
    for l_path in local_logo_paths:
        if os.path.exists(l_path):
            logo_path = l_path.replace('\\', '/')
            try:
                with open(l_path, "rb") as lf:
                    encoded_logo = base64.b64encode(lf.read()).decode("utf-8")
                    logo_data_uri = f"data:image/png;base64,{encoded_logo}"
                    break
            except Exception:
                pass

    if not logo_data_uri:
        logo_data_uri = get_image_as_base64_uri("https://goimomi.com/logo.png")

    delivery_addr = order.address
    if not delivery_addr or len(delivery_addr.strip()) == 0:
        addr_parts = [p for p in [order.address_line1, order.address_line2, order.city, order.state, order.pincode] if p]
        delivery_addr = ", ".join(addr_parts) if addr_parts else "N/A"

    context = {
        'logo_path': logo_path,
        'logo_data_uri': logo_data_uri,
        'customer_name': order.name,
        'order_id': order_ref,
        'order_date': order_date_str,
        'payment_method': 'Online Payment (PAID)' if (order.status or '').lower() in ['confirmed', 'shipped', 'delivered'] else 'Direct Online Payment',
        'customer_phone': order.phone or '',
        'customer_email': order.email or '',
        'delivery_address': delivery_addr,
        'total_amount': f"{float(order.total_amount):,.2f}",
        'items': items
    }

    html_content = render_to_string('emails/product_order_packing_slip_pdf.html', context)

    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        io.BytesIO(html_content.encode("utf-8")),
        dest=pdf_buffer
    )

    if pisa_status.err:
        print(f"xhtml2pdf generation failed for product packing slip: {pisa_status.err}")

    return pdf_buffer.getvalue()



def _attach_thank_you_poster_pdf(msg):
    """
    Attaches Goimomi_Crescent_Thank_You_Order_Poster_.pdf to outgoing product emails.
    """
    try:
        poster_paths = [
            os.path.join(settings.BASE_DIR, 'Goimomi_Crescent_Thank_You_Order_Poster_.pdf'),
            os.path.join(settings.BASE_DIR, 'Holidays', 'Goimomi_Crescent_Thank_You_Order_Poster_.pdf'),
            os.path.join(os.path.dirname(__file__), 'Goimomi_Crescent_Thank_You_Order_Poster_.pdf'),
            os.path.join(os.path.dirname(__file__), '..', 'Goimomi_Crescent_Thank_You_Order_Poster_.pdf'),
        ]
        poster_path = None
        for p in poster_paths:
            if os.path.exists(p):
                poster_path = p
                break

        if poster_path:
            with open(poster_path, 'rb') as f:
                poster_bytes = f.read()
            if poster_bytes:
                msg.attach("Goimomi_Crescent_Thank_You_Order_Poster.pdf", poster_bytes, "application/pdf")
                print("Attached Goimomi_Crescent_Thank_You_Order_Poster.pdf to email.")
        else:
            print("Notice: Goimomi_Crescent_Thank_You_Order_Poster_.pdf path not found.")
    except Exception as err:
        print(f"Notice attaching thank you order poster PDF: {err}")


def send_product_order_email(order):
    """
    Sends a professional product order confirmation email to the customer.
    Sender: support@goimomi.com
    CC: hello@goimomi.com
    Recipient: customer email (or hello@goimomi.com if no email provided)
    """
    try:
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings
        import threading

        subject = f"Order Placed & Confirmed: {order.order_id} - Goimomi Holidays"
        
        items = []
        if order.cart_items:
            for item in order.cart_items:
                title = item.get('title') or item.get('name') or "Product Item"
                qty = int(item.get('quantity', 1))
                price = float(item.get('price', 0))
                items.append({
                    'title': title,
                    'quantity': qty,
                    'price': price,
                    'total': price * qty
                })
        elif order.product:
            items.append({
                'title': order.product.title,
                'quantity': order.quantity,
                'price': float(order.price),
                'total': float(order.total_amount)
            })
        else:
            items.append({
                'title': "Product Order",
                'quantity': order.quantity,
                'price': float(order.price or order.total_amount),
                'total': float(order.total_amount)
            })

        order_date_str = order.created_at.strftime('%d %b %Y, %I:%M %p') if getattr(order, 'created_at', None) else "N/A"

        # Fetch and encode Logo locally or remotely
        logo_data_uri = ""
        local_logo_paths = [
            os.path.join(settings.BASE_DIR, 'Holidays', 'static', 'goimomilogo.png'),
            os.path.join(os.path.dirname(settings.BASE_DIR), 'goimomifrontend', 'src', 'assets', 'goimomilogo.png'),
        ]
        for l_path in local_logo_paths:
            if os.path.exists(l_path):
                try:
                    with open(l_path, "rb") as lf:
                        encoded_logo = base64.b64encode(lf.read()).decode("utf-8")
                        logo_data_uri = f"data:image/png;base64,{encoded_logo}"
                        break
                except Exception as l_err:
                    print(f"Notice reading local logo file {l_path}: {l_err}")

        if not logo_data_uri:
            try:
                from Holidays.utils import get_image_as_base64_uri
                logo_data_uri = get_image_as_base64_uri("https://goimomi.com/logo.png")
            except Exception:
                logo_data_uri = "https://goimomi.com/logo.png"

        order_ref = order.order_id or f"GO-ORD-{order.id}"
        inv_no = order.invoice_number or order_ref
        if not order.invoice_number:
            try:
                order.invoice_number = inv_no
                order.save(update_fields=['invoice_number'])
            except Exception:
                pass

        current_status = str(getattr(order, 'status', '') or 'Confirmed').strip()
        status_key = current_status.lower()

        if status_key == 'pending':
            subject = f"Action Required: Payment Pending for Order #{order_ref} - Goimomi Holidays"
            header_subtitle = "E-Commerce Payment Pending"
            status_badge_text = "PAYMENT PENDING"
            status_badge_class = "status-badge-pending"
            status_badge_style = "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;"
            template_name = 'emails/product_order_payment_pending.html'
            status_message = f"Your product order <strong>#{order_ref}</strong> has been created and is awaiting payment completion."
        elif status_key == 'shipped':
            subject = f"Order Shipped & Dispatched: #{order_ref} - Goimomi Holidays"
            header_subtitle = "E-Commerce Order Dispatch"
            status_badge_text = "ORDER SHIPPED & DISPATCHED"
            status_badge_class = "status-badge-shipped"
            status_badge_style = "background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;"
            template_name = 'emails/product_order_confirmation.html'
            logistics = getattr(order, 'logistics_provider', '') or 'Courier Express'
            tracking = getattr(order, 'tracking_number', '') or 'N/A'
            status_message = f"Great news! Your product order <strong>#{order_ref}</strong> has been packed and shipped via <strong>{logistics}</strong> (Tracking / Waybill No: <strong>{tracking}</strong>)."
        elif status_key == 'delivered':
            subject = f"Order Delivered: #{order_ref} - Goimomi Holidays"
            header_subtitle = "Order Delivery Confirmation"
            status_badge_text = "✅ DELIVERED SUCCESSFULLY"
            status_badge_class = "status-badge-delivered"
            status_badge_style = "background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;"
            template_name = 'emails/product_order_delivered.html'
            status_message = f"We're happy to let you know that your order <strong>#{order_ref}</strong> has been <strong>successfully delivered</strong>! We hope you love your purchase from <strong>Goimomi Holidays</strong>."
        elif status_key == 'cancelled':
            subject = f"Order Cancelled: #{order_ref} - Goimomi Holidays"
            header_subtitle = "Order Cancellation Notice"
            status_badge_text = "❌ ORDER CANCELLED"
            status_badge_class = "status-badge-cancelled"
            status_badge_style = "background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;"
            template_name = 'emails/product_order_cancelled.html'
            status_message = f"We're writing to inform you that your order <strong>#{order_ref}</strong> has been <strong>cancelled</strong>. We're sorry for any inconvenience this may cause."
        else:
            subject = f"Order Placed & Confirmed: {order_ref} - Goimomi Holidays"
            header_subtitle = "E-Commerce Order Confirmation"
            status_badge_text = "ORDER PLACED & CONFIRMED"
            status_badge_class = "status-badge-confirmed"
            status_badge_style = "background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"
            template_name = 'emails/product_order_confirmation.html'
            status_message = f"Thank you for your purchase with <strong>Goimomi Holidays</strong>! We are pleased to confirm that your order has been successfully placed and payment has been processed."

        # Build delivered date from updated_at if available
        delivered_date = ''
        delivered_time = ''
        cancelled_date = ''
        if status_key == 'delivered' and getattr(order, 'updated_at', None):
            delivered_date = order.updated_at.strftime('%d %b %Y')
            delivered_time = order.updated_at.strftime('%I:%M %p')
        elif status_key == 'cancelled' and getattr(order, 'updated_at', None):
            cancelled_date = order.updated_at.strftime('%d %b %Y, %I:%M %p')

        context = {
            'logo_data_uri': logo_data_uri,
            'customer_name': order.name,
            'order_id': order_ref,
            'order_date': order_date_str,
            'invoice_number': inv_no,
            'book_invoice_number': getattr(order, 'book_invoice_number', ''),
            'logistics_provider': getattr(order, 'logistics_provider', ''),
            'tracking_number': getattr(order, 'tracking_number', ''),
            'total_amount': f"{float(order.total_amount):,.2f}",
            'customer_phone': order.phone,
            'customer_email': order.email or '',
            'delivery_address': order.address,
            'items': items,
            'header_subtitle': header_subtitle,
            'status_badge_text': status_badge_text,
            'status_badge_class': status_badge_class,
            'status_badge_style': status_badge_style,
            'status_message': status_message,
            # Delivered-specific
            'delivered_date': delivered_date,
            'delivered_time': delivered_time,
            # Cancelled-specific
            'cancelled_date': cancelled_date,
            'cancellation_reason': getattr(order, 'cancellation_reason', ''),
            'refund_amount': getattr(order, 'refund_amount', ''),
        }

        html_content = render_to_string(template_name, context)

        text_content = (
            f"Dear {order.name},\n\n"
            f"Order Ref: #{order_ref}\n"
            f"Status: {current_status.upper()}\n"
            f"Total Amount: INR {order.total_amount}\n"
            f"Delivery Address: {order.address}\n\n"
            f"For support, contact support@goimomi.com or hello@goimomi.com.\n"
        )

        sender = getattr(settings, 'PRODUCT_ORDER_FROM_EMAIL', 'Goimomi Holidays <support@goimomi.com>')
        recipients = [order.email] if order.email else ['hello@goimomi.com']
        cc_recipients = ['hello@goimomi.com', 'support@goimomi.com']

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=recipients,
            cc=cc_recipients,
            reply_to=['support@goimomi.com', 'hello@goimomi.com']
        )
        msg.attach_alternative(html_content, "text/html")

        # Generate & attach official Invoice PDF (Invoice_<order_id>.pdf)
        try:
            pdf_bytes = generate_product_order_invoice_pdf(order)
            if pdf_bytes:
                inv_filename = f"Invoice_{order_ref}.pdf"
                msg.attach(inv_filename, pdf_bytes, "application/pdf")
                print(f"Attached {inv_filename} to product order email for {order_ref}")
        except Exception as pdf_err:
            print(f"Notice generating PDF invoice attachment: {pdf_err}")

        # Attach Goimomi Crescent Thank You Order Poster PDF
        _attach_thank_you_poster_pdf(msg)

        try:
            msg.send(fail_silently=False)
            print(f"Product order email ({template_name}) dispatched for order {order.order_id} to {recipients} with CC {cc_recipients}")
            return True
        except Exception as mail_e:
            print(f"Email send error for order {order.order_id}: {mail_e}")
            return False
    except Exception as e:
        print(f"Error sending product order email: {e}")
        return False


def send_product_payment_pending_email(order, payment_url=None):
    """
    Sends a dedicated Product Order Payment Pending email to the customer.
    Sender: support@goimomi.com
    CC: hello@goimomi.com, support@goimomi.com
    Recipient: customer email (or hello@goimomi.com)
    """
    try:
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings

        order_ref = getattr(order, 'order_id', None) or f"GO-ORD-{order.id}"
        subject = f"Action Required: Payment Pending for Order #{order_ref} - Goimomi Holidays"
        
        items = []
        if getattr(order, 'cart_items', None) and isinstance(order.cart_items, list):
            for item in order.cart_items:
                title = item.get('title') or item.get('name') or "Product Item"
                qty = int(item.get('quantity', 1))
                price = float(item.get('price', 0))
                items.append({
                    'title': title,
                    'quantity': qty,
                    'price': price,
                    'total': price * qty
                })
        elif getattr(order, 'product', None):
            items.append({
                'title': order.product.title,
                'quantity': order.quantity,
                'price': float(order.price),
                'total': float(order.total_amount)
            })
        else:
            items.append({
                'title': "Product Order",
                'quantity': getattr(order, 'quantity', 1),
                'price': float(getattr(order, 'price', 0) or getattr(order, 'total_amount', 0)),
                'total': float(getattr(order, 'total_amount', 0))
            })

        order_date_str = order.created_at.strftime('%d %b %Y, %I:%M %p') if getattr(order, 'created_at', None) else "N/A"
        inv_no = getattr(order, 'invoice_number', '') or order_ref

        context = {
            'customer_name': getattr(order, 'name', 'Valued Customer'),
            'order_id': order_ref,
            'order_date': order_date_str,
            'invoice_number': inv_no,
            'book_invoice_number': getattr(order, 'book_invoice_number', ''),
            'total_amount': f"{float(getattr(order, 'total_amount', 0)):,.2f}",
            'customer_phone': getattr(order, 'phone', ''),
            'customer_email': getattr(order, 'email', ''),
            'delivery_address': getattr(order, 'address', ''),
            'payment_url': payment_url,
            'items': items
        }

        html_content = render_to_string('emails/product_order_payment_pending.html', context)
        text_content = (
            f"Dear {order.name},\n\n"
            f"Your product order #{order_ref} has been created and is awaiting payment completion.\n"
            f"Total Amount Outstanding: INR {order.total_amount}\n"
            f"Delivery Address: {order.address}\n\n"
            f"For assistance or payment queries, contact support@goimomi.com or hello@goimomi.com.\n"
        )

        sender = getattr(settings, 'PRODUCT_ORDER_FROM_EMAIL', 'Goimomi Holidays <support@goimomi.com>')
        recipients = [order.email] if getattr(order, 'email', None) else ['hello@goimomi.com']
        cc_recipients = ['hello@goimomi.com', 'support@goimomi.com']

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=recipients,
            cc=cc_recipients,
            reply_to=['support@goimomi.com', 'hello@goimomi.com']
        )
        msg.attach_alternative(html_content, "text/html")

        # Attach Invoice PDF
        try:
            pdf_bytes = generate_product_order_invoice_pdf(order)
            if pdf_bytes:
                inv_filename = f"Invoice_{order_ref}.pdf"
                msg.attach(inv_filename, pdf_bytes, "application/pdf")
        except Exception as pdf_err:
            print(f"Notice generating PDF invoice attachment for pending order: {pdf_err}")

        _attach_thank_you_poster_pdf(msg)

        msg.send(fail_silently=False)
        print(f"Payment Pending email dispatched for order {order_ref} to {recipients} with CC {cc_recipients}")
        return True
    except Exception as e:
        print(f"Error sending payment pending email: {e}")
        return False


def send_product_shipped_email(order):
    """
    Auto-sends Shipping Dispatch email to client with logistics provider name,
    ref/tracking number, tracking URL link, and attached bill/receipt copy (if uploaded).
    Sender: Goimomi Holidays <support@goimomi.com>
    CC: hello@goimomi.com, support@goimomi.com
    """
    try:
        if not order:
            return False

        order_ref = order.order_id or f"GO-ORD-{order.id}"
        subject = f"Your Product Has Been Shipped! Order #{order_ref} - Goimomi Holidays"
        logistics_name = getattr(order, 'logistics_provider', '') or "Courier Express"
        tracking_no = getattr(order, 'tracking_number', '') or "N/A"
        book_inv = getattr(order, 'book_invoice_number', '')

        # Lookup tracking URL link from LogisticsProvider model or fallback map
        tracking_link = ""
        try:
            from Holidays.models import LogisticsProvider
            if logistics_name:
                provider_obj = LogisticsProvider.objects.filter(name__iexact=logistics_name.strip()).first()
                if not provider_obj:
                    provider_obj = LogisticsProvider.objects.filter(name__icontains=logistics_name.strip()).first()
                if provider_obj and provider_obj.tracking_link:
                    tracking_link = provider_obj.tracking_link
        except Exception as lp_err:
            print(f"Notice fetching tracking link for {logistics_name}: {lp_err}")

        if not tracking_link and logistics_name:
            ln_lower = logistics_name.strip().lower()
            fallback_links = {
                "professional couriers": "https://www.tpcindia.com/tracking.aspx",
                "st courier": "https://stcourier.com/track/shipment",
                "rathimeena": "https://www.rathimeenaparcel.in/",
                "rathimeena parcel service": "https://www.rathimeenaparcel.in/",
                "dtdc": "https://www.dtdc.in/tracking.asp",
                "delhivery": "https://www.delhivery.com/tracking",
                "blue dart": "https://www.bluedart.com/tracking",
                "bluedart": "https://www.bluedart.com/tracking",
                "india post": "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
                "speed post": "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
                "xpressbees": "https://www.xpressbees.com/track",
                "ecom express": "https://ecomexpress.in/tracking/",
                "shadowfax": "https://www.shadowfax.in/track",
                "dhl": "https://www.dhl.com/in-en/home/tracking.html",
                "fedex": "https://www.fedex.com/en-in/tracking.html",
                "ups": "https://www.ups.com/track"
            }
            for k, v in fallback_links.items():
                if k in ln_lower:
                    tracking_link = v
                    break

        # Items list
        items = []
        if order.cart_items and isinstance(order.cart_items, list):
            for item in order.cart_items:
                price = float(item.get('price', 0))
                qty = int(item.get('quantity', 1))
                items.append({
                    'title': item.get('title', 'Product Item'),
                    'quantity': qty,
                    'total': price * qty
                })
        elif order.product:
            items.append({
                'title': order.product.title,
                'quantity': order.quantity,
                'total': float(order.total_amount)
            })
        else:
            items.append({
                'title': "Product Order",
                'quantity': order.quantity,
                'total': float(order.total_amount)
            })

        has_bill_copy = bool(order.bill_copy)

        context = {
            'customer_name': order.name,
            'order_id': order_ref,
            'book_invoice_number': book_inv,
            'logistics_provider': logistics_name,
            'tracking_number': tracking_no,
            'tracking_link': tracking_link,
            'customer_phone': order.phone,
            'customer_email': order.email or '',
            'delivery_address': order.address,
            'items': items,
            'has_bill_copy': has_bill_copy
        }

        html_content = render_to_string('emails/product_order_shipped.html', context)
        text_content = (
            f"Dear {order.name},\n\n"
            f"Your Product order #{order_ref} has been shipped via {logistics_name}!\n"
            f"Reference / Tracking Number: {tracking_no}\n"
            f"Tracking Link: {tracking_link or 'N/A'}\n\n"
            f"Thank you for shopping with Goimomi Holidays!\n"
        )

        sender = getattr(settings, 'PRODUCT_ORDER_FROM_EMAIL', 'Goimomi Holidays <support@goimomi.com>')
        customer_email = str(order.email or '').strip()
        recipients = [customer_email] if customer_email else ['hello@goimomi.com']
        cc_recipients = [c for c in ['hello@goimomi.com', 'support@goimomi.com'] if c.lower() not in [r.lower() for r in recipients]]

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=recipients,
            cc=cc_recipients,
            reply_to=['support@goimomi.com', 'hello@goimomi.com']
        )
        msg.attach_alternative(html_content, "text/html")

        # Generate & attach official Invoice PDF
        try:
            pdf_bytes = generate_product_order_invoice_pdf(order)
            if pdf_bytes:
                inv_filename = f"Invoice_{order_ref}.pdf"
                msg.attach(inv_filename, pdf_bytes, "application/pdf")
                print(f"Attached {inv_filename} to shipped email for {order_ref}")
        except Exception as pdf_err:
            print(f"Notice generating PDF invoice attachment for shipped email: {pdf_err}")

        # Attach bill copy file if uploaded
        if order.bill_copy:
            try:
                fname = os.path.basename(order.bill_copy.name)
                ext = os.path.splitext(fname)[1].lower() if fname else '.pdf'
                mime_type = 'application/pdf' if ext == '.pdf' else f'image/{ext.replace(".", "") or "png"}'
                order.bill_copy.open('rb')
                content = order.bill_copy.read()
                order.bill_copy.close()
                if content:
                    msg.attach(f"Shipping_Receipt_{order_ref}{ext}", content, mime_type)
            except Exception as file_e:
                print(f"Notice attaching bill copy file to email: {file_e}")

        # Attach Goimomi Crescent Thank You Order Poster PDF
        _attach_thank_you_poster_pdf(msg)

        try:
            msg.send(fail_silently=False)
            print(f"Product shipped email dispatched for order {order_ref} to {recipients} with CC {cc_recipients}")
            return True
        except Exception as mail_e:
            print(f"Email send error for shipped order {order_ref}: {mail_e}")
            return False
    except Exception as e:
        print(f"Error sending product shipped email: {e}")
        return False


def send_product_delivered_email(order):
    """
    Sends a dedicated Product Order Delivered email to the customer using the
    product_order_delivered.html template.
    Sender: Goimomi Holidays <support@goimomi.com>
    CC: hello@goimomi.com, support@goimomi.com
    """
    try:
        if not order:
            return False

        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings

        order_ref = order.order_id or f"GO-ORD-{order.id}"
        subject = f"Order Delivered Successfully! #{order_ref} - Goimomi Holidays"

        # Items list
        items = []
        if order.cart_items and isinstance(order.cart_items, list):
            for item in order.cart_items:
                price = float(item.get('price', 0))
                qty = int(item.get('quantity', 1))
                items.append({
                    'title': item.get('title') or item.get('name') or 'Product Item',
                    'quantity': qty,
                    'price': price,
                    'total': price * qty
                })
        elif order.product:
            items.append({
                'title': order.product.title,
                'quantity': order.quantity,
                'price': float(order.price),
                'total': float(order.total_amount)
            })
        else:
            items.append({
                'title': "Product Order",
                'quantity': order.quantity,
                'price': float(order.price or order.total_amount),
                'total': float(order.total_amount)
            })

        order_date_str = order.created_at.strftime('%d %b %Y, %I:%M %p') if getattr(order, 'created_at', None) else "N/A"
        inv_no = getattr(order, 'invoice_number', '') or order_ref

        # Delivered date/time from updated_at
        delivered_date = ''
        delivered_time = ''
        if getattr(order, 'updated_at', None):
            delivered_date = order.updated_at.strftime('%d %b %Y')
            delivered_time = order.updated_at.strftime('%I:%M %p')

        context = {
            'customer_name': order.name,
            'order_id': order_ref,
            'order_date': order_date_str,
            'invoice_number': inv_no,
            'book_invoice_number': getattr(order, 'book_invoice_number', ''),
            'logistics_provider': getattr(order, 'logistics_provider', ''),
            'tracking_number': getattr(order, 'tracking_number', ''),
            'total_amount': f"{float(order.total_amount):,.2f}",
            'customer_phone': order.phone,
            'customer_email': order.email or '',
            'delivery_address': order.address,
            'items': items,
            'delivered_date': delivered_date,
            'delivered_time': delivered_time,
        }

        html_content = render_to_string('emails/product_order_delivered.html', context)
        text_content = (
            f"Dear {order.name},\n\n"
            f"Great news! Your order #{order_ref} has been delivered successfully!\n"
            f"Delivered on: {delivered_date} at {delivered_time}\n"
            f"Total Amount: INR {order.total_amount}\n\n"
            f"Thank you for shopping with Goimomi Holidays!\n"
        )

        sender = getattr(settings, 'PRODUCT_ORDER_FROM_EMAIL', 'Goimomi Holidays <support@goimomi.com>')
        customer_email = str(order.email or '').strip()
        recipients = [customer_email] if customer_email else ['hello@goimomi.com']
        cc_recipients = [c for c in ['hello@goimomi.com', 'support@goimomi.com'] if c.lower() not in [r.lower() for r in recipients]]

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=recipients,
            cc=cc_recipients,
            reply_to=['support@goimomi.com', 'hello@goimomi.com']
        )
        msg.attach_alternative(html_content, "text/html")

        # Generate & attach official Invoice PDF
        try:
            pdf_bytes = generate_product_order_invoice_pdf(order)
            if pdf_bytes:
                inv_filename = f"Invoice_{order_ref}.pdf"
                msg.attach(inv_filename, pdf_bytes, "application/pdf")
                print(f"Attached {inv_filename} to delivered email for {order_ref}")
        except Exception as pdf_err:
            print(f"Notice generating PDF invoice attachment for delivered email: {pdf_err}")

        # Attach Goimomi Crescent Thank You Order Poster PDF
        _attach_thank_you_poster_pdf(msg)

        try:
            msg.send(fail_silently=False)
            print(f"Product delivered email dispatched for order {order_ref} to {recipients} with CC {cc_recipients}")
            return True
        except Exception as mail_e:
            print(f"Email send error for delivered order {order_ref}: {mail_e}")
            return False
    except Exception as e:
        print(f"Error sending product delivered email: {e}")
        return False


def send_product_cancelled_email(order):
    """
    Sends a dedicated Product Order Cancelled email to the customer using the
    product_order_cancelled.html template.
    Sender: Goimomi Holidays <support@goimomi.com>
    CC: hello@goimomi.com, support@goimomi.com
    """
    try:
        if not order:
            return False

        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings

        order_ref = order.order_id or f"GO-ORD-{order.id}"
        subject = f"Order Cancelled: #{order_ref} - Goimomi Holidays"

        # Items list
        items = []
        if order.cart_items and isinstance(order.cart_items, list):
            for item in order.cart_items:
                price = float(item.get('price', 0))
                qty = int(item.get('quantity', 1))
                items.append({
                    'title': item.get('title') or item.get('name') or 'Product Item',
                    'quantity': qty,
                    'price': price,
                    'total': price * qty
                })
        elif order.product:
            items.append({
                'title': order.product.title,
                'quantity': order.quantity,
                'price': float(order.price),
                'total': float(order.total_amount)
            })
        else:
            items.append({
                'title': "Product Order",
                'quantity': order.quantity,
                'price': float(order.price or order.total_amount),
                'total': float(order.total_amount)
            })

        order_date_str = order.created_at.strftime('%d %b %Y, %I:%M %p') if getattr(order, 'created_at', None) else "N/A"
        inv_no = getattr(order, 'invoice_number', '') or order_ref

        # Cancelled date from updated_at
        cancelled_date = ''
        if getattr(order, 'updated_at', None):
            cancelled_date = order.updated_at.strftime('%d %b %Y, %I:%M %p')

        context = {
            'customer_name': order.name,
            'order_id': order_ref,
            'order_date': order_date_str,
            'invoice_number': inv_no,
            'book_invoice_number': getattr(order, 'book_invoice_number', ''),
            'total_amount': f"{float(order.total_amount):,.2f}",
            'customer_phone': order.phone,
            'customer_email': order.email or '',
            'delivery_address': order.address,
            'items': items,
            'cancelled_date': cancelled_date,
            'cancellation_reason': getattr(order, 'cancellation_reason', ''),
            'refund_amount': getattr(order, 'refund_amount', ''),
            'logistics_provider': getattr(order, 'logistics_provider', ''),
            'tracking_number': getattr(order, 'tracking_number', ''),
        }

        html_content = render_to_string('emails/product_order_cancelled.html', context)
        text_content = (
            f"Dear {order.name},\n\n"
            f"We regret to inform you that your order #{order_ref} has been cancelled.\n"
            f"Cancelled on: {cancelled_date}\n"
            f"Total Amount: INR {order.total_amount}\n\n"
            f"If you have any questions, contact support@goimomi.com or hello@goimomi.com.\n"
        )

        sender = getattr(settings, 'PRODUCT_ORDER_FROM_EMAIL', 'Goimomi Holidays <support@goimomi.com>')
        customer_email = str(order.email or '').strip()
        recipients = [customer_email] if customer_email else ['hello@goimomi.com']
        cc_recipients = [c for c in ['hello@goimomi.com', 'support@goimomi.com'] if c.lower() not in [r.lower() for r in recipients]]

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=recipients,
            cc=cc_recipients,
            reply_to=['support@goimomi.com', 'hello@goimomi.com']
        )
        msg.attach_alternative(html_content, "text/html")

        # Attach Goimomi Crescent Thank You Order Poster PDF
        _attach_thank_you_poster_pdf(msg)

        try:
            msg.send(fail_silently=False)
            print(f"Product cancelled email dispatched for order {order_ref} to {recipients} with CC {cc_recipients}")
            return True
        except Exception as mail_e:
            print(f"Email send error for cancelled order {order_ref}: {mail_e}")
            return False
    except Exception as e:
        print(f"Error sending product cancelled email: {e}")
        return False
