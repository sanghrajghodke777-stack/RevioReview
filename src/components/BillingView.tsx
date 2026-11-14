import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Globe,
  Sparkles,
  Shield,
  Receipt,
  Download,
  Lock,
  TrendingUp,
  Check,
  X,
} from 'lucide-react';
import { CurrencyConfig } from '../types';
import { SUPPORTED_CURRENCIES } from '../data/mockData';

interface BillingViewProps {
  businessName: string;
  mobileMode?: boolean;
}

export const BillingView: React.FC<BillingViewProps> = ({
  businessName,
  mobileMode = false,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(
    SUPPORTED_CURRENCIES[0]
  );
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [downloadedInvoiceId, setDownloadedInvoiceId] = useState<string | null>(null);

  const [cardName, setCardName] = useState<string>('Alex Morgan');
  const [cardNumber, setCardNumber] = useState<string>('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('08/29');
  const [cardCvc, setCardCvc] = useState<string>('888');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string>('');

  const invoices = [
    {
      id: 'INV-2026-001',
      date: 'Oct 12, 2026',
      description: 'One-Time Setup Fee & Printable Stand Artwork',
      amount: `${selectedCurrency.symbol}${selectedCurrency.setupFee}`,
      status: 'Paid',
    },
    {
      id: 'INV-2026-002',
      date: 'Nov 01, 2026',
      description: 'Monthly Cloud & AI Review Maintenance',
      amount: `${selectedCurrency.symbol}${selectedCurrency.monthlyFee}`,
      status: 'Paid',
    },
  ];

  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentSuccessMsg('Payment method updated successfully.');
      setTimeout(() => {
        setPaymentSuccessMsg('');
        setShowPaymentModal(false);
      }, 1500);
    }, 800);
  };

  const handleDownloadReceipt = (invoiceId: string) => {
    setDownloadedInvoiceId(invoiceId);
    setTimeout(() => setDownloadedInvoiceId(null), 2500);
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
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#141413] tracking-tight">
              Subscription &amp; Pricing
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B65] mt-1">
            Transparent pricing for <strong className="text-[#141413]">{businessName}</strong> in the USA and worldwide.
          </p>
        </div>

        {/* Multi-Currency Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#6B6B65] flex items-center gap-1.5 shrink-0">
            <Globe className="w-3.5 h-3.5 text-[#8E8D86]" />
            <span>Currency:</span>
          </label>
          <select
            value={selectedCurrency.code}
            onChange={(e) => {
              const found = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value);
              if (found) setSelectedCurrency(found);
            }}
            className="text-xs font-semibold min-h-[40px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.countryName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pricing Tier Card + ROI */}
      <div
        className={`grid gap-5 md:gap-8 items-stretch ${
          mobileMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* Main Plan Card */}
        <div
          className={`${
            mobileMode ? '' : 'lg:col-span-8'
          } bg-white rounded-3xl p-5 sm:p-8 border border-[#E7E6E0] space-y-6`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF5F3] text-[#0B4F4A]">
                <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>All-Inclusive Business Plan</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#141413] tracking-tight">
                Revio AI Review Engine
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6B65] max-w-lg leading-relaxed">
                Printable QR counter stands, multi-language AI review drafting, and private reputation shield.
              </p>
            </div>

            {/* Price Summary Box */}
            <div className="bg-[#F7F7F4] p-4 rounded-2xl border border-[#E7E6E0] sm:text-right sm:min-w-[175px] shrink-0">
              <div className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider">
                Monthly Fee
              </div>
              <div className="flex items-baseline sm:justify-end gap-1 mt-0.5 tabular-nums">
                <span className="text-3xl font-bold text-[#141413]">
                  {selectedCurrency.symbol}
                  {selectedCurrency.monthlyFee}
                </span>
                <span className="text-xs font-medium text-[#6B6B65]">/mo</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[#E7E6E0] text-xs text-[#6B6B65] tabular-nums">
                Setup fee:{' '}
                <strong className="text-[#141413]">
                  {selectedCurrency.symbol}
                  {selectedCurrency.setupFee}
                </strong>{' '}
                one-time
              </div>
            </div>
          </div>

          {/* Key Inclusions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {[
              {
                title: `One-Time Setup (${selectedCurrency.symbol}${selectedCurrency.setupFee})`,
                desc: 'Printable QR stand templates, Google Place ID verification, and custom profile configuration.',
              },
              {
                title: `Low Maintenance (${selectedCurrency.symbol}${selectedCurrency.monthlyFee}/month)`,
                desc: 'Unlimited AI customer review drafts, continuous cloud QR routing, zero server upkeep.',
              },
              {
                title: '11+ Languages Built In',
                desc: 'Tourists and locals draft authentic reviews in English, Spanish, French, Hindi, Japanese, and more.',
              },
              {
                title: 'Reputation Shield Inbox',
                desc: 'Routes 1–3 star feedback privately to management so issues are resolved directly.',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#141413]">{item.title}</h4>
                  <p className="text-xs text-[#6B6B65] mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Current Status Banner */}
          <div className="p-4 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#141413]">
                  Subscription Status: Active
                </div>
                <p className="text-xs text-[#6B6B65] mt-0.5 tabular-nums">
                  Setup Paid · Next charge ({selectedCurrency.symbol}
                  {selectedCurrency.monthlyFee}) on Dec 01, 2026
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2.5 min-h-[44px] md:min-h-[38px] text-xs font-semibold rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F1F0EB] text-[#141413] transition-colors whitespace-nowrap shrink-0"
            >
              Update Payment Method
            </button>
          </div>
        </div>

        {/* Right Column: Value Summary */}
        <div
          className={`${
            mobileMode ? '' : 'lg:col-span-4'
          } bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E6E0] space-y-5 flex flex-col justify-between`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#EEF5F3] text-[#0F766E]">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[#141413]">
                Why It Costs Only {selectedCurrency.symbol}
                {selectedCurrency.monthlyFee}/Month
              </h3>
            </div>

            <p className="text-xs text-[#6B6B65] leading-relaxed">
              Most review tools charge $50–$150/month. Revio keeps local storefronts affordable with a flat {selectedCurrency.symbol}
              {selectedCurrency.setupFee} setup and tiny monthly hosting.
            </p>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-[#F7F7F4] border border-[#E7E6E0] text-xs space-y-1">
                <span className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider">
                  Avg Value of 1 Google Review
                </span>
                <p className="font-bold text-[#141413] text-base tabular-nums">
                  +$150 – $300 in new visits
                </p>
                <p className="text-xs text-[#6B6B65]">
                  Recent, frequent reviews boost your Google Maps local pack ranking.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#EEF5F3] border border-[#CBE2DC] text-xs space-y-1">
                <span className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wider">
                  Your Monthly Maintenance
                </span>
                <p className="font-bold text-[#0B4F4A] text-base tabular-nums">
                  {selectedCurrency.symbol}
                  {selectedCurrency.monthlyFee} / month
                </p>
                <p className="text-xs text-[#0B4F4A]/85">
                  Cancel anytime with zero lock-in contracts.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E6E0] flex items-center justify-between text-xs text-[#8E8D86]">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Encrypted Billing</span>
            </span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Invoices & Receipts */}
      <div className="bg-white rounded-3xl p-4 sm:p-7 border border-[#E7E6E0] space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E6E0] pb-4 gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#6B6B65]" />
            <h3 className="text-sm font-bold text-[#141413]">
              Billing History &amp; Receipts
            </h3>
          </div>
          {downloadedInvoiceId ? (
            <span className="text-xs font-semibold text-[#0F766E]">
              Receipt {downloadedInvoiceId} saved
            </span>
          ) : (
            <span className="text-xs text-[#8E8D86]">Paid in full</span>
          )}
        </div>

        {/* Mobile / Mobile Mode Stacked Invoice Cards */}
        <div className={mobileMode ? 'space-y-3' : 'space-y-3 md:hidden'}>
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-3.5 rounded-2xl border border-[#E7E6E0] bg-[#F7F7F4] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-[#141413]">{inv.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF5F3] text-[#0F766E]">
                  {inv.status}
                </span>
              </div>
              <p className="text-[#141413] font-medium">{inv.description}</p>
              <div className="flex items-center justify-between pt-1 border-t border-[#E7E6E0]">
                <div className="text-[#6B6B65] tabular-nums">
                  {inv.date} · <strong className="text-[#141413]">{inv.amount}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(inv.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-xl border border-[#E7E6E0] bg-white text-xs font-semibold text-[#141413]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        {!mobileMode && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E6E0] text-[#8E8D86] font-medium">
                  <th className="pb-3 font-semibold">Invoice ID</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E6E0] text-[#141413]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F7F7F4]/70">
                    <td className="py-3.5 font-mono font-medium">{inv.id}</td>
                    <td className="py-3.5 text-[#6B6B65] tabular-nums">{inv.date}</td>
                    <td className="py-3.5 font-medium">{inv.description}</td>
                    <td className="py-3.5 font-bold tabular-nums">{inv.amount}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF5F3] text-[#0F766E]">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(inv.id)}
                        className="p-2 rounded-xl text-[#6B6B65] hover:text-[#141413] hover:bg-[#F1F0EB] transition-colors"
                        title="Download Receipt"
                      >
                        <Download className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Method Modal (Bottom Sheet on mobile / Mobile Mode) */}
      {showPaymentModal && (
        <div
          className={`fixed inset-0 z-50 flex justify-center bg-[#141413]/45 backdrop-blur-xs ${
            mobileMode ? 'items-end p-0' : 'items-end sm:items-center p-0 sm:p-4'
          }`}
        >
          <div
            className={`bg-white w-full border border-[#E7E6E0] shadow-2xl p-5 sm:p-7 space-y-5 ${
              mobileMode
                ? 'max-w-[430px] rounded-t-3xl'
                : 'max-w-md rounded-t-3xl sm:rounded-3xl'
            }`}
          >
            <div
              className={`w-10 h-1 bg-[#DCDAD1] rounded-full mx-auto ${
                mobileMode ? 'block' : 'block sm:hidden'
              }`}
            />

            <div className="flex items-center justify-between border-b border-[#E7E6E0] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0F766E]" />
                <h3 className="text-base font-bold text-[#141413]">
                  Update Payment Method
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6B6B65] hover:text-[#141413] hover:bg-[#F7F7F4]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentSuccessMsg ? (
              <div className="p-5 bg-[#EEF5F3] border border-[#CBE2DC] rounded-2xl text-center space-y-2">
                <Check className="w-6 h-6 text-[#0F766E] mx-auto" />
                <p className="text-xs font-bold text-[#0B4F4A]">{paymentSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSavePaymentMethod} className="space-y-4">
                <div className="p-3 bg-[#F7F7F4] rounded-xl border border-[#E7E6E0] text-xs text-[#6B6B65]">
                  Billed in <strong className="text-[#141413]">{selectedCurrency.countryName}</strong>:{' '}
                  <strong className="text-[#141413] tabular-nums">
                    {selectedCurrency.symbol}
                    {selectedCurrency.monthlyFee}/month
                  </strong>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                    className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                    placeholder="4242 4242 4242 4242"
                    className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                      placeholder="12/28"
                      className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      required
                      maxLength={4}
                      placeholder="•••"
                      className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl text-[#6B6B65] hover:bg-[#F7F7F4] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="px-5 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white transition-colors disabled:opacity-60"
                  >
                    {isProcessingPayment ? 'Saving...' : 'Save Payment Details'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
