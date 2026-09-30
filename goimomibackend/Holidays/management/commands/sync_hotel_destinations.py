import json
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from Holidays import hotel_supplier
from Holidays.tripjack import TripJackError


class Command(BaseCommand):
    help = 'Refresh the local TripJack hotel city catalogue. Requires hotel API access.'

    def handle(self, *args, **options):
        rows, seen, cursor = {}, set(), None
        try:
            while True:
                data = hotel_supplier.call('cities', {'limit': 2000, **({'cursor': cursor} if cursor else {})})
                for row in data.get('hotelCityRegionIds', []):
                    rows[str(row['cityRegionId'])] = row
                cursor = data.get('nextCursor')
                if not cursor:
                    break
                if cursor in seen:
                    raise CommandError('Supplier repeated a cursor; existing catalogue retained.')
                seen.add(cursor)
        except TripJackError as exc:
            raise CommandError(str(exc)) from None
        if not rows:
            raise CommandError('Supplier returned no destinations; existing catalogue retained.')
        target = Path(settings.BASE_DIR) / 'hotel_destinations.json'
        temporary = target.with_suffix('.tmp')
        temporary.write_text(json.dumps(list(rows.values()), ensure_ascii=False), encoding='utf-8')
        temporary.replace(target)
        self.stdout.write(self.style.SUCCESS(f'Synced {len(rows)} hotel destinations.'))
