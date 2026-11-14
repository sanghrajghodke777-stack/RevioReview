import React from 'react';
import {
  Sparkles,
  QrCode,
  Smartphone,
  LayoutDashboard,
  CreditCard,
  Settings,
  Building2,
  ChevronDown,
  Plus,
  ExternalLink,
  Monitor,
} from 'lucide-react';
import { ActiveTab, BusinessProfile, UserRole } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  businesses: BusinessProfile[];
  currentBusiness: BusinessProfile;
  onSelectBusiness: (business: BusinessProfile) => void;
  onAddNewBusiness: () => void;
  mobileMode: boolean;
  onToggleMobileMode: () => void;
  onBackToLanding?: () => void;
  userRole?: UserRole;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  businesses,
  currentBusiness,
  onSelectBusiness,
  onAddNewBusiness,
  mobileMode,
  onToggleMobileMode,
  onBackToLanding,
  userRole,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E6E0] ${
        mobileMode ? 'shrink-0' : ''
      }`}
    >
      <div className={mobileMode ? 'px-3.5' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        <div
          className={`flex items-center justify-between gap-2 ${
            mobileMode ? 'h-[52px]' : 'h-[52px] md:h-16'
          }`}
        >
          {/* Left: Brand Wordmark & Business Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => (onBackToLanding ? onBackToLanding() : setActiveTab('dashboard'))}
              title="Back to Main Page"
              className="flex items-center gap-2 text-left group focus:outline-none shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-[#0F766E] flex items-center justify-center text-white transition-transform group-hover:scale-105">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span
                className={`font-bold text-[#141413] tracking-tight text-base leading-none whitespace-nowrap ${
                  mobileMode ? 'hidden min-[380px]:inline' : 'inline'
                }`}
              >
                Revio AI
              </span>
            </button>

            {/* Business Selector Dropdown */}
            <div className="relative min-w-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] hover:bg-[#F1F0EB] transition-colors text-xs font-medium text-[#141413] max-w-[155px] sm:max-w-[195px]"
              >
                <Building2 className="w-3.5 h-3.5 text-[#6B6B65] shrink-0" />
                <span className="truncate">{currentBusiness.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8E8D86] shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-white border border-[#E7E6E0] shadow-xl py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-[#E7E6E0] text-[11px] uppercase tracking-wider font-semibold text-[#8E8D86]">
                    Your Businesses
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {businesses.map((biz) => (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          onSelectBusiness(biz);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F7F4] transition-colors min-h-[44px] ${
                          biz.id === currentBusiness.id
                            ? 'bg-[#EEF5F3] font-semibold text-[#0B4F4A]'
                            : 'text-[#141413]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate">{biz.name}</p>
                          <p className="text-[11px] text-[#6B6B65] font-normal truncate">
                            {biz.category} · {biz.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#D97706] tabular-nums shrink-0">
                          <span>★</span>
                          <span>{biz.rating}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-[#E7E6E0]">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onAddNewBusiness();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 min-h-[40px] py-2 px-3 rounded-xl text-xs font-semibold bg-[#141413] text-white hover:bg-[#2A2A27] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Business</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          {!mobileMode && (
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-1 bg-[#F1F0EB] p-1 rounded-xl border border-[#E7E6E0]"
            >
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-[#141413] shadow-xs font-semibold'
                    : 'text-[#6B6B65] hover:text-[#141413] font-medium'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'print'
                    ? 'bg-white text-[#141413] shadow-xs font-semibold'
                    : 'text-[#6B6B65] hover:text-[#141413] font-medium'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Stand</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'customer'
                    ? 'bg-white text-[#0F766E] shadow-xs font-semibold'
                    : 'text-[#6B6B65] hover:text-[#141413] font-medium'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Scan View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'billing'
                    ? 'bg-white text-[#141413] shadow-xs font-semibold'
                    : 'text-[#6B6B65] hover:text-[#141413] font-medium'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Plans</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-white text-[#0F766E] shadow-xs font-semibold'
                    : 'text-[#6B6B65] hover:text-[#141413] font-medium'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{userRole === 'creator' ? 'Settings · Partner' : 'Settings'}</span>
              </button>
            </nav>
          )}

          {/* Right: Mobile Mode Switcher & Live Google Maps Link */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleMobileMode}
              title={mobileMode ? 'Switch back to Desktop layout' : 'Switch to Mobile-Friendly Mode'}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                mobileMode
                  ? 'border-[#0F766E] bg-[#EEF5F3] text-[#0B4F4A]'
                  : 'border-[#E7E6E0] bg-white hover:bg-[#F7F7F4] text-[#141413]'
              }`}
            >
              {mobileMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Desktop</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Mobile Mode</span>
                </>
              )}
            </button>

            <a
              href={currentBusiness.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Google Maps Review Page"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] text-[#0F766E]"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
