import React from 'react';
import {
  ArrowRight,
  QrCode,
  Sparkles,
  ShieldCheck,
  Globe,
  Check,
  DollarSign,
  Smartphone,
  Wallet,
} from 'lucide-react';
import heroCafeImg from '../assets/images/hero_qr_cafe_counter_1794551808755.jpg';
import partnerShowcaseImg from '../assets/images/creator_partner_showcase_1794551810009.jpg';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup', preferredRole?: 'owner' | 'creator') => void;
  onTryCustomerDemo: () => void;
  referredByCode?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onTryCustomerDemo,
  referredByCode,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#141413]">
      {/* Clean 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E6E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#141413] whitespace-nowrap shrink-0"
          >
            Revio AI
          </a>

          <nav
            aria-label="Landing Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B6B65]"
          >
            <a href="#how-it-works" className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#features" className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#pricing" className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <a href="#creators" className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0">
              Creators
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="text-xs sm:text-sm font-medium text-[#6B6B65] hover:text-[#141413] px-3 py-2 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup', 'owner')}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Optional Referral Attribution Banner */}
        {referredByCode && (
          <div className="bg-[#EEF5F3] border-b border-[#CBE2DC] py-2.5 px-4 text-center text-xs text-[#0B4F4A] font-medium">
            Partner invite code <span className="font-mono font-bold">{referredByCode}</span> applied — ready for your $30 business setup.
          </div>
        )}

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                Google Maps QR Review System · USA &amp; Global
              </p>

              <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-bold text-[#141413] tracking-tight leading-[1.08] text-balance">
                Turn everyday store visits into Google Maps reviews in 15 seconds.
              </h1>

              <p className="text-base sm:text-lg text-[#6B6B65] leading-relaxed max-w-xl">
                Customers want to support your shop, but nobody has time to write a review from scratch. Print a custom QR stand, let visitors tap what they loved, and let AI draft an authentic review ready to paste on Google Maps.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup', 'owner')}
                  className="px-6 py-3.5 min-h-[48px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Create Business Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onTryCustomerDemo}
                  className="px-5 py-3.5 min-h-[48px] rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F1F0EB] text-[#141413] text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Smartphone className="w-4 h-4 text-[#0F766E]" />
                  <span>Try Live QR Scan</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#E7E6E0] grid grid-cols-3 gap-4 max-w-lg tabular-nums">
                <div>
                  <div className="text-xl font-bold text-[#141413]">$30</div>
                  <div className="text-xs text-[#6B6B65]">One-time setup</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#141413]">$2/mo</div>
                  <div className="text-xs text-[#6B6B65]">Maintenance fee</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#0F766E]">11+</div>
                  <div className="text-xs text-[#6B6B65]">Review languages</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden border border-[#E7E6E0] bg-white aspect-[16/10] relative">
                <img
                  src={heroCafeImg}
                  alt="Tabletop QR code review stand next to an espresso cup on a sunlit cafe counter"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (01 - 04) */}
        <section id="how-it-works" className="border-t border-[#E7E6E0] bg-white py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                How It Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight text-balance">
                From counter QR scan to posted Google review without friction.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  num: '01.',
                  title: 'Print Your Custom QR Stand',
                  desc: 'Add your logo, Google Place ID, and store highlights. Print acrylic stands, table tents, or window decals directly from the studio.',
                },
                {
                  num: '02.',
                  title: 'Customer Scans & Taps Stars',
                  desc: 'Visitors point their camera at the QR code and open your branded mobile page—with instant switching across 11+ languages.',
                },
                {
                  num: '03.',
                  title: 'AI Drafts an Authentic Review',
                  desc: 'For 4–5 star visits, customers tap highlights and AI writes a natural first-person review ready to copy and paste onto Google Maps.',
                },
                {
                  num: '04.',
                  title: 'Reputation Shield Protects 1–3★',
                  desc: 'Lower ratings open a private management feedback form instead, routing issues straight to your inbox before reaching Google.',
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="p-6 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] space-y-2.5"
                >
                  <div className="text-sm font-mono font-bold text-[#0F766E] tabular-nums">
                    {step.num}
                  </div>
                  <h3 className="text-base font-bold text-[#141413]">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-[#6B6B65] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Features Bento Grid */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Built for Storefronts
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight text-balance">
              Everything business owners need to grow local search visibility.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7 bg-white rounded-3xl border border-[#E7E6E0] p-6 sm:p-8 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                Printable QR Stand Studio &amp; Direct Google Link
              </h3>
              <p className="text-sm text-[#6B6B65] leading-relaxed">
                Generate print-ready 4×6 counter stands, 5×7 foldable table tents, window decals, and check inserts. Every scan opens a fast, mobile-first page tied to your exact Google Maps Place ID.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs font-medium text-[#141413]">
                <span>· High-resolution PNG export</span>
                <span>· Custom brand accent colors</span>
                <span>· Direct Google write-review redirect</span>
              </div>
            </div>

            <div className="md:col-span-5 bg-white rounded-3xl border border-[#E7E6E0] p-6 sm:p-8 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                11+ Languages &amp; Custom Thank You Templates
              </h3>
              <p className="text-sm text-[#6B6B65] leading-relaxed">
                Tourists and international guests can draft reviews in Spanish, French, German, Hindi, Japanese, Arabic, and more. Save tailored Thank You responses by star tier (5★, 4★, 1–3★) for customer screens and 1-click owner replies.
              </p>
            </div>

            <div className="md:col-span-5 bg-white rounded-3xl border border-[#E7E6E0] p-6 sm:p-8 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#BE123C] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                Private Feedback Shield
              </h3>
              <p className="text-sm text-[#6B6B65] leading-relaxed">
                Catch 1–3 star concerns internally with contact details and status tracking (New, Contacted, Resolved) before dissatisfied guests leave permanent public ratings.
              </p>
            </div>

            <div className="md:col-span-7 bg-white rounded-3xl border border-[#E7E6E0] p-6 sm:p-8 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                AI Owner Reply Assistant &amp; Mobile Mode
              </h3>
              <p className="text-sm text-[#6B6B65] leading-relaxed">
                Paste any incoming Google Maps review to generate 3 tailored owner replies matching your store voice, and manage your entire workspace cleanly on phones or desktops.
              </p>
            </div>
          </div>
        </section>

        {/* Transparent Pricing */}
        <section id="pricing" className="border-t border-[#E7E6E0] bg-white py-16 md:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[#E7E6E0] bg-[#F7F7F4] p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                  Simple Global Pricing
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight">
                  One flat plan built for independent businesses.
                </h2>
                <p className="text-sm text-[#6B6B65] leading-relaxed">
                  No $100/month SaaS contracts. Pay a one-time setup fee to configure your QR stand and Google Maps profile, plus a tiny monthly cloud fee. Supports USD, GBP, EUR, CAD, AUD, INR, JPY, and more.
                </p>

                <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-[#141413]">
                  {[
                    'Custom printable QR stands & window stickers',
                    'Unlimited AI customer review drafts in 11+ languages',
                    'Private 1–3 star reputation shield & owner reply assistant',
                    'Multi-location management & custom Thank You templates',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-5 bg-white rounded-2xl border border-[#E7E6E0] p-6 space-y-5">
                <div>
                  <div className="text-xs font-semibold text-[#6B6B65] uppercase tracking-wider">
                    One-Time Setup
                  </div>
                  <div className="text-4xl font-bold text-[#141413] mt-1 tabular-nums">
                    $30
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E7E6E0]">
                  <div className="text-xs font-semibold text-[#6B6B65] uppercase tracking-wider">
                    Monthly Maintenance
                  </div>
                  <div className="flex items-baseline gap-1 mt-1 tabular-nums">
                    <span className="text-3xl font-bold text-[#0F766E]">$2</span>
                    <span className="text-xs font-medium text-[#6B6B65]">/ month</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAuth('signup', 'owner')}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#141413] hover:bg-[#2A2A27] text-white text-sm font-semibold transition-colors"
                >
                  Start Business Setup
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Creator Affiliate Partner Program */}
        <section id="creators" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="bg-white rounded-3xl border border-[#E7E6E0] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                  Creator Affiliate Partner Program
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight text-balance">
                  Earn $10 for every local business you onboard.
                </h2>
                <p className="text-sm text-[#6B6B65] leading-relaxed">
                  Are you a content creator, local marketer, freelancer, or agency? Sign up as a Creator Partner to unlock your private Affiliate Hub inside Settings—complete with payment gateway setup, weekly Friday payouts, and live shop transaction history.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-4 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                      <DollarSign className="w-4 h-4 text-[#0F766E]" />
                      <span>$10 Per Paid Signup</span>
                    </div>
                    <p className="text-xs text-[#6B6B65]">
                      Credited immediately whenever a referred shop pays its $30 setup fee.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                      <Wallet className="w-4 h-4 text-[#0F766E]" />
                      <span>Weekly Payout Gateway</span>
                    </div>
                    <p className="text-xs text-[#6B6B65]">
                      Connect Stripe, PayPal, Wise, or UPI for weekly Friday disbursements.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup', 'creator')}
                  className="px-6 py-3.5 min-h-[48px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Join as Creator Partner</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin', 'creator')}
                  className="px-4 py-3 min-h-[48px] rounded-xl border border-[#E7E6E0] hover:bg-[#F7F7F4] text-sm font-semibold text-[#141413] transition-colors whitespace-nowrap shrink-0"
                >
                  Creator Sign In
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#F1F0EB] min-h-[280px]">
              <img
                src={partnerShowcaseImg}
                alt="Minimalist desk displaying a 5-star Google review card alongside a printed QR stand"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E7E6E0] bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6B65]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#141413] text-sm">Revio AI</span>
            <span aria-hidden="true">·</span>
            <span>Smart QR &amp; Google Maps Review Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onTryCustomerDemo}
              className="hover:text-[#141413] transition-colors"
            >
              Live Customer Scan Demo
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="hover:text-[#141413] transition-colors"
            >
              Owner &amp; Creator Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
