import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  Smartphone,
  CreditCard,
  Settings,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface MobileBottomBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  embedded?: boolean;
}

const TABS: {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'print', label: 'QR', icon: QrCode },
  { id: 'customer', label: 'Scan', icon: Smartphone },
  { id: 'billing', label: 'Plans', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab,
  setActiveTab,
  embedded = false,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className={`no-print bg-white/95 backdrop-blur-md border-t border-[#E7E6E0] pb-safe ${
        embedded
          ? 'sticky bottom-0 z-30 shrink-0 w-full'
          : 'fixed bottom-0 inset-x-0 z-40 md:hidden'
      }`}
    >
      <div className="grid grid-cols-5 h-[60px] max-w-md mx-auto px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xl mx-0.5 my-1 transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-[#0F766E] bg-[#EEF5F3]/75 font-semibold'
                  : 'text-[#6B6B65] hover:text-[#141413] font-medium'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] transition-transform ${
                  isActive ? 'text-[#0F766E]' : 'text-[#6B6B65]'
                }`}
              />
              <span className="text-[11px] leading-none tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
