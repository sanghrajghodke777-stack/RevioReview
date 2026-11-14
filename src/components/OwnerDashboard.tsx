import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  QrCode,
  Sparkles,
  ShieldCheck,
  Star,
  Copy,
  Check,
  Clock,
  Mail,
  Phone,
  ExternalLink,
  Edit3,
  MessageSquareHeart,
} from 'lucide-react';
import { BusinessProfile, PrivateFeedbackItem } from '../types';
import {
  THANK_YOU_TIERS,
  getTierForRating,
  resolveThankYouTemplate,
} from '../utils/thankYouTemplates';
import {
  subscribeBusinessFeedback,
  updateFeedbackStatusInFirestore,
} from '../services/firestoreService';

interface OwnerDashboardProps {
  business: BusinessProfile;
  mobileMode?: boolean;
  onEditBusiness: () => void;
  onGoToPrintStudio: () => void;
  onGoToCustomerView: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  business,
  mobileMode = false,
  onEditBusiness,
  onGoToPrintStudio,
  onGoToCustomerView,
}) => {
  const [metrics, setMetrics] = useState({
    scansCount: 482,
    reviewsDrafted: 319,
    copiedToGoogle: 247,
    privateFeedbackCount: 8,
  });

  const [feedbackList, setFeedbackList] = useState<PrivateFeedbackItem[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(true);

  // AI Reply Assistant State
  const [reviewInput, setReviewInput] = useState<string>(
    'The oat milk latte here is literally the best in the Mission! Alex made great latte art and the sourdough croissant was fresh out of the oven. Super fast wifi too.'
  );
  const [reviewerNameInput, setReviewerNameInput] = useState<string>('Jordan Lee');
  const [reviewerRatingInput, setReviewerRatingInput] = useState<number>(5);
  const [replyStyle, setReplyStyle] = useState<string>('appreciative');
  const [isGeneratingReply, setIsGeneratingReply] = useState<boolean>(false);
  const [generatedReplies, setGeneratedReplies] = useState<
    { title: string; text: string }[]
  >([]);
  const [copiedReplyIndex, setCopiedReplyIndex] = useState<number | null>(null);
  const [copiedSavedTemplate, setCopiedSavedTemplate] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.analytics) {
          setMetrics(data.analytics);
        }
      })
      .catch(() => {});

    if (business.ownerId) {
      setLoadingFeedback(true);
      const unsubscribe = subscribeBusinessFeedback(
        business.id,
        business.ownerId,
        (items) => {
          setFeedbackList(items);
          setLoadingFeedback(false);
        }
      );
      return () => unsubscribe();
    }

    fetch('/api/feedback')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.feedback) {
          setFeedbackList(data.feedback);
        }
        setLoadingFeedback(false);
      })
      .catch(() => setLoadingFeedback(false));
  }, [business.id, business.ownerId]);

  const handleGenerateOwnerReply = async () => {
    setIsGeneratingReply(true);
    setCopiedReplyIndex(null);

    try {
      const response = await fetch('/api/generate-owner-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: business.name,
          reviewerName: reviewerNameInput,
          reviewText: reviewInput,
          starRating: reviewerRatingInput,
          replyStyle,
          savedTemplate: resolveThankYouTemplate({
            business,
            rating: reviewerRatingInput,
            customerName: reviewerNameInput,
          }),
        }),
      });

      const data = await response.json();
      if (data.success && data.replies) {
        setGeneratedReplies(data.replies);
      }
    } catch (err) {
      console.error('Failed to generate owner reply:', err);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleCopyReply = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReplyIndex(index);
      setTimeout(() => setCopiedReplyIndex(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeReplyTier = getTierForRating(reviewerRatingInput);
  const activeTierLabel =
    THANK_YOU_TIERS.find((t) => t.key === activeReplyTier)?.label || '5 Stars';
  const resolvedSavedTemplate = resolveThankYouTemplate({
    business,
    rating: reviewerRatingInput,
    customerName: reviewerNameInput,
  });

  const handleCopySavedTemplate = async () => {
    try {
      await navigator.clipboard.writeText(resolvedSavedTemplate);
      setCopiedSavedTemplate(true);
      setTimeout(() => setCopiedSavedTemplate(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFeedbackStatus = async (
    id: string,
    status: 'new' | 'contacted' | 'resolved'
  ) => {
    try {
      if (business.ownerId) {
        await updateFeedbackStatusInFirestore(business.id, id, status);
      } else {
        await fetch(`/api/feedback/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
      setFeedbackList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={
        mobileMode
          ? 'px-3.5 py-4 space-y-4'
          : 'max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 md:py-8 space-y-5 md:space-y-8'
      }
    >
      {/* Top Store Summary Card */}
      <div
        className={`bg-white rounded-3xl border border-[#E7E6E0] ${
          mobileMode
            ? 'p-4 space-y-4'
            : 'p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <img
            src={business.logoUrl}
            alt={business.name}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-[#E7E6E0] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className={`font-bold text-[#141413] tracking-tight truncate ${
                  mobileMode ? 'text-lg' : 'text-lg sm:text-2xl'
                }`}
              >
                {business.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF5F3] text-[#0F766E]">
                Active QR
              </span>
            </div>
            <p className="text-xs text-[#6B6B65] mt-0.5 truncate">
              {business.category} · {business.city}
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-xs font-medium tabular-nums">
              <span className="text-[#D97706] font-semibold">
                ★ {business.rating}
              </span>
              <span className="text-[#D2D0C8]">·</span>
              <span className="text-[#6B6B65]">
                {business.reviewCount} reviews
              </span>
              <span className="text-[#D2D0C8]">·</span>
              <a
                href={business.googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#0F766E] hover:underline inline-flex items-center gap-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div
          className={`flex gap-2 ${
            mobileMode
              ? 'grid grid-cols-2'
              : 'flex-wrap items-center'
          }`}
        >
          <button
            type="button"
            onClick={onEditBusiness}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] md:min-h-[38px] text-xs font-semibold rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] hover:bg-[#F1F0EB] text-[#141413] transition-colors whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#6B6B65]" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={onGoToCustomerView}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] md:min-h-[38px] text-xs font-semibold rounded-xl border border-[#CBE2DC] bg-[#EEF5F3] hover:bg-[#E1EFEA] text-[#0B4F4A] transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Test Scan</span>
          </button>

          <button
            type="button"
            onClick={onGoToPrintStudio}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] md:min-h-[38px] text-xs font-semibold rounded-xl bg-[#141413] hover:bg-[#2A2A27] text-white transition-colors whitespace-nowrap shrink-0 ${
              mobileMode ? 'col-span-2' : ''
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Print QR Stands</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (2-col compact on mobile / Mobile Mode, 4-col on desktop) */}
      <div
        className={`grid gap-3 md:gap-4 ${
          mobileMode ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
        }`}
      >
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1.5">
          <div className="flex items-center justify-between text-[#6B6B65]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              QR Scans
            </span>
            <QrCode className="w-4 h-4 text-[#8E8D86]" />
          </div>
          <div className="text-2xl font-bold text-[#141413] tabular-nums">
            {metrics.scansCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#0F766E] font-medium">
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span>+34% this month</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1.5">
          <div className="flex items-center justify-between text-[#6B6B65]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              AI Drafts
            </span>
            <Sparkles className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#141413] tabular-nums">
            {metrics.reviewsDrafted}
          </div>
          <div className="text-[11px] text-[#6B6B65] font-medium tabular-nums">
            Avg speed: 1.4s
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1.5">
          <div className="flex items-center justify-between text-[#6B6B65]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Posted
            </span>
            <Star className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#141413] tabular-nums">
            {metrics.copiedToGoogle}
          </div>
          <div className="text-[11px] text-[#0F766E] font-semibold tabular-nums">
            77.4% conversion
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E6E0] space-y-1.5">
          <div className="flex items-center justify-between text-[#6B6B65]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Deflections
            </span>
            <ShieldCheck className="w-4 h-4 text-[#BE123C]" />
          </div>
          <div className="text-2xl font-bold text-[#141413] tabular-nums">
            {metrics.privateFeedbackCount}
          </div>
          <div className="text-[11px] text-[#BE123C] font-medium">
            Private inbox
          </div>
        </div>
      </div>

      {/* Main Grid: AI Reply Assistant + Private Feedback Shield Inbox */}
      <div
        className={`grid gap-5 md:gap-8 items-start ${
          mobileMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* Left Column: AI Owner Reply Generator */}
        <div
          className={`${
            mobileMode ? '' : 'lg:col-span-7'
          } bg-white rounded-3xl p-4 sm:p-7 border border-[#E7E6E0] space-y-5`}
        >
          <div className="flex items-center justify-between border-b border-[#E7E6E0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-[#EEF5F3] text-[#0F766E]">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-[#141413]">
                  AI Review Reply Assistant
                </h2>
              </div>
              <p className="text-xs text-[#6B6B65] mt-1">
                Generate tailored owner responses aligned with your saved templates.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={reviewerNameInput}
                  onChange={(e) => setReviewerNameInput(e.target.value)}
                  className="w-full text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                  Rating
                </label>
                <select
                  value={reviewerRatingInput}
                  onChange={(e) => setReviewerRatingInput(parseInt(e.target.value, 10))}
                  className="w-full text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white font-medium text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                >
                  <option value={5}>★★★★★ (5 Stars)</option>
                  <option value={4}>★★★★☆ (4 Stars)</option>
                  <option value={3}>★★★☆☆ (3 Stars)</option>
                  <option value={2}>★★☆☆☆ (2 Stars)</option>
                  <option value={1}>★☆☆☆☆ (1 Star)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                Customer&apos;s Review Text
              </label>
              <textarea
                rows={3}
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
                placeholder="Paste customer review here..."
                className="w-full text-xs p-3 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] font-sans"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#6B6B65] mr-0.5">
                  Style:
                </span>
                {['appreciative', 'casual', 'problem-solver'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReplyStyle(s)}
                    className={`text-xs px-3 py-1.5 min-h-[36px] rounded-xl border capitalize transition-all whitespace-nowrap shrink-0 ${
                      replyStyle === s
                        ? 'border-[#0F766E] bg-[#EEF5F3] text-[#0B4F4A] font-semibold'
                        : 'border-[#E7E6E0] bg-white text-[#6B6B65] hover:text-[#141413]'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerateOwnerReply}
                disabled={isGeneratingReply}
                className="py-2.5 px-4 min-h-[44px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingReply ? 'animate-spin' : ''}`} />
                <span>{isGeneratingReply ? 'Crafting Replies...' : 'Generate 3 Replies'}</span>
              </button>
            </div>
          </div>

          {/* Saved Thank You Template Quick-Use Preset */}
          <div className="p-4 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span className="font-semibold text-[#141413]">
                  Saved Thank You Template
                </span>
                <span className="text-[#8E8D86]" aria-hidden="true">·</span>
                <span className="text-[#6B6B65] font-medium tabular-nums">
                  {activeTierLabel}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onEditBusiness}
                  className="px-2.5 py-1.5 min-h-[34px] rounded-lg border border-[#E7E6E0] bg-white hover:bg-[#F1F0EB] text-[11px] font-semibold text-[#6B6B65] transition-colors whitespace-nowrap shrink-0"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleCopySavedTemplate}
                  className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                    copiedSavedTemplate
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-white border border-[#E7E6E0] text-[#141413] hover:border-[#D0CFC7]'
                  }`}
                >
                  {copiedSavedTemplate ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[#141413] leading-relaxed bg-white p-3 rounded-xl border border-[#E7E6E0]">
              {resolvedSavedTemplate}
            </p>
          </div>

          {/* Generated Reply Options */}
          {generatedReplies.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-[#E7E6E0]">
              <span className="text-xs font-semibold text-[#141413] block">
                Suggested owner replies ready to paste on Google:
              </span>

              {generatedReplies.map((reply, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#141413]">{reply.title}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyReply(reply.text, idx)}
                      className={`flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                        copiedReplyIndex === idx
                          ? 'bg-[#0F766E] text-white'
                          : 'bg-white border border-[#E7E6E0] text-[#141413] hover:border-[#D0CFC7]'
                      }`}
                    >
                      {copiedReplyIndex === idx ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[#141413] leading-relaxed bg-white p-3 rounded-xl border border-[#E7E6E0]">
                    &ldquo;{reply.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Private Feedback Shield Inbox (1-3 stars) */}
        <div
          className={`${
            mobileMode ? '' : 'lg:col-span-5'
          } bg-white rounded-3xl p-4 sm:p-7 border border-[#E7E6E0] space-y-4`}
        >
          <div className="flex items-center justify-between border-b border-[#E7E6E0] pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-[#FFF1F2] text-[#BE123C]">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-[#141413]">
                  Private Feedback Shield
                </h2>
              </div>
              <p className="text-xs text-[#6B6B65] mt-1">
                1–3 star feedback captured privately before reaching Google.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF1F2] text-[#BE123C] tabular-nums shrink-0">
              {feedbackList.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-0.5">
            {loadingFeedback ? (
              <div className="text-center py-8 text-xs text-[#8E8D86]">
                Loading feedback inbox...
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6B6B65]">
                No private feedback captured yet. All scanned reviews are 4–5 stars!
              </div>
            ) : (
              feedbackList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-[#F2D5D9] bg-[#FFF9FA] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#141413] min-w-0">
                      <span className="text-[#D97706] shrink-0">{'★'.repeat(item.rating)}</span>
                      <span className="truncate">{item.customerName || 'Anonymous Guest'}</span>
                    </div>
                    <span className="text-[11px] text-[#8E8D86] flex items-center gap-1 shrink-0 tabular-nums">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <p className="text-[#141413] leading-relaxed">{item.comments}</p>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((t, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-[#F2D5D9] text-[#9F1239]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {(item.customerEmail || item.customerPhone) && (
                    <div className="pt-2 border-t border-[#F2D5D9]/60 text-[11px] text-[#6B6B65] flex flex-wrap gap-3">
                      {item.customerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#8E8D86]" />
                          <span>{item.customerEmail}</span>
                        </span>
                      )}
                      {item.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#8E8D86]" />
                          <span>{item.customerPhone}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[#6B6B65] font-medium">Status:</span>
                    <div className="flex gap-1">
                      {(['new', 'contacted', 'resolved'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateFeedbackStatus(item.id, st)}
                          className={`px-2.5 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold capitalize transition-all whitespace-nowrap shrink-0 ${
                            item.status === st
                              ? st === 'resolved'
                                ? 'bg-[#0F766E] text-white'
                                : st === 'contacted'
                                ? 'bg-[#141413] text-white'
                                : 'bg-[#BE123C] text-white'
                              : 'bg-white border border-[#E7E6E0] text-[#6B6B65] hover:text-[#141413]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
