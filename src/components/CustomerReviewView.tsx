import React, { useState } from 'react';
import {
  Star,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  RotateCw,
  Globe,
  Send,
  AlertCircle,
  ThumbsUp,
  MapPin,
  Heart,
  ChevronDown,
} from 'lucide-react';
import { BusinessProfile, ReviewTone, ReviewLength } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/mockData';
import { resolveThankYouTemplate } from '../utils/thankYouTemplates';
import { submitPrivateFeedbackToFirestore } from '../services/firestoreService';

interface CustomerReviewViewProps {
  business: BusinessProfile;
  isSimulatedMobile?: boolean;
  mobileMode?: boolean;
}

export const CustomerReviewView: React.FC<CustomerReviewViewProps> = ({
  business,
  isSimulatedMobile = false,
  mobileMode = false,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [tone, setTone] = useState<ReviewTone>('Warm & Enthusiastic');
  const [length, setLength] = useState<ReviewLength>('medium');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedReview, setGeneratedReview] = useState<string>('');
  const [variationSeed, setVariationSeed] = useState<number>(0);
  const [draftStale, setDraftStale] = useState<boolean>(false);
  const [draftError, setDraftError] = useState<string>('');
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [reviewCounted, setReviewCounted] = useState<boolean>(false);

  // Private Feedback state for 1-3 stars
  const [privateComments, setPrivateComments] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerContact, setCustomerContact] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [bypassShield, setBypassShield] = useState<boolean>(false);

  // Language dropdown
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);

  React.useEffect(() => {
    setSelectedTags([]);
    setSelectedStaff(null);
    setCustomNotes('');
    setGeneratedReview('');
    setDraftStale(false);
    setDraftError('');
    setFeedbackSent(false);
    setBypassShield(false);
    setReviewCounted(false);
  }, [business.id]);

  const toneOptions: { label: ReviewTone; desc: string }[] = [
    { label: 'Warm & Enthusiastic', desc: 'Friendly & heartfelt' },
    { label: 'Concise & Punchy', desc: 'Short, clean & to the point' },
    { label: 'Local Guide / Foodie', desc: 'Detailed, taste & vibe focus' },
    { label: 'Professional & Detailed', desc: 'Objective & thorough' },
    { label: 'Family-Friendly', desc: 'Warm, welcoming for all ages' },
  ];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    if (generatedReview) setDraftStale(true);
  };

  const handleStaffToggle = (staff: string) => {
    setSelectedStaff(selectedStaff === staff ? null : staff);
    if (generatedReview) setDraftStale(true);
  };

  const handleGenerateReview = async () => {
    setIsGenerating(true);
    setHasCopied(false);
    setDraftError('');
    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);

    try {
      const allTags = [...selectedTags];
      if (selectedStaff) {
        allTags.push(`Special shoutout to ${selectedStaff}`);
      }

      const response = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: business.name,
          businessCategory: business.category,
          businessLocation: `${business.city}, ${business.address}`,
          highlights: business.aiReviewPromptGuide || business.tagline,
          rating,
          selectedTags: allTags,
          customNotes,
          tone,
          length,
          language: selectedLanguage,
          previousDraft: generatedReview,
          variationSeed: nextSeed,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.review) {
        throw new Error(data?.error || 'Could not reach review generator.');
      }

      setGeneratedReview(data.review);
      setDraftStale(false);
    } catch (err: any) {
      console.error('Error generating review:', err);
      setDraftError(err?.message || 'Network hiccup while drafting—created a local draft instead.');
      const highlightsText =
        selectedTags.length > 0
          ? selectedTags.slice(0, 2).join(' and ').toLowerCase()
          : 'the service';
      const noteText = customNotes.trim() ? ` ${customNotes.trim()}.` : '';
      setGeneratedReview(
        rating >= 4
          ? `Had a great visit to ${business.name} in ${business.city}! Really appreciated ${highlightsText}.${noteText} Happy to recommend stopping by.`
          : `Visited ${business.name} recently and rated ${rating} stars.${noteText || ` Highlighted ${highlightsText}, though a few details could be improved.`}`
      );
      setDraftStale(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyWithFallback = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleCopyAndOpenGoogle = async () => {
    if (!generatedReview) return;

    await copyWithFallback(generatedReview);
    setHasCopied(true);
    setReviewCounted(true);

    fetch('/api/analytics/track-copy', { method: 'POST' }).catch(() => {});

    // Trigger native anchor navigation instead of window.open for iframe/mobile safety
    const link = document.createElement('a');
    link.href = business.googleReviewUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setHasCopied(false);
    }, 5000);
  };

  const handleSubmitPrivateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let savedToFirestore = false;
      if (business.ownerId) {
        savedToFirestore = await submitPrivateFeedbackToFirestore(
          business.id,
          business.ownerId,
          {
            rating,
            tags: selectedTags,
            comments: privateComments,
            customerName: customerName || 'Valued Guest',
            customerEmail: customerContact,
          }
        );
      }

      if (!savedToFirestore) {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            rating,
            tags: selectedTags,
            comments: privateComments,
            customerName: customerName || 'Valued Guest',
            customerEmail: customerContact,
          }),
        });
      }
      setFeedbackSent(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setFeedbackSent(true);
    }
  };

  const isLowRating = rating <= 3 && !bypassShield;
  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);

  return (
    <div
      className={`w-full ${
        mobileMode || isSimulatedMobile ? 'max-w-md mx-auto' : 'max-w-lg mx-auto py-4 md:py-6'
      }`}
    >
      <div className="bg-white rounded-3xl border border-[#E7E6E0] shadow-xs overflow-hidden">
        {/* Clean Cover Image & Store Identity */}
        <div className="relative h-36 sm:h-40 bg-[#141413] overflow-hidden">
          <img
            src={business.coverUrl}
            alt={business.name}
            className="w-full h-full object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141413]/85 via-[#141413]/25 to-transparent" />

          {/* Language Switcher */}
          <div className="absolute top-3 right-3 z-10">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full bg-[#141413]/75 backdrop-blur-md text-white border border-white/20 text-xs font-medium hover:bg-[#141413] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>
                  {activeLang?.flag} {activeLang?.nativeName}
                </span>
                <ChevronDown className="w-3 h-3 text-white/70" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 max-h-60 overflow-y-auto rounded-2xl bg-white border border-[#E7E6E0] shadow-xl py-1.5 z-30">
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold text-[#8E8D86] uppercase tracking-wider">
                    Language
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setLangMenuOpen(false);
                        if (generatedReview) setDraftStale(true);
                      }}
                      className={`w-full text-left px-3.5 py-2 min-h-[40px] text-xs flex items-center justify-between hover:bg-[#F7F7F4] transition-colors ${
                        selectedLanguage === lang.code
                          ? 'font-semibold text-[#0F766E] bg-[#EEF5F3]'
                          : 'text-[#141413]'
                      }`}
                    >
                      <span>
                        {lang.flag} {lang.nativeName}
                      </span>
                      <span className="text-[11px] text-[#8E8D86]">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Store Avatar & Title */}
          <div className="absolute bottom-3.5 left-4 right-4 flex items-end gap-3">
            <img
              src={business.logoUrl}
              alt={business.name}
              className="w-13 h-13 rounded-2xl border-2 border-white object-cover bg-white shrink-0"
            />
            <div className="text-white min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight truncate">
                {business.name}
              </h1>
              <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-[#FBBF24] shrink-0" />
                <span className="truncate">{business.city}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Google Trust Summary Bar */}
          <div className="flex items-center justify-between bg-[#F7F7F4] rounded-2xl px-3.5 py-2.5 border border-[#E7E6E0] text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-[#E7E6E0]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-[#141413]">Google Reviews</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B6B65] font-medium tabular-nums">
              <span className="text-[#D97706] font-bold">★ {business.rating}</span>
              <span>({business.reviewCount}+)</span>
            </div>
          </div>

          {/* Star Rating Touch Selector */}
          <div className="text-center space-y-2 py-1">
            <label className="text-sm font-semibold text-[#141413] block">
              {rating >= 4
                ? 'How was your experience today?'
                : 'Help us understand your visit'}
            </label>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(star);
                      setFeedbackSent(false);
                      setGeneratedReview('');
                    }}
                    className="min-w-[46px] min-h-[46px] flex items-center justify-center rounded-xl focus:outline-none transition-transform active:scale-95"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                        isFilled
                          ? 'fill-[#F59E0B] text-[#F59E0B]'
                          : 'fill-[#F1F0EB] text-[#D8D6CE]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#6B6B65] font-medium min-h-[1.25rem]">
              {rating === 5 && 'Outstanding! Ready to share a quick note?'}
              {rating === 4 && 'Great visit! A short review helps our local team.'}
              {rating === 3 && 'Fair. Tell us how we can make your next visit better.'}
              {rating === 2 && 'We fell short today. Share privately with management.'}
              {rating === 1 && 'We are truly sorry. Let management resolve this right away.'}
            </p>
          </div>

          {/* Low Rating Reputation Shield Mode (1 to 3 stars) */}
          {isLowRating ? (
            <div className="bg-[#FFF9FA] border border-[#F2D5D9] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFE4E8] text-[#BE123C] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#881337]">
                    We want to make this right
                  </h3>
                  <p className="text-xs text-[#9F1239] mt-0.5 leading-relaxed">
                    Your note goes straight to management&apos;s private inbox so we can follow up directly.
                  </p>
                </div>
              </div>

              {feedbackSent ? (
                <div className="p-4 bg-[#EEF5F3] border border-[#CBE2DC] rounded-2xl text-center space-y-2">
                  <div className="w-8 h-8 bg-[#0F766E] text-white rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-[#0B4F4A]">
                    Feedback Received
                  </p>
                  <p className="text-xs text-[#0B4F4A] leading-relaxed">
                    {resolveThankYouTemplate({
                      business,
                      rating,
                      customerName,
                    })}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitPrivateFeedback} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#141413] block mb-1">
                      What happened during your visit?
                    </label>
                    <textarea
                      rows={3}
                      value={privateComments}
                      onChange={(e) => setPrivateComments(e.target.value)}
                      placeholder="Let us know what went wrong so we can fix it..."
                      className="w-full text-xs p-3 rounded-xl border border-[#F2D5D9] bg-white focus:outline-none focus:ring-2 focus:ring-[#BE123C]/25 focus:border-[#BE123C]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25"
                    />
                    <input
                      type="text"
                      placeholder="Email or phone"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[48px] py-3 px-4 bg-[#BE123C] hover:bg-[#9F1239] text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Privately to Management</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setBypassShield(true)}
                      className="text-[11px] text-[#6B6B65] underline hover:text-[#141413] py-1"
                    >
                      Prefer to write a public Google review instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* 4 or 5 Star AI Review Assistant Flow */
            <div className="space-y-5">
              {/* Quick Impression Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#141413]">
                    What stood out?
                  </span>
                  <span className="text-[11px] text-[#8E8D86] tabular-nums">
                    {selectedTags.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {business.customTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`text-xs px-3 py-2 min-h-[40px] rounded-xl border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#EEF5F3] border-[#0F766E] text-[#0B4F4A] font-semibold'
                            : 'bg-[#F7F7F4] border-[#E7E6E0] text-[#141413] hover:border-[#D0CFC7]'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                        ) : (
                          <span className="text-[#8E8D86] text-xs leading-none">+</span>
                        )}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Staff Shoutout */}
              {business.staffMentions && business.staffMentions.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-[#141413] block mb-2">
                    Shoutout to staff? (Optional)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {business.staffMentions.map((staff) => {
                      const isSelected = selectedStaff === staff;
                      return (
                        <button
                          key={staff}
                          type="button"
                          onClick={() => handleStaffToggle(staff)}
                          className={`text-xs px-3 py-1.5 min-h-[38px] rounded-full border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#141413] border-[#141413] text-white font-medium'
                              : 'bg-white border-[#E7E6E0] text-[#6B6B65] hover:text-[#141413]'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${isSelected ? 'fill-current' : 'text-[#8E8D86]'}`} />
                          <span>{staff}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Quick Details */}
              <div>
                <label className="text-xs font-semibold text-[#141413] block mb-1.5">
                  Any favorite item or detail? (Optional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => {
                    setCustomNotes(e.target.value);
                    if (generatedReview) setDraftStale(true);
                  }}
                  placeholder="e.g. Fresh croissant, super attentive team"
                  className="w-full text-xs min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>

              {/* Tone & Length Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1.5">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => {
                      setTone(e.target.value as ReviewTone);
                      if (generatedReview) setDraftStale(true);
                    }}
                    className="w-full text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white font-medium text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  >
                    {toneOptions.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1.5">
                    Length
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#F1F0EB] p-1 rounded-xl min-h-[42px] text-xs">
                    {(['short', 'medium', 'long'] as ReviewLength[]).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => {
                          setLength(len);
                          if (generatedReview) setDraftStale(true);
                        }}
                        className={`rounded-lg font-medium capitalize transition-all ${
                          length === len
                            ? 'bg-white text-[#141413] shadow-xs font-semibold'
                            : 'text-[#6B6B65] hover:text-[#141413]'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary AI Draft CTA */}
              {!generatedReview && (
                <button
                  type="button"
                  onClick={handleGenerateReview}
                  disabled={isGenerating}
                  className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.99]"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>
                    {isGenerating
                      ? `Drafting in ${selectedLanguage}...`
                      : 'Draft My Review with AI'}
                  </span>
                </button>
              )}

              {/* Generated Review Box */}
              {generatedReview && (
                <div className="space-y-3 bg-[#F7F7F4] border border-[#E7E6E0] rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#141413] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>Your AI Review Draft</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateReview}
                      disabled={isGenerating}
                      className={`text-xs flex items-center gap-1 font-semibold px-3 py-1.5 min-h-[34px] rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                        draftStale
                          ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                          : 'bg-white border border-[#E7E6E0] text-[#141413] hover:bg-[#F1F0EB]'
                      }`}
                    >
                      <RotateCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>
                        {isGenerating
                          ? 'Drafting...'
                          : draftStale
                          ? 'Update Draft'
                          : 'Regenerate'}
                      </span>
                    </button>
                  </div>

                  {draftError && (
                    <div className="text-[11px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-3 py-2">
                      {draftError}
                    </div>
                  )}

                  {draftStale && !isGenerating && (
                    <div className="text-[11px] text-[#92400E] bg-white border border-[#FDE68A] rounded-xl px-3 py-2">
                      Selections changed — tap Update Draft to refresh.
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={generatedReview}
                    onChange={(e) => setGeneratedReview(e.target.value)}
                    className="w-full text-xs leading-relaxed p-3 rounded-xl border border-[#E7E6E0] bg-white text-[#141413] font-sans focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    placeholder="Review text..."
                  />

                  <p className="text-[11px] text-[#6B6B65]">
                    Feel free to edit any word above before posting.
                  </p>

                  {/* Copy & Open Google Maps CTA */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyAndOpenGoogle}
                      className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#141413] hover:bg-[#2A2A27] text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-4 h-4 text-[#6EE7B7]" />
                          <span>Copied! Opening Google Maps...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy &amp; Open Google Maps</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-[#6B6B65] text-center">
                      Copies text to clipboard, then paste and tap &ldquo;Post&rdquo; on{' '}
                      <a
                        href={business.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-[#0F766E] font-medium"
                      >
                        Google Maps
                      </a>
                      .
                    </p>
                  </div>

                  {reviewCounted && (
                    <div className="p-3.5 bg-[#EEF5F3] border border-[#CBE2DC] rounded-xl flex items-start gap-2.5 text-xs text-[#0B4F4A] font-medium">
                      <ThumbsUp className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        {resolveThankYouTemplate({
                          business,
                          rating,
                          customerName,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Minimal Footer */}
          <div className="pt-3 border-t border-[#E7E6E0] flex items-center justify-between text-[11px] text-[#8E8D86]">
            <span>Powered by Revio AI</span>
            <span>Verified Google Maps Link</span>
          </div>
        </div>
      </div>
    </div>
  );
};
