import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  Sparkles,
  QrCode,
  Layout,
  Palette,
  Type,
  Info,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { generateQrDataUrl } from '../utils/qrGenerator';

interface PrintStudioProps {
  business: BusinessProfile;
  mobileMode?: boolean;
  onPreviewCustomerScan: () => void;
}

type StandTemplate = 'acrylic-stand' | 'table-tent' | 'window-sticker' | 'receipt-card';

const COLOR_PRESETS = [
  { name: 'Forest Pine', hex: '#0f766e', bg: '#f0fdfa' },
  { name: 'Obsidian Ink', hex: '#141413', bg: '#f7f7f4' },
  { name: 'Google Blue', hex: '#1a73e8', bg: '#f8fafd' },
  { name: 'Warm Terracotta', hex: '#c2410c', bg: '#fff7ed' },
  { name: 'Deep Indigo', hex: '#4338ca', bg: '#eef2ff' },
];

export const PrintStudio: React.FC<PrintStudioProps> = ({
  business,
  mobileMode = false,
  onPreviewCustomerScan,
}) => {
  const [template, setTemplate] = useState<StandTemplate>('acrylic-stand');
  const [headline, setHeadline] = useState<string>('Loved your visit today?');
  const [subheadline, setSubheadline] = useState<string>(
    'Scan to leave a Google Review in 15 seconds with AI'
  );
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showStars, setShowStars] = useState<boolean>(true);
  const [showAiBadge, setShowAiBadge] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  const customerUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?biz=${business.slug}`
      : `https://revio-ai.com/?biz=${business.slug}`;

  useEffect(() => {
    generateQrDataUrl(customerUrl, {
      width: 480,
      margin: 1,
      color: {
        dark: selectedColor.hex,
        light: '#ffffff',
      },
    }).then((url) => setQrDataUrl(url));
  }, [customerUrl, selectedColor]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${business.slug}-qr-code.png`;
    a.click();
  };

  return (
    <div
      className={
        mobileMode
          ? 'px-3.5 py-4 space-y-5'
          : 'max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 md:py-8 space-y-6 md:space-y-8'
      }
    >
      {/* Page Header */}
      <div
        className={`border-b border-[#E7E6E0] pb-4 flex gap-4 ${
          mobileMode
            ? 'flex-col'
            : 'flex-col sm:flex-row sm:items-center sm:justify-between'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#EEF5F3] text-[#0F766E]">
              <QrCode className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#141413] tracking-tight">
              Printable QR Stand Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B65] mt-1">
            Print tabletop displays and stickers for{' '}
            <strong className="text-[#141413] font-semibold">{business.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-semibold rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F7F7F4] text-[#141413] transition-colors whitespace-nowrap shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#0F766E]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-semibold rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F7F7F4] text-[#141413] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[42px] text-xs font-semibold rounded-xl bg-[#141413] hover:bg-[#2A2A27] text-white transition-all whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Stand</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div
        className={`grid gap-6 md:gap-8 items-start ${
          mobileMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* Left Column: Customization Controls */}
        <div
          className={`${
            mobileMode ? '' : 'lg:col-span-5'
          } space-y-5 bg-white p-4 sm:p-6 rounded-3xl border border-[#E7E6E0]`}
        >
          {/* Template Format Selector */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Layout className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>1. Stand Format</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'acrylic-stand' as const, name: 'Acrylic Stand', sub: '4x6" Portrait' },
                { id: 'table-tent' as const, name: 'Table Tent', sub: '5x7" Foldable' },
                { id: 'window-sticker' as const, name: 'Window Decal', sub: 'Square Glass' },
                { id: 'receipt-card' as const, name: 'Check Insert', sub: '3.5x2" Mini' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplate(item.id)}
                  className={`p-3 min-h-[56px] rounded-xl border text-left text-xs transition-all ${
                    template === item.id
                      ? 'border-[#0F766E] bg-[#EEF5F3] text-[#0B4F4A]'
                      : 'border-[#E7E6E0] bg-[#F7F7F4] hover:border-[#D0CFC7] text-[#6B6B65]'
                  }`}
                >
                  <div className="font-semibold text-[#141413]">{item.name}</div>
                  <div className="text-[11px] text-[#6B6B65] mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Palette className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>2. Accent Color</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`flex items-center gap-2 px-3 py-2 min-h-[38px] rounded-xl border text-xs transition-all whitespace-nowrap shrink-0 ${
                    selectedColor.name === c.name
                      ? 'border-[#141413] bg-[#141413] text-white font-medium'
                      : 'border-[#E7E6E0] bg-white hover:bg-[#F7F7F4] text-[#141413]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Messaging */}
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>3. Stand Copy</span>
            </label>
            <div>
              <span className="text-[11px] text-[#6B6B65] font-medium block mb-1">
                Main Headline
              </span>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Loved your visit today?"
                className="w-full text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <span className="text-[11px] text-[#6B6B65] font-medium block mb-1">
                Instruction Subhead
              </span>
              <input
                type="text"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="e.g. Scan to review in 15 seconds with AI"
                className="w-full text-xs min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
          </div>

          {/* Display Elements */}
          <div className="pt-3 border-t border-[#E7E6E0] space-y-2.5">
            <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block">
              Display Elements
            </label>
            <div className="space-y-2 text-xs">
              {[
                { checked: showLogo, toggle: () => setShowLogo(!showLogo), label: 'Include Business Logo' },
                { checked: showStars, toggle: () => setShowStars(!showStars), label: 'Include 5 Google Stars Graphic' },
                { checked: showAiBadge, toggle: () => setShowAiBadge(!showAiBadge), label: 'Include "AI Review Assistant" Note' },
              ].map((opt, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none text-[#141413]"
                >
                  <input
                    type="checkbox"
                    checked={opt.checked}
                    onChange={opt.toggle}
                    className="w-4 h-4 rounded accent-[#0F766E]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E6E0]">
            <button
              type="button"
              onClick={onPreviewCustomerScan}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-[#CBE2DC] bg-[#EEF5F3] hover:bg-[#E1EFEA] text-[#0B4F4A] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              <span>Preview Customer Scan Experience</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Printable Stand Canvas Preview */}
        <div
          className={`${
            mobileMode ? '' : 'lg:col-span-7'
          } flex flex-col items-center`}
        >
          <div className="text-center mb-3">
            <span className="text-[11px] font-semibold text-[#8E8D86] uppercase tracking-wider">
              Live Stand Preview (Print Ready)
            </span>
          </div>

          <div
            id="printable-card"
            ref={printRef}
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-lg border-4 transition-all relative overflow-hidden flex flex-col items-center text-center"
            style={{
              borderColor: selectedColor.hex,
              boxShadow: `0 20px 40px -15px ${selectedColor.hex}22`,
            }}
          >
            {/* Top Google Colors Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 flex">
              <div className="w-1/4 bg-[#4285F4]" />
              <div className="w-1/4 bg-[#EA4335]" />
              <div className="w-1/4 bg-[#FBBC05]" />
              <div className="w-1/4 bg-[#34A853]" />
            </div>

            <div className="mt-2 mb-4 flex flex-col items-center">
              {showLogo && (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-[#E7E6E0] mb-2.5 bg-white"
                />
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-[#141413] tracking-tight leading-snug">
                {business.name}
              </h2>
              <p className="text-xs font-medium text-[#6B6B65] mt-0.5">
                {business.category} · {business.city}
              </p>
            </div>

            {showStars && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex text-[#F59E0B] text-lg sm:text-xl">
                  {'★★★★★'}
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F7F7F4] border border-[#E7E6E0] text-[11px] font-semibold text-[#141413]">
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
                  <span>Google Reviews</span>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3
                className="text-lg sm:text-xl font-bold tracking-tight"
                style={{ color: selectedColor.hex }}
              >
                {headline}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B65] font-medium mt-1 max-w-xs">
                {subheadline}
              </p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#E7E6E0] shadow-xs relative mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Review QR Code"
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                />
              ) : (
                <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center bg-[#F7F7F4] rounded-xl">
                  <QrCode className="w-12 h-12 text-[#8E8D86]" />
                </div>
              )}

              <div
                className="absolute inset-0 m-auto w-9 h-9 rounded-xl bg-white shadow-md border-2 flex items-center justify-center"
                style={{ borderColor: selectedColor.hex }}
              >
                <Sparkles className="w-4 h-4" style={{ color: selectedColor.hex }} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F7F7F4] border border-[#E7E6E0] text-xs font-semibold text-[#141413]">
                <span>Point phone camera &amp; tap link</span>
              </div>

              {showAiBadge && (
                <div className="text-[11px] text-[#8E8D86] flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-[#D97706]" />
                  <span>AI review helper · Multi-language ready</span>
                </div>
              )}
            </div>

            {template === 'table-tent' && (
              <div className="mt-6 pt-4 border-t-2 border-dashed border-[#D8D6CE] w-full text-[10px] text-[#8E8D86] uppercase tracking-widest">
                Fold along this line for counter table tent
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-[#6B6B65] max-w-md bg-white p-3.5 rounded-2xl border border-[#E7E6E0]">
            <Info className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>
              Tip: Standard 4x6&quot; acrylic T-stands keep this print clean on counters.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
