export interface ThankYouTemplates {
  fiveStar: string;
  fourStar: string;
  lowStar: string;
}

export type ThankYouTier = keyof ThankYouTemplates;

export interface BusinessProfile {
  id: string;
  ownerId?: string;
  name: string;
  slug: string;
  category: string;
  tagline: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  googlePlaceId: string;
  googleReviewUrl: string;
  logoUrl: string;
  coverUrl: string;
  rating: number;
  reviewCount: number;
  primaryColor: string;
  customTags: string[];
  staffMentions: string[];
  aiReviewPromptGuide?: string;
  thankYouTemplates?: ThankYouTemplates;
}

export interface PrivateFeedbackItem {
  id: string;
  businessId: string;
  rating: number;
  tags: string[];
  comments: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'resolved';
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  setupFee: number;
  monthlyFee: number;
  countryName: string;
  flag: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export type ReviewTone =
  | 'Warm & Enthusiastic'
  | 'Concise & Punchy'
  | 'Local Guide / Foodie'
  | 'Professional & Detailed'
  | 'Family-Friendly';

export type ReviewLength = 'short' | 'medium' | 'long';

export type ActiveTab = 'dashboard' | 'print' | 'customer' | 'billing' | 'settings';

export type UserRole = 'owner' | 'creator';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  referralCode: string;
  referredByCode?: string;
  createdAt: string;
}

export type PayoutGatewayType = 'stripe' | 'paypal' | 'wise_bank' | 'upi';

export interface PayoutGatewayConfig {
  method: PayoutGatewayType;
  accountLabel: string;
  accountDetail: string;
  country: string;
  currency: string;
  autoWeeklyPayout: boolean;
  payoutDay: string;
  minimumThreshold: number;
  updatedAt: string;
}

export interface ShopReferralTransaction {
  id: string;
  creatorId: string;
  businessName: string;
  businessCategory: string;
  businessCity: string;
  ownerEmail: string;
  setupFeePaid: number;
  monthlyPlanAmount: number;
  commissionAmount: number;
  paymentStatus: 'paid' | 'pending';
  payoutStatus: 'pending_weekly' | 'paid' | 'processing';
  payoutBatchId?: string;
  createdAt: string;
}

export interface WeeklyPayoutRecord {
  id: string;
  creatorId: string;
  weekLabel: string;
  periodRange: string;
  shopsCount: number;
  amount: number;
  method: PayoutGatewayType;
  destinationMasked: string;
  status: 'paid' | 'scheduled' | 'processing';
  paidAt: string;
}

export interface AffiliateDashboardData {
  referralCode: string;
  commissionPerSignup: number;
  nextPayoutDate: string;
  gateway: PayoutGatewayConfig;
  transactions: ShopReferralTransaction[];
  payouts: WeeklyPayoutRecord[];
  summary: {
    totalEarned: number;
    pendingWeeklyBalance: number;
    paidOutTotal: number;
    paidShopsCount: number;
    pendingShopsCount: number;
  };
}
