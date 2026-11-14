import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Sparkles,
  DollarSign,
  Lock,
  Mail,
  User,
  Tag,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  clearPendingGoogleAuthOptions,
  setPendingGoogleAuthOptions,
  syncFirebaseUserProfile,
} from '../services/firestoreService';
import { UserAccount, UserRole } from '../types';

interface AuthViewProps {
  initialMode: 'signin' | 'signup';
  initialRole?: UserRole;
  referredByCode?: string;
  onBackToLanding: () => void;
  onAuthSuccess: (user: UserAccount, token: string, createdBusinessInfo?: { name: string; city: string }) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode,
  initialRole = 'owner',
  referredByCode = '',
  onBackToLanding,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState(referredByCode);
  const [businessName, setBusinessName] = useState('');
  const [businessCity, setBusinessCity] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload =
        mode === 'signup'
          ? {
              name,
              email,
              password,
              role,
              referralCodeInput,
              businessName,
              businessCity,
            }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Authentication failed.');
      }

      onAuthSuccess(
        data.user,
        data.token,
        mode === 'signup' && role === 'owner' && businessName.trim()
          ? { name: businessName.trim(), city: businessCity.trim() || 'United States' }
          : undefined
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to authenticate right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const demoEmail = demoRole === 'creator' ? 'creator@revio.app' : 'owner@revio.app';
      const demoPass = demoRole === 'creator' ? 'creator123' : 'owner123';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Demo login failed.');
      }
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign into demo account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    const syncOptions = {
      preferredRole: mode === 'signup' ? role : initialRole,
      referredByCode: referralCodeInput,
      initialBusiness:
        role === 'owner' && businessName.trim()
          ? {
              name: businessName.trim(),
              city: businessCity.trim() || 'United States',
            }
          : undefined,
    };

    try {
      setPendingGoogleAuthOptions(syncOptions);
      const credential = await signInWithPopup(auth, googleProvider);
      const { user } = await syncFirebaseUserProfile(credential.user, syncOptions);
      onAuthSuccess(user, 'firebase');
    } catch (err: any) {
      clearPendingGoogleAuthOptions();
      const rawMsg = err?.message || 'Google Sign-In was cancelled or failed.';
      if (rawMsg.includes('popup-blocked')) {
        setErrorMsg('Popup was blocked by your browser. Allow popups or sign in with email below.');
      } else if (rawMsg.includes('unauthorized-domain')) {
        setErrorMsg('Google Sign-In domain pending authorization. Use Email Sign Up or Quick Demo Access below.');
      } else if (!rawMsg.includes('popup-closed-by-user')) {
        setErrorMsg(rawMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#141413]">
      {/* Top Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#E7E6E0] h-16 px-4 sm:px-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#6B6B65] hover:text-[#141413] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>

        <span className="text-base font-bold tracking-tight text-[#141413]">
          Revio AI
        </span>

        <div className="w-24 hidden sm:block" />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#E7E6E0] p-6 sm:p-8 space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1F0EB] rounded-xl border border-[#E7E6E0]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#6B6B65] hover:text-[#141413]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#6B6B65] hover:text-[#141413]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#141413] tracking-tight">
              {mode === 'signup'
                ? role === 'creator'
                  ? 'Join as Creator Partner'
                  : 'Set up your business account'
                : 'Welcome back to Revio AI'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6B65] mt-1">
              {mode === 'signup'
                ? role === 'creator'
                  ? 'Earn $10 per paid business signup with weekly payouts inside Settings.'
                  : 'Launch your printable Google Maps QR stand and AI review assistant.'
                : 'Sign in to manage QR stands, reviews, or your creator payouts.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-xs font-medium text-[#9F1239]">
              {errorMsg}
            </div>
          )}

          {/* Primary Google Sign-In / Sign-Up (Cloud Firestore Synced) */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleAuth}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[#E7E6E0] bg-white hover:bg-[#F7F7F4] text-[#141413] font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              <span>
                {mode === 'signup' ? 'Continue with Google' : 'Sign in with Google'}
              </span>
            </button>

            <div className="flex items-center gap-3 text-[11px] text-[#8E8D86]">
              <div className="flex-1 h-px bg-[#E7E6E0]" />
              <span>or use email</span>
              <div className="flex-1 h-px bg-[#E7E6E0]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Account Role Selection on Sign Up */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === 'owner'
                        ? 'border-[#0F766E] bg-[#EEF5F3] text-[#0B4F4A]'
                        : 'border-[#E7E6E0] bg-[#F7F7F4] text-[#6B6B65]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1.5 text-[#0F766E]" />
                    <div className="font-bold text-[#141413]">Business Owner</div>
                    <div className="text-[11px] text-[#6B6B65] mt-0.5">$30 setup · $2/mo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('creator')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === 'creator'
                        ? 'border-[#0F766E] bg-[#EEF5F3] text-[#0B4F4A]'
                        : 'border-[#E7E6E0] bg-[#F7F7F4] text-[#6B6B65]'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mb-1.5 text-[#0F766E]" />
                    <div className="font-bold text-[#141413]">Creator Partner</div>
                    <div className="text-[11px] text-[#0F766E] font-semibold mt-0.5">
                      Earn $10 / shop
                    </div>
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8E8D86] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8E8D86] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E8D86] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
            </div>

            {mode === 'signup' && role === 'owner' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      Shop / Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Harbor Coffee"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={businessCity}
                      onChange={(e) => setBusinessCity(e.target.value)}
                      placeholder="e.g. Austin, TX"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B6B65] uppercase tracking-wider block mb-1">
                    Creator Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-[#8E8D86] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. MAYA10"
                      className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'signup'
                ? role === 'creator'
                  ? 'Create Creator Partner Account'
                  : 'Create Business Account'
                : 'Sign In'}
            </button>
          </form>

          {/* Instant Demo Access */}
          <div className="pt-4 border-t border-[#E7E6E0] space-y-2.5">
            <p className="text-[11px] font-semibold text-[#8E8D86] uppercase tracking-wider text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin('creator')}
                className="min-h-[42px] px-3 py-2 rounded-xl border border-[#CBE2DC] bg-[#EEF5F3] hover:bg-[#E1EFEA] text-[#0B4F4A] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Demo Creator ($10/shop)</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin('owner')}
                className="min-h-[42px] px-3 py-2 rounded-xl border border-[#E7E6E0] bg-[#F7F7F4] hover:bg-[#F1F0EB] text-[#141413] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Building2 className="w-3.5 h-3.5 text-[#6B6B65]" />
                <span>Demo Store Owner</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
