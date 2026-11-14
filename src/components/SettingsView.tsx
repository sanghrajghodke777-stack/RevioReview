import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  DollarSign,
  Wallet,
  Calendar,
  Store,
  Copy,
  Check,
  Plus,
  LogOut,
  ArrowUpRight,
  Search,
  Landmark,
  BookOpen,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  AffiliateDashboardData,
  BusinessProfile,
  PayoutGatewayType,
  UserAccount,
} from '../types';
import {
  DEFAULT_BUSINESS_COVER,
  DEFAULT_BUSINESS_LOGO,
  DEFAULT_CATEGORY_PRESETS,
} from '../data/mockData';
import {
  loadCreatorAffiliateDataFromFirestore,
  markCreatorTransactionPaidInFirestore,
  recordCreatorReferredBusinessInFirestore,
  runCreatorWeeklyPayoutInFirestore,
  saveCreatorGatewayToFirestore,
  upgradeUserToCreatorInFirestore,
} from '../services/firestoreService';

interface SettingsViewProps {
  user: UserAccount;
  token: string;
  mobileMode?: boolean;
  onUserUpdated: (user: UserAccount) => void;
  onLogout: () => void;
  onAddBusinessToWorkspace: (business: BusinessProfile) => void;
  onOpenCustomerDemo: () => void;
}

type CreatorSubTab = 'transactions' | 'payouts' | 'gateway' | 'resources';

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  token,
  mobileMode = false,
  onUserUpdated,
  onLogout,
  onAddBusinessToWorkspace,
  onOpenCustomerDemo,
}) => {
  const [affiliateData, setAffiliateData] = useState<AffiliateDashboardData | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<CreatorSubTab>('transactions');
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');

  // Referral Copy State
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedScriptIdx, setCopiedScriptIdx] = useState<number | null>(null);

  // Add Referred Shop Form State
  const [showAddShopForm, setShowAddShopForm] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState(DEFAULT_CATEGORY_PRESETS[0].category);
  const [shopCity, setShopCity] = useState('');
  const [shopOwnerEmail, setShopOwnerEmail] = useState('');
  const [markSetupPaid, setMarkSetupPaid] = useState(true);
  const [submittingShop, setSubmittingShop] = useState(false);

  // Transaction Search & Filter
  const [txQuery, setTxQuery] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Payment Gateway Form State
  const [gwMethod, setGwMethod] = useState<PayoutGatewayType>('stripe');
  const [gwLabel, setGwLabel] = useState('');
  const [gwDetail, setGwDetail] = useState('');
  const [gwCountry, setGwCountry] = useState('United States');
  const [gwCurrency, setGwCurrency] = useState('USD');
  const [gwAutoWeekly, setGwAutoWeekly] = useState(true);
  const [gwPayoutDay, setGwPayoutDay] = useState('Every Friday (10:00 AM EST)');
  const [gwMinThreshold, setGwMinThreshold] = useState(10);
  const [savingGateway, setSavingGateway] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const isFirebaseAuth = token === 'firebase';

  const loadAffiliateOverview = useCallback(async () => {
    if (user.role !== 'creator') return;
    setLoadingAffiliate(true);
    try {
      if (isFirebaseAuth) {
        const d = await loadCreatorAffiliateDataFromFirestore(
          user.id,
          user.referralCode,
          user.name
        );
        setAffiliateData(d);
        setGwMethod(d.gateway.method);
        setGwLabel(d.gateway.accountLabel);
        setGwDetail(d.gateway.accountDetail);
        setGwCountry(d.gateway.country);
        setGwCurrency(d.gateway.currency);
        setGwAutoWeekly(d.gateway.autoWeeklyPayout);
        setGwPayoutDay(d.gateway.payoutDay);
        setGwMinThreshold(d.gateway.minimumThreshold);
      } else {
        const res = await fetch('/api/affiliate/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const d: AffiliateDashboardData = json.data;
          setAffiliateData(d);
          setGwMethod(d.gateway.method);
          setGwLabel(d.gateway.accountLabel);
          setGwDetail(d.gateway.accountDetail);
          setGwCountry(d.gateway.country);
          setGwCurrency(d.gateway.currency);
          setGwAutoWeekly(d.gateway.autoWeeklyPayout);
          setGwPayoutDay(d.gateway.payoutDay);
          setGwMinThreshold(d.gateway.minimumThreshold);
        }
      }
    } catch {
      setErrorBanner('Could not load Creator Affiliate dashboard.');
    } finally {
      setLoadingAffiliate(false);
    }
  }, [user.role, user.id, user.referralCode, user.name, token, isFirebaseAuth]);

  useEffect(() => {
    loadAffiliateOverview();
  }, [loadAffiliateOverview]);

  const handleActivateCreatorRole = async () => {
    setErrorBanner('');
    try {
      if (isFirebaseAuth) {
        const updated = await upgradeUserToCreatorInFirestore(user.id);
        if (updated) {
          onUserUpdated(updated);
          setStatusBanner('Creator Partner access unlocked! Set up your payout gateway below.');
        }
      } else {
        const res = await fetch('/api/auth/become-creator', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok && json.success && json.user) {
          onUserUpdated(json.user);
          setStatusBanner('Creator Partner access unlocked! Set up your payout gateway below.');
        }
      }
    } catch {
      setErrorBanner('Could not activate Creator Partner access.');
    }
  };

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${user.referralCode}`
      : `https://revio-ai.com/?ref=${user.referralCode}`;

  const handleCopyText = async (text: string, which: 'link' | 'code' | number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else if (which === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      } else {
        setCopiedScriptIdx(which);
        setTimeout(() => setCopiedScriptIdx(null), 2500);
      }
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleReferBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner('');
    setStatusBanner('');
    setSubmittingShop(true);

    try {
      if (isFirebaseAuth) {
        await recordCreatorReferredBusinessInFirestore(user.id, {
          businessName: shopName,
          businessCategory: shopCategory,
          businessCity: shopCity,
          ownerEmail: shopOwnerEmail,
          markSetupPaid,
        });
        await loadAffiliateOverview();
      } else {
        const res = await fetch('/api/affiliate/refer-business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            businessName: shopName,
            businessCategory: shopCategory,
            businessCity: shopCity,
            ownerEmail: shopOwnerEmail,
            markSetupPaid,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error || 'Could not record referred business.');
        }

        setAffiliateData(json.data);
      }

      // Also add this business into the live QR workspace so the creator can immediately generate its QR stand
      const slug = shopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const preset = DEFAULT_CATEGORY_PRESETS.find((p) => p.category === shopCategory);

      onAddBusinessToWorkspace({
        id: `biz-${Date.now()}`,
        name: shopName.trim(),
        slug: slug || `shop-${Date.now()}`,
        category: shopCategory,
        tagline: `Official Google Maps QR Review Stand for ${shopName.trim()}`,
        address: 'Main Street',
        city: shopCity.trim(),
        country: 'United States',
        phone: '+1 (555) 010-2000',
        website: 'https://example.com',
        googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
        logoUrl: DEFAULT_BUSINESS_LOGO,
        coverUrl: DEFAULT_BUSINESS_COVER,
        rating: 4.9,
        reviewCount: 42,
        primaryColor: '#0f766e',
        customTags: preset?.tags || ['Friendly Team', 'Great Service', 'Clean Space', 'Top Quality'],
        staffMentions: ['Manager', 'Team'],
      });

      setStatusBanner(
        markSetupPaid
          ? `Added ${shopName.trim()} ($30 paid). +$10.00 commission credited to your next weekly payout!`
          : `Added ${shopName.trim()} as pending. Your $10.00 commission unlocks as soon as they complete the $30 setup payment.`
      );
      setShopName('');
      setShopCity('');
      setShopOwnerEmail('');
      setShowAddShopForm(false);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Could not add referred business.');
    } finally {
      setSubmittingShop(false);
    }
  };

  const handleMarkShopPaid = async (txId: string) => {
    setErrorBanner('');
    try {
      if (isFirebaseAuth) {
        await markCreatorTransactionPaidInFirestore(user.id, txId);
        await loadAffiliateOverview();
        setStatusBanner('Shop $30 setup payment confirmed! +$10.00 added to your payout balance.');
      } else {
        const res = await fetch(`/api/affiliate/mark-shop-paid/${txId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setAffiliateData(json.data);
          setStatusBanner('Shop $30 setup payment confirmed! +$10.00 added to your payout balance.');
        }
      }
    } catch {
      setErrorBanner('Failed to confirm payment.');
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateway(true);
    setErrorBanner('');
    setStatusBanner('');

    try {
      if (isFirebaseAuth) {
        await saveCreatorGatewayToFirestore(user.id, {
          method: gwMethod,
          accountLabel: gwLabel,
          accountDetail: gwDetail,
          country: gwCountry,
          currency: gwCurrency,
          autoWeeklyPayout: gwAutoWeekly,
          payoutDay: gwPayoutDay,
          minimumThreshold: gwMinThreshold,
        });
        await loadAffiliateOverview();
      } else {
        const res = await fetch('/api/affiliate/gateway', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            method: gwMethod,
            accountLabel: gwLabel,
            accountDetail: gwDetail,
            country: gwCountry,
            currency: gwCurrency,
            autoWeeklyPayout: gwAutoWeekly,
            payoutDay: gwPayoutDay,
            minimumThreshold: gwMinThreshold,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error || 'Could not save gateway details.');
        }
        setAffiliateData(json.data);
      }
      setStatusBanner('Payout gateway & weekly payout preferences saved.');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Error saving payout gateway.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    setErrorBanner('');
    setStatusBanner('');
    try {
      if (isFirebaseAuth && affiliateData) {
        const payout = await runCreatorWeeklyPayoutInFirestore(
          user.id,
          affiliateData.gateway,
          affiliateData.transactions
        );
        await loadAffiliateOverview();
        setStatusBanner(
          `Payout ${payout.id} for $${payout.amount}.00 processed to ${payout.destinationMasked}!`
        );
        setActiveSubTab('payouts');
      } else {
        const res = await fetch('/api/affiliate/request-payout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error || 'Could not process weekly payout.');
        }
        setAffiliateData(json.data);
        setStatusBanner(
          `Payout ${json.payout.id} for $${json.payout.amount}.00 processed to ${json.payout.destinationMasked}!`
        );
        setActiveSubTab('payouts');
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to initiate payout.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const filteredTransactions = (affiliateData?.transactions || []).filter((tx) => {
    const matchesStatus = txFilter === 'all' || tx.paymentStatus === txFilter;
    const q = txQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      tx.businessName.toLowerCase().includes(q) ||
      tx.businessCity.toLowerCase().includes(q) ||
      tx.id.toLowerCase().includes(q) ||
      tx.ownerEmail.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const outreachScripts = [
    {
      title: 'In-Person Counter Pitch (30 Seconds)',
      body: `Hey! I noticed how busy your shop gets—most happy customers forget to leave a Google Maps review when they leave. With Revio AI, they scan a sleek QR stand at your counter, tap what they liked, and AI writes the review in 15 seconds. It's just $30 one-time setup and $2/mo. Use my partner code ${user.referralCode} and I can set up your QR stand right now!`,
    },
    {
      title: 'Instagram DM / WhatsApp Outreach',
      body: `Hi! Love what you're doing at your store. Have you tried tabletop AI QR stands for Google Maps reviews? Guests scan, pick 2 highlights, and AI drafts a natural review in English or 10+ other languages—while 1–3 star feedback goes privately to you. Only $30 setup + $2/mo. Here's my direct link to get started: ${referralLink}`,
    },
  ];

  return (
    <div
      className={
        mobileMode
          ? 'px-3.5 py-4 space-y-5'
          : 'max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 md:py-8 space-y-6 md:space-y-8'
      }
    >
      {/* Account Settings Header */}
      <div
        className={`bg-white rounded-3xl border border-[#E7E6E0] ${
          mobileMode
            ? 'p-4 space-y-4'
            : 'p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#141413] truncate">
                {user.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  user.role === 'creator'
                    ? 'bg-[#EEF5F3] text-[#0F766E]'
                    : 'bg-[#F1F0EB] text-[#6B6B65]'
                }`}
              >
                {user.role === 'creator' ? 'Creator Partner' : 'Business Owner'}
              </span>
            </div>
            <p className="text-xs text-[#6B6B65] truncate mt-0.5">
              {user.email} · Partner Code: <span className="font-mono font-semibold text-[#141413]">{user.referralCode}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] hover:bg-[#F1F0EB] text-xs font-semibold text-[#141413] transition-colors whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-2xl bg-[#EEF5F3] border border-[#CBE2DC] text-xs font-medium text-[#0B4F4A]">
          {statusBanner}
        </div>
      )}

      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-xs font-medium text-[#9F1239]">
          {errorBanner}
        </div>
      )}

      {/* Creator-Only Affiliate Partner Program Gate */}
      {user.role !== 'creator' ? (
        <div className="bg-white rounded-3xl border border-[#E7E6E0] p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#141413]">
            Creator Affiliate Partner Program
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6B65] leading-relaxed max-w-lg mx-auto">
            This affiliate partner portal—including payment gateway setup, weekly Friday payouts, and shop transaction history—is exclusively for registered <strong>Creator Partner</strong> accounts earning <strong>$10 per paid business signup</strong>.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleActivateCreatorRole}
              className="px-6 py-3 min-h-[46px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Enroll as Creator Partner Now</span>
            </button>
          </div>
        </div>
      ) : loadingAffiliate || !affiliateData ? (
        <div className="bg-white rounded-3xl border border-[#E7E6E0] p-10 text-center text-xs text-[#6B6B65]">
          Loading Creator Affiliate Partner Program...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Creator Commission KPI Strip */}
          <div
            className={`grid gap-3 md:gap-4 ${
              mobileMode ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
            }`}
          >
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1">
              <div className="flex items-center justify-between text-[#6B6B65]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Weekly Balance
                </span>
                <Wallet className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-bold text-[#0F766E] tabular-nums">
                ${affiliateData.summary.pendingWeeklyBalance.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#6B6B65]">
                Ready for next payout
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1">
              <div className="flex items-center justify-between text-[#6B6B65]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Total Earned
                </span>
                <DollarSign className="w-4 h-4 text-[#141413]" />
              </div>
              <div className="text-2xl font-bold text-[#141413] tabular-nums">
                ${affiliateData.summary.totalEarned.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#6B6B65] tabular-nums">
                $10 × {affiliateData.summary.paidShopsCount} paid shops
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1">
              <div className="flex items-center justify-between text-[#6B6B65]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Paid Out
                </span>
                <Landmark className="w-4 h-4 text-[#6B6B65]" />
              </div>
              <div className="text-2xl font-bold text-[#141413] tabular-nums">
                ${affiliateData.summary.paidOutTotal.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#6B6B65] tabular-nums">
                {affiliateData.payouts.length} weekly batches
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1">
              <div className="flex items-center justify-between text-[#6B6B65]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Next Payout
                </span>
                <Calendar className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-base sm:text-lg font-bold text-[#141413] leading-tight pt-1">
                {affiliateData.nextPayoutDate}
              </div>
              <div className="text-[11px] text-[#6B6B65]">
                Auto-transfer: {affiliateData.gateway.autoWeeklyPayout ? 'On' : 'Paused'}
              </div>
            </div>
          </div>

          {/* Partner Referral Link & Add Referred Shop Bar */}
          <div className="bg-white rounded-3xl border border-[#E7E6E0] p-4 sm:p-6 space-y-4">
            <div
              className={`flex gap-4 ${
                mobileMode
                  ? 'flex-col'
                  : 'flex-col lg:flex-row lg:items-center justify-between'
              }`}
            >
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#141413]">
                  Your Creator Referral Link ($10 per paid business)
                </h2>
                <p className="text-xs text-[#6B6B65]">
                  Share your link or add a local shop directly below to earn $10.00 when their $30 setup payment clears.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(affiliateData.referralCode, 'code')}
                  className="px-3.5 py-2 min-h-[42px] rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] hover:bg-[#F1F0EB] text-xs font-mono font-bold text-[#141413] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#0F766E]" /> : <Copy className="w-3.5 h-3.5 text-[#6B6B65]" />}
                  <span>{affiliateData.referralCode}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(referralLink, 'link')}
                  className="px-3.5 py-2 min-h-[42px] rounded-xl border border-[#CBE2DC] bg-[#EEF5F3] hover:bg-[#E1EFEA] text-xs font-semibold text-[#0B4F4A] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Referral Link Copied' : 'Copy Partner Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddShopForm(!showAddShopForm)}
                  className="px-4 py-2 min-h-[42px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Business (+$10)</span>
                </button>
              </div>
            </div>

            {/* Inline Add Referred Shop Form */}
            {showAddShopForm && (
              <form
                onSubmit={handleReferBusiness}
                className="p-4 sm:p-5 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0] space-y-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#141413]">
                    Onboard a Local Shop &amp; Credit $10 Commission
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddShopForm(false)}
                    className="text-[#6B6B65] hover:text-[#141413]"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      Shop / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Sunnyside Bakery"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      Category
                    </label>
                    <select
                      value={shopCategory}
                      onChange={(e) => setShopCategory(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white"
                    >
                      {DEFAULT_CATEGORY_PRESETS.map((p) => (
                        <option key={p.category} value={p.category}>
                          {p.category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      City / Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={shopCity}
                      onChange={(e) => setShopCity(e.target.value)}
                      placeholder="e.g. Austin, TX"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      Store Owner Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={shopOwnerEmail}
                      onChange={(e) => setShopOwnerEmail(e.target.value)}
                      placeholder="owner@shop.com"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-[#141413]">
                  <input
                    type="checkbox"
                    checked={markSetupPaid}
                    onChange={(e) => setMarkSetupPaid(e.target.checked)}
                    className="w-4 h-4 accent-[#0F766E]"
                  />
                  <span>
                    Store owner completed $30 one-time setup payment (unlocks $10.00 commission immediately)
                  </span>
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submittingShop}
                    className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#141413] hover:bg-[#2A2A27] text-white font-semibold"
                  >
                    {submittingShop ? 'Adding Shop...' : 'Save Business & Track Commission'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Creator Partner Program Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F1F0EB] p-1 rounded-2xl border border-[#E7E6E0]">
            {[
              { id: 'transactions' as const, label: 'Shop Transactions', icon: Store },
              { id: 'payouts' as const, label: 'Weekly Payouts', icon: Calendar },
              { id: 'gateway' as const, label: 'Payment Gateway', icon: Landmark },
              { id: 'resources' as const, label: 'Creator Resources', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[42px] rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#6B6B65] hover:text-[#141413]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0F766E]' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Shop Transaction History */}
          {activeSubTab === 'transactions' && (
            <div className="bg-white rounded-3xl border border-[#E7E6E0] p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E6E0] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#141413]">
                    Shop Transaction History
                  </h3>
                  <p className="text-xs text-[#6B6B65]">
                    Every referred shop signup, $30 setup payment, and $10 partner commission.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-52">
                    <Search className="w-3.5 h-3.5 text-[#8E8D86] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={txQuery}
                      onChange={(e) => setTxQuery(e.target.value)}
                      placeholder="Search shop or city..."
                      className="w-full text-xs min-h-[38px] pl-8 pr-3 py-1.5 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#F1F0EB] p-0.5 rounded-xl text-[11px]">
                    {(['all', 'paid', 'pending'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setTxFilter(f)}
                        className={`px-2.5 py-1.5 rounded-lg capitalize font-semibold ${
                          txFilter === f ? 'bg-white text-[#141413] shadow-xs' : 'text-[#6B6B65]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="py-10 text-center space-y-2 text-xs text-[#6B6B65]">
                  <p>No shop transactions match your current filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTxQuery('');
                      setTxFilter('all');
                      setShowAddShopForm(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0F766E] text-white font-semibold"
                  >
                    Add Your First Referred Business
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile / MobileMode Stacked Cards */}
                  <div className={mobileMode ? 'space-y-3' : 'space-y-3 md:hidden'}>
                    {filteredTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#141413]">{tx.businessName}</span>
                          <span className="font-mono font-bold text-[#0F766E] tabular-nums">
                            +${tx.commissionAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B6B65]">
                          {tx.businessCity} · {tx.ownerEmail}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[#E7E6E0] text-[11px]">
                          <span className="tabular-nums text-[#6B6B65]">
                            {tx.id} · Setup: ${tx.setupFeePaid}
                          </span>
                          {tx.paymentStatus === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => handleMarkShopPaid(tx.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#0F766E] text-white font-semibold"
                            >
                              Mark $30 Paid
                            </button>
                          ) : (
                            <span className="font-semibold text-[#0F766E]">
                              {tx.payoutStatus === 'paid' ? `Paid (${tx.payoutBatchId})` : 'Queued for Weekly Payout'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Data Table */}
                  {!mobileMode && (
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E7E6E0] text-[#8E8D86]">
                            <th className="pb-3 font-semibold">Txn ID</th>
                            <th className="pb-3 font-semibold">Business</th>
                            <th className="pb-3 font-semibold">Owner</th>
                            <th className="pb-3 font-semibold text-right">Shop Setup</th>
                            <th className="pb-3 font-semibold text-right">Your $10</th>
                            <th className="pb-3 font-semibold text-right">Payout Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E7E6E0] text-[#141413]">
                          {filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-[#F7F7F4]/70">
                              <td className="py-3.5 font-mono text-[#6B6B65]">{tx.id}</td>
                              <td className="py-3.5">
                                <div className="font-semibold text-[#141413]">{tx.businessName}</div>
                                <div className="text-[11px] text-[#6B6B65]">
                                  {tx.businessCategory} · {tx.businessCity}
                                </div>
                              </td>
                              <td className="py-3.5 text-[#6B6B65]">{tx.ownerEmail}</td>
                              <td className="py-3.5 text-right tabular-nums">
                                {tx.paymentStatus === 'paid' ? (
                                  <span className="font-semibold text-[#141413]">$30.00 Paid</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkShopPaid(tx.id)}
                                    className="px-2.5 py-1 rounded-lg border border-[#CBE2DC] bg-[#EEF5F3] text-[#0B4F4A] font-semibold hover:bg-[#E1EFEA]"
                                  >
                                    Confirm $30 Paid
                                  </button>
                                )}
                              </td>
                              <td className="py-3.5 text-right font-mono font-bold text-[#0F766E] tabular-nums">
                                {tx.paymentStatus === 'paid' ? '+$10.00' : '$0.00'}
                              </td>
                              <td className="py-3.5 text-right text-[11px] font-semibold">
                                {tx.paymentStatus === 'pending' ? (
                                  <span className="text-[#D97706]">Awaiting Shop Payment</span>
                                ) : tx.payoutStatus === 'paid' ? (
                                  <span className="text-[#0F766E]">Paid · {tx.payoutBatchId}</span>
                                ) : (
                                  <span className="text-[#141413]">Queued Friday</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: Weekly Payouts */}
          {activeSubTab === 'payouts' && (
            <div className="bg-white rounded-3xl border border-[#E7E6E0] p-4 sm:p-6 space-y-5">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#EEF5F3] border border-[#CBE2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider">
                    Next Scheduled Weekly Payout · {affiliateData.nextPayoutDate}
                  </div>
                  <div className="text-2xl font-bold text-[#0B4F4A] tabular-nums">
                    ${affiliateData.summary.pendingWeeklyBalance.toFixed(2)} Available
                  </div>
                  <p className="text-xs text-[#0B4F4A]/85">
                    Destination: <strong>{affiliateData.gateway.method.toUpperCase()}</strong> ({affiliateData.gateway.accountDetail || 'Not configured yet'})
                  </p>
                </div>

                <button
                  type="button"
                  disabled={requestingPayout || affiliateData.summary.pendingWeeklyBalance < 10}
                  onClick={handleRequestPayout}
                  className="px-5 py-3 min-h-[44px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {requestingPayout
                    ? 'Sending Payout...'
                    : 'Run Weekly Payout Now'}
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#141413]">
                  Weekly Payout History
                </h3>

                {affiliateData.payouts.length === 0 ? (
                  <p className="text-xs text-[#6B6B65] py-6 text-center">
                    No payouts disbursed yet. Verified commissions settle every Friday.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {affiliateData.payouts.map((po) => (
                      <div
                        key={po.id}
                        className="p-4 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-[#141413]">
                            <span className="font-mono">{po.id}</span>
                            <span className="text-[#8E8D86]">·</span>
                            <span>{po.weekLabel}</span>
                          </div>
                          <div className="text-[#6B6B65] tabular-nums">
                            {po.periodRange} · {po.shopsCount} paid {po.shopsCount === 1 ? 'shop' : 'shops'} · {po.destinationMasked}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 tabular-nums">
                          <span className="text-base font-bold text-[#0F766E]">
                            ${po.amount.toFixed(2)}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-[#CBE2DC] text-[#0F766E]">
                            Paid
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Payment Gateway Setup */}
          {activeSubTab === 'gateway' && (
            <form
              onSubmit={handleSaveGateway}
              className="bg-white rounded-3xl border border-[#E7E6E0] p-4 sm:p-7 space-y-5 text-xs"
            >
              <div className="border-b border-[#E7E6E0] pb-4">
                <h3 className="text-base font-bold text-[#141413]">
                  Creator Payout Gateway Setup
                </h3>
                <p className="text-xs text-[#6B6B65] mt-0.5">
                  Configure where your $10/shop weekly commissions are deposited automatically every Friday.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-2">
                  Select Payout Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'stripe' as const, label: 'Stripe Express', sub: 'Instant US/Global' },
                    { id: 'paypal' as const, label: 'PayPal Payouts', sub: 'Email transfer' },
                    { id: 'wise_bank' as const, label: 'Wise / Bank ACH', sub: 'Direct deposit' },
                    { id: 'upi' as const, label: 'UPI / Local', sub: 'Instant transfer' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setGwMethod(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        gwMethod === m.id
                          ? 'border-[#0F766E] bg-[#EEF5F3] text-[#0B4F4A]'
                          : 'border-[#E7E6E0] bg-[#F7F7F4] text-[#6B6B65]'
                      }`}
                    >
                      <div className="font-bold text-[#141413]">{m.label}</div>
                      <div className="text-[11px] mt-0.5">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    Account / Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gwLabel}
                    onChange={(e) => setGwLabel(e.target.value)}
                    placeholder="Legal name or studio LLC"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    {gwMethod === 'paypal'
                      ? 'PayPal Email *'
                      : gwMethod === 'wise_bank'
                      ? 'Routing / IBAN / Account Number *'
                      : gwMethod === 'upi'
                      ? 'UPI ID *'
                      : 'Stripe Connect ID or Payout Email *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={gwDetail}
                    onChange={(e) => setGwDetail(e.target.value)}
                    placeholder={
                      gwMethod === 'paypal'
                        ? 'creator@paypal.com'
                        : gwMethod === 'wise_bank'
                        ? 'US00-8841-9920'
                        : gwMethod === 'upi'
                        ? 'creator@okaxis'
                        : 'acct_1Q9xRevio8421'
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={gwCountry}
                    onChange={(e) => setGwCountry(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    Weekly Schedule &amp; Minimum
                  </label>
                  <select
                    value={gwMinThreshold}
                    onChange={(e) => setGwMinThreshold(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white"
                  >
                    <option value={10}>Every Friday · $10 minimum (1 shop)</option>
                    <option value={20}>Every Friday · $20 minimum (2 shops)</option>
                    <option value={50}>Every Friday · $50 minimum (5 shops)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-[#141413] p-3.5 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0]">
                <input
                  type="checkbox"
                  checked={gwAutoWeekly}
                  onChange={(e) => setGwAutoWeekly(e.target.checked)}
                  className="w-4 h-4 accent-[#0F766E]"
                />
                <span>
                  Enable automatic weekly payouts every Friday at 10:00 AM EST
                </span>
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingGateway}
                  className="px-6 py-3 min-h-[44px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold transition-colors disabled:opacity-60"
                >
                  {savingGateway ? 'Saving...' : 'Save Payment Gateway'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Creator Resources & Outreach Kit */}
          {activeSubTab === 'resources' && (
            <div className="bg-white rounded-3xl border border-[#E7E6E0] p-4 sm:p-7 space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E6E0] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#141413]">
                    Creator Partner Resources &amp; Pitch Kit
                  </h3>
                  <p className="text-xs text-[#6B6B65] mt-0.5">
                    Proven scripts and live interactive demo tools to close local shops fast.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenCustomerDemo}
                  className="px-4 py-2.5 min-h-[42px] rounded-xl border border-[#CBE2DC] bg-[#EEF5F3] text-[#0B4F4A] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>Open Live Scan Demo for Shops</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outreachScripts.map((script, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="font-bold text-[#141413] text-sm">{script.title}</div>
                      <p className="text-xs text-[#6B6B65] leading-relaxed bg-white p-3.5 rounded-xl border border-[#E7E6E0]">
                        {script.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(script.body, idx)}
                      className="self-start px-3.5 py-2 min-h-[38px] rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F1F0EB] font-semibold text-[#141413] inline-flex items-center gap-1.5"
                    >
                      {copiedScriptIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Script Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#6B6B65]" />
                          <span>Copy Pitch Script</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
