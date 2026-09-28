export const rupees = value => `₹${value.toLocaleString('en-IN')}`;
export const trip = {
  name: 'Thailand Special Package – Pattaya & Bangkok',
  duration: '3 nights / 4 days',
  image: '/images/thailand/pattaya-bangkok.png',
  imageAlt: 'Thailand destination montage of a tropical beach, speedboat, Bangkok skyline and Thai temple architecture',
};
export const rates = [
  { adults: 2, price: 13499 }, { adults: 4, price: 11399 },
  { adults: 6, price: 10599 }, { adults: 8, price: 9999 },
  { adults: 10, price: 9499 },
];
export const days = [
  { title: 'Arrival Bangkok → Pattaya', timing: 'Private airport transfer', description: 'Upon arrival at Suvarnabhumi International Airport, Bangkok, meet our representative/driver and proceed to Pattaya by private vehicle. Check in at Sunday JA Plus Hotel – 4★, Superior Room. The remaining time is free for leisure and relaxation.', highlights: ['Explore Pattaya on your own or enjoy optional activities at additional cost.'], note: 'Overnight stay: Pattaya' },
  { title: 'Coral Island Tour with Indian Lunch', timing: 'Shared tour (SIC basis)', description: 'After breakfast, transfer to the pier and enjoy a speedboat ride to Coral Island, one of Pattaya’s popular beach destinations. Enjoy the beautiful beach and free time on the island.', highlights: ['Optional parasailing, jet skiing and banana boat rides are at your own expense.', 'Indian Buffet Lunch after the island tour.', 'Return to the hotel; evening free for leisure and personal activities.'], note: 'Meals: Breakfast + Indian Buffet Lunch · Overnight stay: Pattaya' },
  { title: 'Pattaya → Bangkok + City Tour', timing: 'Private transfer & enroute sightseeing', description: 'After breakfast, check out and proceed to Bangkok by private transfer with included city sightseeing along the way. After sightseeing, check in at Platinum Suite Bangkok – 3★, Superior Room. The evening is free for leisure, shopping or personal activities.', highlights: ['Wat Uthai Tharam: Buddhist temple with traditional Thai architecture and a peaceful atmosphere.', 'Wat Thepleela: a local Buddhist temple showcasing Thai culture and religious traditions.', 'Gems Gallery: discover a wide collection of gemstones and jewellery.'], note: 'Meals: Breakfast · Overnight stay: Bangkok' },
  { title: 'Bangkok → Departure', timing: 'Private airport transfer', description: 'Enjoy breakfast and check out as per standard hotel check-out timing. At the scheduled time, our private vehicle will transfer you to Suvarnabhumi International Airport for your onward flight. Return home with wonderful memories of your Pattaya & Bangkok holiday.', highlights: [], note: 'Meals: Breakfast' },
];
export const inclusions = [
  '2 nights at Sunday JA Plus Hotel 4★, Pattaya – Superior Room',
  '1 night at Platinum Suite Bangkok 3★ – Superior Room',
  'Daily breakfast at the hotels',
  'Thailand Insurance during included local tours within the applicable boundary',
  'Coral Island Tour by speedboat on SIC (shared) basis',
  'Indian Buffet Lunch during Coral Island Tour',
  'Pattaya to Bangkok enroute sightseeing: Wat Uthai Tharam, Wat Thepleela and Gems Gallery',
  'Private transfer: Suvarnabhumi Airport → Pattaya Hotel',
  'Private transfer: Pattaya Hotel → Bangkok Hotel',
  'Private transfer: Bangkok Hotel → Suvarnabhumi Airport',
  'Luggage allowance during transfers: 1 medium suitcase + 1 shoulder bag per person',
];
export const exclusions = ['International / domestic flight tickets', 'Thailand visa charges', 'Lunch and dinner except the specifically included Coral Island lunch', 'Optional tours and water sports', 'Personal expenses', 'Tips and gratuities', 'Early check-in / late check-out charges', 'Anything not specifically mentioned under Package Inclusions'];
