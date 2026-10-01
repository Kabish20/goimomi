from django.core.management.base import BaseCommand
from Holidays.models import Visa, Country

class Command(BaseCommand):
    help = 'Seed Venezuela, Yemen, Zambia, and Zimbabwe visas into the database'

    def handle(self, *args, **options):
        data = [
            {
                "country": "Venezuela",
                "title": "Venezuela Tourist Visa (e-Visa)",
                "entry_type": "Electronic Visa (e-Visa)",
                "validity": "90 Days",
                "duration": "30 Days",
                "processing_time": "5-7 Business Days",
                "cost_price": 4500,
                "service_charge": 1500,
                "documents_required": "Original Passport with 6 months validity, 2 Passport size photos with white background, Confirmed return flight ticket, Hotel booking voucher, Bank statement of last 6 months",
                "photography_required": "Color photo on white background, Size 35mm x 45mm, 80% face view",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": False,
            },
            {
                "country": "Yemen",
                "title": "Yemen Tourist Visa",
                "entry_type": "Single-Entry Visa",
                "validity": "60 Days",
                "duration": "30 Days",
                "processing_time": "7-10 Business Days",
                "cost_price": 6000,
                "service_charge": 2000,
                "documents_required": "Passport with at least 6 months validity, 2 Passport size photos, Travel sponsor letter or approved tour invitation, Bank statement",
                "photography_required": "Recent passport photo with white background",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": False,
            },
            {
                "country": "Zambia",
                "title": "Zambia Tourist e-Visa",
                "entry_type": "Electronic Visa (e-Visa)",
                "validity": "90 Days",
                "duration": "30 Days",
                "processing_time": "3-5 Business Days",
                "cost_price": 3500,
                "service_charge": 1200,
                "documents_required": "Scan of Passport bio page (6 months validity), Passport photo, Flight itinerary, Cover letter addressed to Director General of Immigration",
                "photography_required": "Digital passport photo, clear background, JPG format",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": False,
            },
            {
                "country": "Zimbabwe",
                "title": "Zimbabwe Tourist e-Visa",
                "entry_type": "Electronic Visa (e-Visa)",
                "validity": "90 Days",
                "duration": "30 Days",
                "processing_time": "3-5 Business Days",
                "cost_price": 3800,
                "service_charge": 1200,
                "documents_required": "Passport copy with 6 months validity, Passport photo, Hotel reservation or host invitation letter, Residence proof",
                "photography_required": "Clear passport format photo, white background",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": False,
            },
        ]

        for item in data:
            # Ensure Country master entry exists
            Country.objects.get_or_create(
                name=item["country"],
                defaults={"code": item["country"][:3].upper()}
            )

            visa_obj, created = Visa.objects.update_or_create(
                country=item["country"],
                title=item["title"],
                defaults=item
            )
            self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} Visa for {item['country']} (#{visa_obj.id})"))

        self.stdout.write(self.style.SUCCESS("Finished seeding Venezuela, Yemen, Zambia, and Zimbabwe visas successfully!"))
