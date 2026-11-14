import { BusinessProfile, CurrencyConfig, SupportedLanguage } from '../types';
import cafeLogoImg from '../assets/images/business_cafe_logo_1794551809892.jpg';
import cafeCoverImg from '../assets/images/business_cafe_cover_1794551809708.jpg';

export const DEFAULT_BUSINESS_LOGO = cafeLogoImg;
export const DEFAULT_BUSINESS_COVER = cafeCoverImg;

export const INITIAL_BUSINESSES: BusinessProfile[] = [
  {
    id: 'biz-1',
    name: 'The Roasted Bean Espresso Bar',
    slug: 'roasted-bean-cafe',
    category: 'Artisanal Cafe & Bakery',
    tagline: 'Specialty micro-roasted coffee, fresh sourdough pastries & cozy vibes',
    address: '442 Valencia Street, Mission District',
    city: 'San Francisco, CA',
    country: 'United States',
    phone: '+1 (415) 555-0192',
    website: 'https://theroastedbean.example.com',
    googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    logoUrl: cafeLogoImg,
    coverUrl: cafeCoverImg,
    rating: 4.9,
    reviewCount: 384,
    primaryColor: '#0f766e',
    customTags: [
      'Amazing Oat Milk Latte',
      'Fresh Sourdough Croissants',
      'Warm & Welcoming Baristas',
      'Cozy Working Vibe',
      'Super Fast WiFi',
      'Gluten-Free Treats',
      'Dog-Friendly Patio',
      'Aesthetic Interior',
    ],
    staffMentions: ['Alex (Head Barista)', 'Sarah', 'Mateo'],
    aiReviewPromptGuide: 'Emphasize the smooth espresso roast and warm morning atmosphere.',
    thankYouTemplates: {
      fiveStar:
        'Thank you so much for the {rating}-star review, {customerName}! Your kind words made our baristas smile at {businessName} in {city}. Hope to pour your next latte soon!',
      fourStar:
        'Thanks for visiting {businessName} and leaving a {rating}-star rating, {customerName}! We appreciate your support in {city} and hope your next cup earns all 5 stars.',
      lowStar:
        'Thank you for letting us know, {customerName}. At {businessName} in {city}, a {rating}-star experience is not what we aim for—our cafe manager is reviewing your note now.',
    },
  },
  {
    id: 'biz-2',
    name: 'Apex Modern Dental & Orthodontics',
    slug: 'apex-dental',
    category: 'Dental Clinic & Cosmetic Care',
    tagline: 'Gentle, pain-free dental care with state-of-the-art 3D imaging',
    address: '880 Ocean Avenue, Suite 300',
    city: 'Santa Monica, CA',
    country: 'United States',
    phone: '+1 (310) 555-8921',
    website: 'https://apexdental.example.com',
    googlePlaceId: 'ChIJX9U9LdeuEmsRUnoyG83frZ9',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJX9U9LdeuEmsRUnoyG83frZ9',
    logoUrl: cafeLogoImg,
    coverUrl: cafeCoverImg,
    rating: 4.9,
    reviewCount: 216,
    primaryColor: '#1a73e8',
    customTags: [
      'Completely Painless Cleaning',
      'Friendly Reception Staff',
      'Modern High-Tech Equipment',
      'Gentle & Caring Dentist',
      'Clear Transparent Pricing',
      'Zero Wait Time',
      'Comfortable Noise-Canceling Headphones',
    ],
    staffMentions: ['Dr. Vance', 'Hygienist Chloe', 'Maria at Front Desk'],
    aiReviewPromptGuide: 'Highlight the gentle touch and how relaxed the visit felt for nervous patients.',
    thankYouTemplates: {
      fiveStar:
        'Thank you for trusting {businessName} with your smile, {customerName}! We are grateful for your {rating}-star feedback and look forward to seeing you in {city}.',
      fourStar:
        'Thank you for your {rating}-star feedback, {customerName}. Our team at {businessName} in {city} appreciates your visit and is always looking for ways to make your care even more comfortable.',
      lowStar:
        'Thank you for sharing candidly with {businessName}, {customerName}. Patient comfort is our priority in {city}, and our practice lead will follow up on your {rating}-star feedback.',
    },
  },
  {
    id: 'biz-3',
    name: 'Trattoria Bella Vista',
    slug: 'bella-vista-trattoria',
    category: 'Italian Restaurant & Wine Bar',
    tagline: 'Handmade fresh pastas, wood-fired Neapolitan pizza & Tuscan wines',
    address: '124 Mulberry Lane',
    city: 'New York, NY',
    country: 'United States',
    phone: '+1 (212) 555-4309',
    website: 'https://bellavista.example.com',
    googlePlaceId: 'ChIJZ3V9MneuEmsRUroyG83frX2',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJZ3V9MneuEmsRUroyG83frX2',
    logoUrl: cafeLogoImg,
    coverUrl: cafeCoverImg,
    rating: 4.8,
    reviewCount: 512,
    primaryColor: '#c2410c',
    customTags: [
      'Truffle Tagliolini',
      'Authentic Wood-Fired Pizza',
      'Attentive & Caring Waitstaff',
      'Romantic Candlelit Atmosphere',
      'Housemade Tiramisu',
      'Great Italian Wine Pairing',
      'Generous Portions',
    ],
    staffMentions: ['Chef Marco', 'Gianni (Server)', 'Sofia'],
    aiReviewPromptGuide: 'Mention the authentic taste of the pasta sauce and the romantic ambiance.',
    thankYouTemplates: {
      fiveStar:
        'Grazie mille for the {rating}-star review, {customerName}! Hosting you at {businessName} in {city} was a pleasure, and we cannot wait to welcome you back for pasta and wine.',
      fourStar:
        'Thank you for dining with us at {businessName}, {customerName}! We appreciate your {rating}-star feedback and look forward to making your next evening in {city} unforgettable.',
      lowStar:
        'Thank you for your honest note, {customerName}. We value every guest at {businessName} in {city} and our general manager will personally review your {rating}-star experience.',
    },
  },
];

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: 'USD',
    symbol: '$',
    setupFee: 30,
    monthlyFee: 2,
    countryName: 'United States (USD)',
    flag: '🇺🇸',
  },
  {
    code: 'GBP',
    symbol: '£',
    setupFee: 24,
    monthlyFee: 1.6,
    countryName: 'United Kingdom (GBP)',
    flag: '🇬🇧',
  },
  {
    code: 'EUR',
    symbol: '€',
    setupFee: 28,
    monthlyFee: 1.9,
    countryName: 'European Union (EUR)',
    flag: '🇪🇺',
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    setupFee: 40,
    monthlyFee: 2.7,
    countryName: 'Canada (CAD)',
    flag: '🇨🇦',
  },
  {
    code: 'AUD',
    symbol: 'A$',
    setupFee: 45,
    monthlyFee: 3.0,
    countryName: 'Australia (AUD)',
    flag: '🇦🇺',
  },
  {
    code: 'INR',
    symbol: '₹',
    setupFee: 2499,
    monthlyFee: 165,
    countryName: 'India (INR)',
    flag: '🇮🇳',
  },
  {
    code: 'JPY',
    symbol: '¥',
    setupFee: 4500,
    monthlyFee: 300,
    countryName: 'Japan (JPY)',
    flag: '🇯🇵',
  },
  {
    code: 'MXN',
    symbol: 'MX$',
    setupFee: 550,
    monthlyFee: 37,
    countryName: 'Mexico (MXN)',
    flag: '🇲🇽',
  },
  {
    code: 'BRL',
    symbol: 'R$',
    setupFee: 160,
    monthlyFee: 11,
    countryName: 'Brazil (BRL)',
    flag: '🇧🇷',
  },
  {
    code: 'AED',
    symbol: 'AED ',
    setupFee: 110,
    monthlyFee: 7.5,
    countryName: 'United Arab Emirates (AED)',
    flag: '🇦🇪',
  },
];

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'English', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'Spanish', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'French', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'German', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'Italian', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'Portuguese', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'Japanese', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'Chinese (Simplified)', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'Arabic', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪' },
  { code: 'Korean', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

export const DEFAULT_CATEGORY_PRESETS = [
  {
    category: 'Artisanal Cafe & Bakery',
    tags: ['Superb Coffee Roast', 'Fresh Pastries', 'Friendly Baristas', 'Cozy Ambiance', 'Fast Free WiFi', 'Quick Service'],
  },
  {
    category: 'Restaurant & Dining',
    tags: ['Delicious Food', 'Generous Portions', 'Attentive Waitstaff', 'Great Atmosphere', 'Fresh Ingredients', 'Top Cocktail Menu'],
  },
  {
    category: 'Dental & Healthcare Clinic',
    tags: ['Gentle & Pain-free', 'Zero Wait Time', 'Clean & Modern Clinic', 'Caring Doctor', 'Clear Explanations', 'Friendly Front Desk'],
  },
  {
    category: 'Salon & Barber Shop',
    tags: ['Precision Haircut', 'Relaxing Experience', 'Great Styling Advice', 'Clean Station', 'Complimentary Drink', 'Punctual Service'],
  },
  {
    category: 'Retail & Boutique',
    tags: ['Curated Selection', 'Helpful Staff', 'Beautiful Storefront', 'Great Quality Products', 'Fair Prices', 'Easy Returns'],
  },
  {
    category: 'Automotive & Repair',
    tags: ['Honest Diagnosis', 'Fast Turnaround', 'Fair Transparent Pricing', 'Friendly Mechanics', 'Clean Waiting Area', 'Reliable Work'],
  },
  {
    category: 'Fitness & Yoga Studio',
    tags: ['Motivating Coaches', 'Spotless Equipment', 'Supportive Community', 'Great Playlist', 'Clean Locker Rooms', 'Challenging Workout'],
  },
];
