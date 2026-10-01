from django.core.management.base import BaseCommand
from Holidays.models import LogisticsProvider

class Command(BaseCommand):
    help = 'Seed logistics providers into the database'

    def handle(self, *args, **options):
        providers = [
            ('Professional Couriers', 'https://www.tpcindia.com/tracking.aspx'),
            ('ST Courier', 'https://stcourier.com/track/shipment'),
            ('Rathimeena Parcel Service', 'https://www.rathimeenaparcel.in/'),
            ('DTDC', 'https://www.dtdc.in/tracking.asp'),
            ('Delhivery', 'https://www.delhivery.com/tracking'),
            ('Blue Dart', 'https://www.bluedart.com/tracking'),
            ('India Post (Speed Post/Registered Post)', 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx'),
            ('XpressBees', 'https://www.xpressbees.com/track'),
            ('Ecom Express', 'https://ecomexpress.in/tracking/'),
            ('Shadowfax', 'https://www.shadowfax.in/track'),
            ('DHL', 'https://www.dhl.com/in-en/home/tracking.html'),
            ('FedEx', 'https://www.fedex.com/en-in/tracking.html'),
            ('UPS', 'https://www.ups.com/track')
        ]

        for name, link in providers:
            obj, created = LogisticsProvider.objects.update_or_create(
                name=name,
                defaults={'tracking_link': link, 'is_active': True}
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f"{status}: {name} -> {link}"))

        self.stdout.write(self.style.SUCCESS(f"Seeding complete! Total providers in DB: {LogisticsProvider.objects.count()}"))
