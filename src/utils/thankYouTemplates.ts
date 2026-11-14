import { BusinessProfile, ThankYouTemplates, ThankYouTier } from '../types';

export const DEFAULT_THANK_YOU_TEMPLATES: ThankYouTemplates = {
  fiveStar:
    'Thank you so much for the {rating}-star love, {customerName}! Everyone at {businessName} in {city} truly appreciates your support, and we look forward to welcoming you back soon.',
  fourStar:
    'Thank you for the {rating}-star rating, {customerName}! We are glad you enjoyed your visit to {businessName} and are always working to make your next stop in {city} a full 5-star experience.',
  lowStar:
    'Thank you for sharing honest feedback with {businessName}, {customerName}. We take your {rating}-star experience seriously, and a manager in {city} will review your message promptly to make things right.',
};

export const TEMPLATE_PLACEHOLDERS: {
  token: string;
  label: string;
  sampleValue: string;
}[] = [
  { token: '{businessName}', label: 'Business Name', sampleValue: 'The Roasted Bean' },
  { token: '{customerName}', label: 'Customer Name', sampleValue: 'Jordan' },
  { token: '{rating}', label: 'Star Rating', sampleValue: '5' },
  { token: '{city}', label: 'City', sampleValue: 'San Francisco, CA' },
];

export const THANK_YOU_TIERS: {
  key: ThankYouTier;
  label: string;
  shortLabel: string;
  description: string;
  sampleRating: number;
}[] = [
  {
    key: 'fiveStar',
    label: '5 Stars',
    shortLabel: '5 Stars',
    description: 'Shown to 5-star promoters and available as a quick reply for glowing Google reviews.',
    sampleRating: 5,
  },
  {
    key: 'fourStar',
    label: '4 Stars',
    shortLabel: '4 Stars',
    description: 'Shown to 4-star visitors to thank them warmly and invite a return visit.',
    sampleRating: 4,
  },
  {
    key: 'lowStar',
    label: '1–3 Stars',
    shortLabel: '1–3 Stars',
    description: 'Shown after private Reputation Shield submission and used for recovery replies.',
    sampleRating: 2,
  },
];

export function getTierForRating(rating: number): ThankYouTier {
  if (rating >= 5) return 'fiveStar';
  if (rating === 4) return 'fourStar';
  return 'lowStar';
}

export function getBusinessThankYouTemplates(
  business?: Partial<BusinessProfile> | null
): ThankYouTemplates {
  return {
    fiveStar:
      business?.thankYouTemplates?.fiveStar?.trim() || DEFAULT_THANK_YOU_TEMPLATES.fiveStar,
    fourStar:
      business?.thankYouTemplates?.fourStar?.trim() || DEFAULT_THANK_YOU_TEMPLATES.fourStar,
    lowStar:
      business?.thankYouTemplates?.lowStar?.trim() || DEFAULT_THANK_YOU_TEMPLATES.lowStar,
  };
}

export function resolveThankYouTemplate(params: {
  business?: Partial<BusinessProfile> | null;
  rating: number;
  customerName?: string;
  overrideTemplate?: string;
}): string {
  const { business, rating, customerName, overrideTemplate } = params;
  const tier = getTierForRating(rating);
  const templates = getBusinessThankYouTemplates(business);
  const rawTemplate =
    overrideTemplate !== undefined ? overrideTemplate : templates[tier];

  const cleanBusinessName = business?.name?.trim() || 'our team';
  const cleanCustomerName = customerName?.trim() || 'Valued Guest';
  const cleanCity = business?.city?.trim() || 'your area';
  const cleanRating = String(Math.max(1, Math.min(5, Math.round(rating || 5))));

  return rawTemplate
    .replace(/\{businessName\}/g, cleanBusinessName)
    .replace(/\{customerName\}/g, cleanCustomerName)
    .replace(/\{rating\}/g, cleanRating)
    .replace(/\{city\}/g, cleanCity);
}
