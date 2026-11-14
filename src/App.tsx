import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Maximize2,
  Minimize2,
  ArrowLeft,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { LandingPage } from './components/LandingPage';
import { AuthView } from './components/AuthView';
import { SettingsView } from './components/SettingsView';
import { CustomerReviewView } from './components/CustomerReviewView';
import { PrintStudio } from './components/PrintStudio';
import { OwnerDashboard } from './components/OwnerDashboard';
import { BillingView } from './components/BillingView';
import { BusinessModal } from './components/BusinessModal';
import { BusinessProfile, ActiveTab, UserAccount, UserRole } from './types';
import {
  DEFAULT_BUSINESS_COVER,
  DEFAULT_BUSINESS_LOGO,
  INITIAL_BUSINESSES,
} from './data/mockData';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  getPublicBusinessBySlug,
  saveBusinessToFirestore,
  subscribeUserBusinesses,
  syncFirebaseUserProfile,
} from './services/firestoreService';

type PageScreen = 'landing' | 'auth' | 'app' | 'guest-scan';

export default function App() {
  const urlParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const scannedBizSlug = urlParams?.get('biz') || '';
  const urlReferralCode = (urlParams?.get('ref') || '').toUpperCase();

  const [businesses, setBusinesses] = useState<BusinessProfile[]>(() => {
    const saved = localStorage.getItem('revio_businesses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_BUSINESSES;
  });

  const [currentBusiness, setCurrentBusiness] = useState<BusinessProfile>(() => {
    if (scannedBizSlug) {
      const found = businesses.find((b) => b.slug === scannedBizSlug);
      if (found) return found;
    }
    return businesses[0];
  });

  // Auth State
  const [authToken, setAuthToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('revio_auth_token') || '';
    }
    return '';
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(Boolean(authToken));

  // Page Navigation State (Landing -> Auth -> App, with direct QR scan bypass)
  const [pageScreen, setPageScreen] = useState<PageScreen>(() => {
    if (scannedBizSlug) return 'guest-scan';
    if (urlReferralCode) return 'landing';
    if (typeof window !== 'undefined' && localStorage.getItem('revio_auth_token')) {
      return 'app';
    }
    return 'landing';
  });
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [authPreferredRole, setAuthPreferredRole] = useState<UserRole>('owner');

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (scannedBizSlug) return 'customer';
    return 'dashboard';
  });

  const [mobileMode, setMobileMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('revio_mobile_mode') === 'true';
    }
    return false;
  });

  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessProfile | null>(null);

  // Validate stored session token & Firebase Auth state on boot
  useEffect(() => {
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      if (fbUser) {
        try {
          const { user } = await syncFirebaseUserProfile(fbUser);
          if (!active) return;
          localStorage.setItem('revio_auth_token', 'firebase');
          setAuthToken('firebase');
          setCurrentUser(user);
        } catch {
          // Keep current state if offline
        } finally {
          if (active) setCheckingSession(false);
        }
        return;
      }

      // If no Firebase user, check Express session token if present
      const storedToken = localStorage.getItem('revio_auth_token') || '';
      if (!storedToken || storedToken === 'firebase') {
        if (storedToken === 'firebase') {
          localStorage.removeItem('revio_auth_token');
          setAuthToken('');
          setCurrentUser(null);
          setPageScreen((prev) => (prev === 'app' ? 'landing' : prev));
        }
        if (active) setCheckingSession(false);
        return;
      }

      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!active) return;
          if (data.success && data.user) {
            setCurrentUser(data.user);
          } else {
            localStorage.removeItem('revio_auth_token');
            setAuthToken('');
            setCurrentUser(null);
            setPageScreen((prev) => (prev === 'app' ? 'landing' : prev));
          }
        })
        .catch(() => {
          if (!active) return;
          localStorage.removeItem('revio_auth_token');
          setAuthToken('');
          setPageScreen((prev) => (prev === 'app' ? 'landing' : prev));
        })
        .finally(() => {
          if (active) setCheckingSession(false);
        });
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, []);

  // Subscribe to Cloud Firestore businesses when signed in with Firebase
  useEffect(() => {
    if (authToken !== 'firebase' || !currentUser) return;
    const unsubscribe = subscribeUserBusinesses(currentUser.id, (items) => {
      if (items.length > 0) {
        setBusinesses(items);
        setCurrentBusiness((prev) => {
          const matching = items.find((b) => b.id === prev.id);
          return matching || items[0];
        });
      }
    });
    return () => unsubscribe();
  }, [authToken, currentUser?.id]);

  // Load public business storefront from Firestore if QR code scanned via ?biz=slug
  useEffect(() => {
    if (!scannedBizSlug) return;
    getPublicBusinessBySlug(scannedBizSlug)
      .then((found) => {
        if (found) {
          setCurrentBusiness(found);
        }
      })
      .catch(() => {
        // Fallback to local match
      });
  }, [scannedBizSlug]);

  useEffect(() => {
    localStorage.setItem('revio_businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('revio_mobile_mode', String(mobileMode));
  }, [mobileMode]);

  const handleOpenAuth = (mode: 'signin' | 'signup', preferredRole: UserRole = 'owner') => {
    setAuthMode(mode);
    setAuthPreferredRole(preferredRole);
    setPageScreen('auth');
  };

  const handleAuthSuccess = (
    user: UserAccount,
    token: string,
    createdBusinessInfo?: { name: string; city: string }
  ) => {
    localStorage.setItem('revio_auth_token', token);
    setAuthToken(token);
    setCurrentUser(user);

    if (createdBusinessInfo && createdBusinessInfo.name) {
      const slug = createdBusinessInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const newBiz: BusinessProfile = {
        id: `biz-${Date.now()}`,
        name: createdBusinessInfo.name,
        slug: slug || `biz-${Date.now()}`,
        category: 'Local Business',
        tagline: `Official Google Maps reviews for ${createdBusinessInfo.name}`,
        address: 'Main Street',
        city: createdBusinessInfo.city,
        country: 'United States',
        phone: '+1 (555) 010-1200',
        website: 'https://example.com',
        googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
        logoUrl: DEFAULT_BUSINESS_LOGO,
        coverUrl: DEFAULT_BUSINESS_COVER,
        rating: 5.0,
        reviewCount: 1,
        primaryColor: '#0f766e',
        customTags: ['Friendly Team', 'Fast Service', 'Spotless Atmosphere', 'Top Quality'],
        staffMentions: ['Manager', 'Team'],
      };
      setBusinesses((prev) => [newBiz, ...prev]);
      setCurrentBusiness(newBiz);
    }

    // Take Creator Partners directly into Settings -> Affiliate Partner Program, and Owners to Dashboard
    setActiveTab(user.role === 'creator' ? 'settings' : 'dashboard');
    setPageScreen('app');
  };

  const handleLogout = async () => {
    if (authToken === 'firebase') {
      await signOut(auth).catch(() => {});
    }
    localStorage.removeItem('revio_auth_token');
    setAuthToken('');
    setCurrentUser(null);
    setPageScreen('landing');
  };

  const handleSelectBusiness = (business: BusinessProfile) => {
    setCurrentBusiness(business);
  };

  const handleSaveBusiness = async (updated: BusinessProfile) => {
    const exists = businesses.some((b) => b.id === updated.id);
    let newBusinesses: BusinessProfile[];
    if (exists) {
      newBusinesses = businesses.map((b) => (b.id === updated.id ? updated : b));
    } else {
      newBusinesses = [updated, ...businesses];
    }
    setBusinesses(newBusinesses);
    setCurrentBusiness(updated);

    if (authToken === 'firebase' && currentUser) {
      try {
        const saved = await saveBusinessToFirestore(currentUser.id, updated);
        setBusinesses((prev) => {
          const filtered = prev.filter((b) => b.id !== updated.id && b.id !== saved.id);
          return [saved, ...filtered];
        });
        setCurrentBusiness(saved);
      } catch (err) {
        console.error('Failed to sync business to Firestore:', err);
      }
    }
  };

  const handleAddReferredBusinessToWorkspace = async (newBiz: BusinessProfile) => {
    setBusinesses((prev) => [newBiz, ...prev]);
    setCurrentBusiness(newBiz);

    if (authToken === 'firebase' && currentUser) {
      try {
        const saved = await saveBusinessToFirestore(currentUser.id, newBiz);
        setBusinesses((prev) => prev.map((b) => (b.id === newBiz.id ? saved : b)));
        setCurrentBusiness(saved);
      } catch (err) {
        console.error('Failed to save referred business to Firestore:', err);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingBusiness(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = () => {
    setEditingBusiness(currentBusiness);
    setIsModalOpen(true);
  };

  // 1. Direct Guest QR Scan Mode (No login required when scanning a printed stand or trying live scan)
  if (pageScreen === 'guest-scan') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#141413]">
        {!scannedBizSlug && (
          <header className="bg-white/95 backdrop-blur-md border-b border-[#E7E6E0] h-14 px-4 sm:px-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPageScreen(currentUser ? 'app' : 'landing')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6B65] hover:text-[#141413]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentUser ? 'Back to Workspace' : 'Back to Overview'}</span>
            </button>
            <span className="text-xs font-semibold text-[#0F766E]">
              Live Customer QR Preview
            </span>
            <button
              type="button"
              onClick={() => handleOpenAuth('signup', 'owner')}
              className="px-3 py-1.5 rounded-xl bg-[#0F766E] text-white text-xs font-semibold"
            >
              Get This For My Shop
            </button>
          </header>
        )}
        <main className="flex-1 px-3 py-5">
          <CustomerReviewView business={currentBusiness} isSimulatedMobile={false} />
        </main>
      </div>
    );
  }

  // 2. Main Overview / Landing Page (First screen explaining the whole platform)
  if (pageScreen === 'landing') {
    return (
      <LandingPage
        referredByCode={urlReferralCode}
        onOpenAuth={handleOpenAuth}
        onTryCustomerDemo={() => setPageScreen('guest-scan')}
      />
    );
  }

  // 3. Login & Sign Up Page
  if (pageScreen === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        initialRole={authPreferredRole}
        referredByCode={urlReferralCode}
        onBackToLanding={() => setPageScreen('landing')}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // Brief session check state
  if (checkingSession && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] text-xs font-medium text-[#6B6B65]">
        Loading your Revio AI workspace...
      </div>
    );
  }

  // Fallback if unauthenticated tries to enter app directly
  if (!currentUser) {
    return (
      <LandingPage
        referredByCode={urlReferralCode}
        onOpenAuth={handleOpenAuth}
        onTryCustomerDemo={() => setPageScreen('guest-scan')}
      />
    );
  }

  const renderActiveContent = () => (
    <>
      {/* Customer Review View (Live Mobile Target) */}
      {activeTab === 'customer' && (
        <div className={mobileMode ? 'px-3 py-4' : 'py-4 md:py-6 px-3 sm:px-4'}>
          {!mobileMode && (
            <div className="hidden md:flex max-w-xl mx-auto mb-6 bg-white border border-[#E7E6E0] text-[#141413] rounded-2xl p-3.5 items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#EEF5F3] text-[#0F766E] flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#141413]">
                    Live Customer QR Destination
                  </div>
                  <p className="text-[11px] text-[#6B6B65] truncate">
                    Exact view store visitors open when scanning your tabletop QR stand.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPhoneFrame(!isPhoneFrame)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] hover:bg-[#F1F0EB] text-[#141413] transition-colors font-medium text-xs whitespace-nowrap shrink-0"
                >
                  {isPhoneFrame ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Full View</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Phone Frame</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white transition-colors font-semibold text-xs whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              </div>
            </div>
          )}

          {!mobileMode && isPhoneFrame ? (
            <div className="hidden md:block max-w-[412px] mx-auto my-2 p-2.5 bg-[#1C1C1A] rounded-[44px] shadow-2xl border border-[#32322F] relative">
              <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2C2C29]" />
                <div className="w-2 h-2 rounded-full bg-[#0F766E]/60" />
              </div>

              <div className="bg-[#F7F7F4] rounded-[34px] overflow-hidden min-h-[660px] px-2 py-2">
                <CustomerReviewView
                  business={currentBusiness}
                  isSimulatedMobile={true}
                  mobileMode={true}
                />
              </div>

              <div className="w-28 h-1 bg-[#3C3C39] rounded-full mx-auto mt-2.5" />
            </div>
          ) : null}

          <div className={!mobileMode && isPhoneFrame ? 'md:hidden' : 'block'}>
            <CustomerReviewView
              business={currentBusiness}
              isSimulatedMobile={mobileMode}
              mobileMode={mobileMode}
            />
          </div>
        </div>
      )}

      {/* Printable QR Code Stand Studio */}
      {activeTab === 'print' && (
        <PrintStudio
          business={currentBusiness}
          mobileMode={mobileMode}
          onPreviewCustomerScan={() => {
            setActiveTab('customer');
            setIsPhoneFrame(true);
          }}
        />
      )}

      {/* Business Owner Dashboard */}
      {activeTab === 'dashboard' && (
        <OwnerDashboard
          business={currentBusiness}
          mobileMode={mobileMode}
          onEditBusiness={handleOpenEditModal}
          onGoToPrintStudio={() => setActiveTab('print')}
          onGoToCustomerView={() => {
            setActiveTab('customer');
            setIsPhoneFrame(true);
          }}
        />
      )}

      {/* Pricing & Billing System */}
      {activeTab === 'billing' && (
        <BillingView businessName={currentBusiness.name} mobileMode={mobileMode} />
      )}

      {/* Settings & Creator Affiliate Partner Program */}
      {activeTab === 'settings' && (
        <SettingsView
          user={currentUser}
          token={authToken}
          mobileMode={mobileMode}
          onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
          onLogout={handleLogout}
          onAddBusinessToWorkspace={handleAddReferredBusinessToWorkspace}
          onOpenCustomerDemo={() => {
            setActiveTab('customer');
            setIsPhoneFrame(true);
          }}
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#141413] font-sans">
      {mobileMode ? (
        <div className="flex-1 flex flex-col md:items-center md:justify-center md:py-6 md:px-4">
          <div className="w-full flex-1 md:flex-none md:w-[416px] md:h-[min(840px,calc(100vh-3rem))] bg-[#F7F7F4] md:rounded-[34px] md:border md:border-[#DFDDD4] md:shadow-[0_24px_60px_-15px_rgba(20,20,19,0.14)] flex flex-col overflow-hidden">
            <Navbar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              businesses={businesses}
              currentBusiness={currentBusiness}
              onSelectBusiness={handleSelectBusiness}
              onAddNewBusiness={handleOpenAddModal}
              mobileMode={true}
              onToggleMobileMode={() => setMobileMode(false)}
              onBackToLanding={() => setPageScreen('landing')}
              userRole={currentUser.role}
            />

            <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
              {renderActiveContent()}
            </main>

            <MobileBottomBar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              embedded={true}
            />
          </div>
        </div>
      ) : (
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            businesses={businesses}
            currentBusiness={currentBusiness}
            onSelectBusiness={handleSelectBusiness}
            onAddNewBusiness={handleOpenAddModal}
            mobileMode={false}
            onToggleMobileMode={() => setMobileMode(true)}
            onBackToLanding={() => setPageScreen('landing')}
            userRole={currentUser.role}
          />

          <main className="flex-1 pb-24 md:pb-14">{renderActiveContent()}</main>

          <MobileBottomBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            embedded={false}
          />
        </>
      )}

      {/* Business Edit / Add Modal */}
      <BusinessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBusiness}
        initialBusiness={editingBusiness}
        mobileMode={mobileMode}
      />
    </div>
  );
}
