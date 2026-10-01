from django.core.management.base import BaseCommand
from Holidays.models import Visa, Country

class Command(BaseCommand):
    help = 'Seed popular visas into the database'

    def handle(self, *args, **options):
        # Reset all non-popular visas first
        Visa.objects.filter(country__in=["Venezuela", "Yemen", "Zambia", "Zimbabwe"]).update(is_popular=False)

        popular_visas = [
            {
                "country": "United Arab Emirates",
                "title": "Dubai Tourist Visa",
                "entry_type": "Single-Entry Visa",
                "validity": "60 Days",
                "duration": "30 Days",
                "processing_time": "24-48 Hours",
                "cost_price": 7000,
                "service_charge": 1500,
                "documents_required": "Passport Bio Page, Passport Photo, Confirmed Ticket",
                "photography_required": "Color photo on white background",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": True,
            },
            {
                "country": "Saudi Arabia",
                "title": "Saudi Arabia Tourist Visa",
                "entry_type": "Multiple-Entry e-Visa",
                "validity": "1 Year",
                "duration": "90 Days",
                "processing_time": "1-2 Business Days",
                "cost_price": 5000,
                "service_charge": 1500,
                "documents_required": "Passport copy, Photo",
                "photography_required": "White background passport photo",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": True,
            },
            {
                "country": "Azerbaijan",
                "title": "Azerbaijan Tourist e-Visa",
                "entry_type": "Single-Entry e-Visa",
                "validity": "90 Days",
                "duration": "30 Days",
                "processing_time": "3 Business Days",
                "cost_price": 3200,
                "service_charge": 1300,
                "documents_required": "Passport copy",
                "photography_required": "Standard passport photo",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": True,
            },
            {
                "country": "Thailand",
                "title": "Thailand Tourist Visa",
                "entry_type": "Single-Entry Visa",
                "validity": "90 Days",
                "duration": "60 Days",
                "processing_time": "3-5 Business Days",
                "cost_price": 2200,
                "service_charge": 1000,
                "documents_required": "Passport copy, Bank Statement, Photo, Flight Tickets",
                "photography_required": "3.5cm x 4.5cm white background photo",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": True,
            },
            {
                "country": "Singapore",
                "title": "Singapore Tourist Visa",
                "entry_type": "Multiple-Entry Visa",
                "validity": "Up to 2 Years",
                "duration": "30 Days",
                "processing_time": "3-4 Business Days",
                "cost_price": 1800,
                "service_charge": 1000,
                "documents_required": "Passport copy, Photo, Form 14A, Bank Statement, Cover Letter",
                "photography_required": "Matt finish white background photo 35mm x 45mm",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": True,
            },
            {
                "country": "Vietnam",
                "title": "Vietnam E-Visa",
                "entry_type": "Single-Entry e-Visa",
                "validity": "30 Days",
                "duration": "30 Days",
                "processing_time": "3 Business Days",
                "cost_price": 2500,
                "service_charge": 1000,
                "documents_required": "Passport Bio Page, Passport Photo",
                "photography_required": "Digital photo on white background",
                "visa_type": "✈️ Tourist Visa",
                "is_active": True,
                "is_popular": True,
            },
        ]

        for item in popular_visas:
            Country.objects.get_or_create(
                name=item["country"],
                defaults={"code": item["country"][:3].upper()}
            )

            visa_obj, created = Visa.objects.update_or_create(
                country=item["country"],
                title=item["title"],
                defaults=item
            )
            self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} Popular Visa for {item['country']} (#{visa_obj.id})"))

        self.stdout.write(self.style.SUCCESS("Finished seeding popular visas successfully!"))
