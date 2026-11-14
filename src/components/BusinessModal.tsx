import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  X,
  Link,
  MessageSquareHeart,
  RotateCcw,
  Star,
  Plus,
} from 'lucide-react';
import { BusinessProfile, ThankYouTemplates, ThankYouTier } from '../types';
import {
  DEFAULT_BUSINESS_COVER,
  DEFAULT_BUSINESS_LOGO,
  DEFAULT_CATEGORY_PRESETS,
} from '../data/mockData';
import {
  DEFAULT_THANK_YOU_TEMPLATES,
  TEMPLATE_PLACEHOLDERS,
  THANK_YOU_TIERS,
  getBusinessThankYouTemplates,
  resolveThankYouTemplate,
} from '../utils/thankYouTemplates';

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (business: BusinessProfile) => void;
  initialBusiness?: BusinessProfile | null;
  mobileMode?: boolean;
}

export const BusinessModal: React.FC<BusinessModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBusiness,
  mobileMode = false,
}) => {
  const isEditing = Boolean(initialBusiness);

  const [name, setName] = useState(initialBusiness?.name || '');
  const [category, setCategory] = useState(initialBusiness?.category || 'Artisanal Cafe & Bakery');
  const [tagline, setTagline] = useState(initialBusiness?.tagline || '');
  const [address, setAddress] = useState(initialBusiness?.address || '');
  const [city, setCity] = useState(initialBusiness?.city || '');
  const [country, setCountry] = useState(initialBusiness?.country || 'United States');
  const [phone, setPhone] = useState(initialBusiness?.phone || '');
  const [googlePlaceId, setGooglePlaceId] = useState(initialBusiness?.googlePlaceId || '');
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    initialBusiness?.googleReviewUrl || ''
  );
  const [logoUrl, setLogoUrl] = useState(
    initialBusiness?.logoUrl || DEFAULT_BUSINESS_LOGO
  );
  const [coverUrl, setCoverUrl] = useState(
    initialBusiness?.coverUrl || DEFAULT_BUSINESS_COVER
  );
  const [customTags, setCustomTags] = useState<string[]>(
    initialBusiness?.customTags || [
      'Friendly Team',
      'Fast Service',
      'Spotless Atmosphere',
      'Top Quality',
    ]
  );
  const [newTagInput, setNewTagInput] = useState('');
  const [staffMentions, setStaffMentions] = useState<string[]>(
    initialBusiness?.staffMentions || ['Alex', 'Sarah']
  );
  const [newStaffInput, setNewStaffInput] = useState('');
  const [aiPromptGuide, setAiPromptGuide] = useState(
    initialBusiness?.aiReviewPromptGuide || ''
  );

  const [thankYouTemplates, setThankYouTemplates] = useState<ThankYouTemplates>(() =>
    getBusinessThankYouTemplates(initialBusiness)
  );
  const [activeTemplateTier, setActiveTemplateTier] = useState<ThankYouTier>('fiveStar');
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setName(initialBusiness?.name || '');
    setCategory(initialBusiness?.category || 'Artisanal Cafe & Bakery');
    setTagline(initialBusiness?.tagline || '');
    setAddress(initialBusiness?.address || '');
    setCity(initialBusiness?.city || '');
    setCountry(initialBusiness?.country || 'United States');
    setPhone(initialBusiness?.phone || '');
    setGooglePlaceId(initialBusiness?.googlePlaceId || '');
    setGoogleReviewUrl(initialBusiness?.googleReviewUrl || '');
    setLogoUrl(initialBusiness?.logoUrl || DEFAULT_BUSINESS_LOGO);
    setCoverUrl(initialBusiness?.coverUrl || DEFAULT_BUSINESS_COVER);
    setCustomTags(
      initialBusiness?.customTags || [
        'Friendly Team',
        'Fast Service',
        'Spotless Atmosphere',
        'Top Quality',
      ]
    );
    setNewTagInput('');
    setStaffMentions(initialBusiness?.staffMentions || ['Alex', 'Sarah']);
    setNewStaffInput('');
    setAiPromptGuide(initialBusiness?.aiReviewPromptGuide || '');
    setThankYouTemplates(getBusinessThankYouTemplates(initialBusiness));
    setActiveTemplateTier('fiveStar');
  }, [isOpen, initialBusiness]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTagInput.trim() && !customTags.includes(newTagInput.trim())) {
      setCustomTags([...customTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((t) => t !== tagToRemove));
  };

  const handleAddStaff = () => {
    if (newStaffInput.trim() && !staffMentions.includes(newStaffInput.trim())) {
      setStaffMentions([...staffMentions, newStaffInput.trim()]);
      setNewStaffInput('');
    }
  };

  const handleRemoveStaff = (staffToRemove: string) => {
    setStaffMentions(staffMentions.filter((s) => s !== staffToRemove));
  };

  const handleTemplateChange = (value: string) => {
    setThankYouTemplates((prev) => ({
      ...prev,
      [activeTemplateTier]: value,
    }));
  };

  const handleInsertPlaceholder = (token: string) => {
    const textarea = templateTextareaRef.current;
    const currentValue = thankYouTemplates[activeTemplateTier];

    if (!textarea) {
      handleTemplateChange(`${currentValue}${currentValue.endsWith(' ') ? '' : ' '}${token}`);
      return;
    }

    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? currentValue.length;
    const updated =
      currentValue.slice(0, start) + token + currentValue.slice(end);

    handleTemplateChange(updated);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = start + token.length;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleResetTierTemplate = () => {
    setThankYouTemplates((prev) => ({
      ...prev,
      [activeTemplateTier]: DEFAULT_THANK_YOU_TEMPLATES[activeTemplateTier],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const rawReviewInput = googleReviewUrl.trim();
    const fallbackPlace = googlePlaceId.trim() || 'ChIJN1t_tDeuEmsRUsoyG83frY4';
    const generatedReviewUrl = rawReviewInput
      ? rawReviewInput.startsWith('http://') || rawReviewInput.startsWith('https://')
        ? rawReviewInput
        : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(rawReviewInput)}`
      : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(fallbackPlace)}`;

    const sanitizedTemplates: ThankYouTemplates = {
      fiveStar:
        thankYouTemplates.fiveStar.trim() || DEFAULT_THANK_YOU_TEMPLATES.fiveStar,
      fourStar:
        thankYouTemplates.fourStar.trim() || DEFAULT_THANK_YOU_TEMPLATES.fourStar,
      lowStar:
        thankYouTemplates.lowStar.trim() || DEFAULT_THANK_YOU_TEMPLATES.lowStar,
    };

    const businessData: BusinessProfile = {
      id: initialBusiness?.id || `biz-${Date.now()}`,
      name: name.trim(),
      slug: initialBusiness?.slug || slug,
      category,
      tagline: tagline.trim() || `Your favorite local ${category}`,
      address: address.trim() || 'Main Street',
      city: city.trim() || 'Local Area',
      country,
      phone: phone.trim() || '+1 (555) 010-9900',
      website: initialBusiness?.website || 'https://example.com',
      googlePlaceId: googlePlaceId.trim() || 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      googleReviewUrl: generatedReviewUrl,
      logoUrl,
      coverUrl,
      rating: initialBusiness?.rating || 5.0,
      reviewCount: initialBusiness?.reviewCount || 1,
      primaryColor: initialBusiness?.primaryColor || '#0f766e',
      customTags: customTags.length > 0 ? customTags : ['Great Service', 'High Quality'],
      staffMentions,
      aiReviewPromptGuide: aiPromptGuide.trim(),
      thankYouTemplates: sanitizedTemplates,
    };

    onSave(businessData);
    onClose();
  };

  const activeTierMeta =
    THANK_YOU_TIERS.find((t) => t.key === activeTemplateTier) || THANK_YOU_TIERS[0];

  const resolvedPreview = resolveThankYouTemplate({
    business: {
      name: name.trim() || 'Your Business',
      city: city.trim() || 'San Francisco, CA',
    },
    rating: activeTierMeta.sampleRating,
    customerName: 'Jordan',
    overrideTemplate: thankYouTemplates[activeTemplateTier],
  });

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[#141413]/45 backdrop-blur-xs ${
        mobileMode ? 'items-end p-0' : 'items-end sm:items-center p-0 sm:p-4 overflow-y-auto'
      }`}
    >
      <div
        className={`bg-white w-full border border-[#E7E6E0] shadow-2xl p-5 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto ${
          mobileMode
            ? 'max-w-[430px] rounded-t-3xl'
            : 'max-w-2xl rounded-t-3xl sm:rounded-3xl sm:my-8'
        }`}
      >
        <div
          className={`w-10 h-1 bg-[#DCDAD1] rounded-full mx-auto ${
            mobileMode ? 'block' : 'block sm:hidden'
          }`}
        />

        <div className="flex items-center justify-between border-b border-[#E7E6E0] pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#0F766E]" />
            <h2 className="text-base sm:text-lg font-bold text-[#141413]">
              {isEditing ? 'Edit Business Profile' : 'Add Business & Setup QR'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6B6B65] hover:text-[#141413] hover:bg-[#F7F7F4] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Business Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blue Bottle Espresso Bar"
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white font-medium text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              >
                {DEFAULT_CATEGORY_PRESETS.map((p) => (
                  <option key={p.category} value={p.category}>
                    {p.category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
              Short Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Specialty single-origin coffee and handmade brioche"
              className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 520 Market St"
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                City / State
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Austin, TX"
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          {/* Google Maps Integration */}
          <div className="p-4 bg-[#EEF5F3]/75 rounded-2xl border border-[#CBE2DC] space-y-2.5">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-[#0F766E]" />
              <span className="font-bold text-[#0B4F4A]">Google Maps Review Link</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#141413] block mb-1">
                Direct Review URL or Place ID
              </label>
              <input
                type="text"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=..."
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#CBE2DC] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
            <p className="text-[11px] text-[#0B4F4A]/80">
              Opens automatically when customers tap &ldquo;Copy &amp; Open Google Maps&rdquo;.
            </p>
          </div>

          {/* Review Impression Tags */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1.5">
              Customer Impression Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F7F7F4] text-[#141413] border border-[#E7E6E0]"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[#8E8D86] hover:text-[#BE123C]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add custom tag (e.g. Delicious Cold Brew)..."
                className="flex-1 text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 min-h-[42px] bg-[#F1F0EB] hover:bg-[#E7E6E0] text-[#141413] font-semibold rounded-xl whitespace-nowrap shrink-0"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Staff Shoutouts */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1.5">
              Staff Members (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {staffMentions.map((staff) => (
                <span
                  key={staff}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EEF5F3] text-[#0B4F4A] border border-[#CBE2DC]"
                >
                  <span>{staff}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStaff(staff)}
                    className="text-[#0F766E] hover:text-[#BE123C]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStaffInput}
                onChange={(e) => setNewStaffInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStaff();
                  }
                }}
                placeholder="Add staff member name..."
                className="flex-1 text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0]"
              />
              <button
                type="button"
                onClick={handleAddStaff}
                className="px-4 min-h-[42px] bg-[#F1F0EB] hover:bg-[#E7E6E0] text-[#141413] font-semibold rounded-xl whitespace-nowrap shrink-0"
              >
                + Add
              </button>
            </div>
          </div>

          {/* AI Guidance Prompt */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
              Special AI Instructions (Optional)
            </label>
            <input
              type="text"
              value={aiPromptGuide}
              onChange={(e) => setAiPromptGuide(e.target.value)}
              placeholder="e.g. Mention our friendly hospitality and fresh ingredients"
              className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white"
            />
          </div>

          {/* Custom Thank You Response Templates Section */}
          <div className="pt-4 border-t border-[#E7E6E0] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquareHeart className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <h3 className="text-sm font-bold text-[#141413]">
                    Thank You Response Templates
                  </h3>
                </div>
                <p className="text-[11px] text-[#6B6B65] mt-0.5">
                  Shown to visitors after reviewing and available for 1-click replies in your dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetTierTemplate}
                className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F7F7F4] text-[11px] font-semibold text-[#6B6B65] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset {activeTierMeta.shortLabel}</span>
              </button>
            </div>

            {/* 3-Tier Segmented Selector */}
            <div
              role="tablist"
              aria-label="Star rating response template tiers"
              className="grid grid-cols-3 gap-1 p-1 bg-[#F1F0EB] rounded-xl border border-[#E7E6E0]"
            >
              {THANK_YOU_TIERS.map((tier) => {
                const isActive = activeTemplateTier === tier.key;
                return (
                  <button
                    key={tier.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTemplateTier(tier.key)}
                    className={`py-2 px-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#6B6B65] hover:text-[#141413]'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 shrink-0 ${
                        tier.key === 'lowStar'
                          ? isActive
                            ? 'text-[#BE123C] fill-[#BE123C]'
                            : 'text-[#8E8D86]'
                          : isActive
                          ? 'text-[#F59E0B] fill-[#F59E0B]'
                          : 'text-[#8E8D86]'
                      }`}
                    />
                    <span className="tabular-nums">{tier.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-[#6B6B65]">{activeTierMeta.description}</p>

            <div className="space-y-2.5">
              <textarea
                ref={templateTextareaRef}
                rows={3}
                value={thankYouTemplates[activeTemplateTier]}
                onChange={(e) => handleTemplateChange(e.target.value)}
                placeholder={`Write your ${activeTierMeta.label} thank you message...`}
                className="w-full text-xs leading-relaxed p-3 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] font-sans"
              />

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#6B6B65] mr-1">
                  Insert tag:
                </span>
                {TEMPLATE_PLACEHOLDERS.map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => handleInsertPlaceholder(item.token)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#EEF5F3] hover:border-[#CBE2DC] hover:text-[#0B4F4A] text-[11px] font-medium text-[#141413] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3 h-3 text-[#8E8D86]" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B6B65]">
                <span className="font-semibold text-[#141413]">Live Preview</span>
                <span className="tabular-nums">
                  Sample: Jordan · {activeTierMeta.sampleRating}★
                </span>
              </div>
              <p className="text-xs text-[#141413] leading-relaxed">{resolvedPreview}</p>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-[#E7E6E0] flex items-center justify-end gap-2.5 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-[#6B6B65] hover:bg-[#F7F7F4] font-semibold whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {isEditing ? 'Save Changes' : 'Create Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
