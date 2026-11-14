import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite';
import { User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AffiliateDashboardData,
  BusinessProfile,
  PayoutGatewayConfig,
  PayoutGatewayType,
  PrivateFeedbackItem,
  ShopReferralTransaction,
  UserAccount,
  UserRole,
  WeeklyPayoutRecord,
} from '../types';
import {
  DEFAULT_BUSINESS_COVER,
  DEFAULT_BUSINESS_LOGO,
  INITIAL_BUSINESSES,
} from '../data/mockData';
import { DEFAULT_THANK_YOU_TEMPLATES } from '../utils/thankYouTemplates';

export type Unsubscribe = () => void;

export interface SyncUserOptions {
  preferredRole?: UserRole;
  referredByCode?: string;
  initialBusiness?: { name: string; city: string };
}

let pendingGoogleAuthOptions: SyncUserOptions | null = null;
const inFlightUserSyncs = new Map<string, Promise<{ user: UserAccount; isNewUser: boolean }>>();

export function setPendingGoogleAuthOptions(options: SyncUserOptions): void {
  pendingGoogleAuthOptions = options;
}

export function clearPendingGoogleAuthOptions(): void {
  pendingGoogleAuthOptions = null;
}

function toIsoDate(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeId(raw: string, fallbackPrefix = 'doc'): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
}

function normalizeGoogleReviewUrl(raw?: string, placeId?: string): string {
  const fallbackPlace = (placeId || '').trim() || 'ChIJN1t_tDeuEmsRUsoyG83frY4';
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(fallbackPlace)}`.slice(0, 500);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.length >= 8
      ? trimmed.slice(0, 500)
      : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(fallbackPlace)}`.slice(0, 500);
  }
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(trimmed)}`.slice(0, 500);
}

function generateReferralCode(name: string): string {
  const prefix = (name || 'REVIO')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 5) || 'REVIO';
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const combined = `${prefix}${suffix}`.replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return combined.length >= 4 ? combined : `REV${Date.now().toString().slice(-4)}`;
}

function getNextFridayLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + diff);
  return nextFriday.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function maskDestination(method: PayoutGatewayType, detail: string): string {
  const clean = detail.trim();
  if (!clean) return method.toUpperCase();
  if (clean.includes('@')) {
    const [userPart, domain] = clean.split('@');
    return `${userPart.slice(0, 2)}***@${domain}`;
  }
  return `•••• ${clean.slice(-4)}`;
}

function buildBusinessWritePayload(
  business: BusinessProfile,
  ownerId: string,
  isCreate: boolean
): Record<string, unknown> {
  const id = sanitizeId(business.id, 'biz');
  const name = (business.name || 'My Business').trim().slice(0, 140) || 'My Business';
  const slug = (business.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .trim()
    .slice(0, 140) || id;
  const category = (business.category || 'Local Business').trim().slice(0, 100) || 'Local Business';
  const city = (business.city || 'United States').trim().slice(0, 120) || 'United States';
  const googleReviewUrl = normalizeGoogleReviewUrl(business.googleReviewUrl, business.googlePlaceId);

  const templates = {
    fiveStar: (
      business.thankYouTemplates?.fiveStar || DEFAULT_THANK_YOU_TEMPLATES.fiveStar
    ).slice(0, 600),
    fourStar: (
      business.thankYouTemplates?.fourStar || DEFAULT_THANK_YOU_TEMPLATES.fourStar
    ).slice(0, 600),
    lowStar: (
      business.thankYouTemplates?.lowStar || DEFAULT_THANK_YOU_TEMPLATES.lowStar
    ).slice(0, 600),
  };

  const cleanTags = (business.customTags || [])
    .map((t) => String(t).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);
  const cleanStaff = (business.staffMentions || [])
    .map((s) => String(s).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);

  const base: Record<string, unknown> = {
    name,
    slug,
    category,
    tagline: (business.tagline || '').slice(0, 260),
    address: (business.address || 'Main Street').slice(0, 200),
    city,
    country: (business.country || 'United States').slice(0, 100),
    phone: (business.phone || '+1 (555) 010-1200').slice(0, 40),
    website: (business.website || 'https://example.com').slice(0, 300),
    googlePlaceId: (business.googlePlaceId || '').slice(0, 140),
    googleReviewUrl,
    primaryColor: (business.primaryColor || '#0f766e').slice(0, 20),
    customTags: cleanTags,
    staffMentions: cleanStaff,
    aiReviewPromptGuide: (business.aiReviewPromptGuide || '').slice(0, 500),
    thankYouTemplates: templates,
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    return {
      ...base,
      id,
      ownerId,
      isPublic: true,
      rating: typeof business.rating === 'number' ? Math.min(5, Math.max(1, business.rating)) : 5.0,
      reviewCount: typeof business.reviewCount === 'number' ? Math.max(0, business.reviewCount) : 1,
      createdAt: serverTimestamp(),
    };
  }

  return base;
}

function hydrateBusinessFromDoc(data: Record<string, unknown>, docId: string): BusinessProfile {
  return {
    id: (data.id as string) || docId,
    ownerId: data.ownerId as string | undefined,
    name: (data.name as string) || 'Local Business',
    slug: (data.slug as string) || docId,
    category: (data.category as string) || 'Local Business',
    tagline: (data.tagline as string) || '',
    address: (data.address as string) || '',
    city: (data.city as string) || '',
    country: (data.country as string) || 'United States',
    phone: (data.phone as string) || '',
    website: (data.website as string) || '',
    googlePlaceId: (data.googlePlaceId as string) || '',
    googleReviewUrl:
      (data.googleReviewUrl as string) ||
      'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    logoUrl: DEFAULT_BUSINESS_LOGO,
    coverUrl: DEFAULT_BUSINESS_COVER,
    rating: typeof data.rating === 'number' ? data.rating : 5.0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 1,
    primaryColor: (data.primaryColor as string) || '#0f766e',
    customTags: Array.isArray(data.customTags) ? (data.customTags as string[]) : [],
    staffMentions: Array.isArray(data.staffMentions) ? (data.staffMentions as string[]) : [],
    aiReviewPromptGuide: (data.aiReviewPromptGuide as string) || '',
    thankYouTemplates: data.thankYouTemplates as BusinessProfile['thankYouTemplates'],
  };
}

async function performSyncFirebaseUserProfile(
  fbUser: User,
  options?: SyncUserOptions
): Promise<{ user: UserAccount; isNewUser: boolean }> {
  const mergedOptions: SyncUserOptions | undefined = options || pendingGoogleAuthOptions || undefined;
  pendingGoogleAuthOptions = null;

  const userPath = `users/${fbUser.uid}`;
  const userRef = doc(db, 'users', fbUser.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (snap.exists()) {
    const data = snap.data();
    let currentRole = (data.role as UserRole) || 'owner';

    // If user explicitly chose Creator Partner on signup/login and currently has 'owner', upgrade cleanly
    if (mergedOptions?.preferredRole === 'creator' && currentRole === 'owner') {
      try {
        await updateDoc(userRef, {
          role: 'creator',
          updatedAt: serverTimestamp(),
        });
        currentRole = 'creator';
        const gwRef = doc(db, 'users', fbUser.uid, 'gateway', 'default');
        const gwSnap = await getDoc(gwRef);
        if (!gwSnap.exists()) {
          await setDoc(gwRef, {
            creatorId: fbUser.uid,
            method: 'stripe',
            accountLabel: ((data.name as string) || fbUser.displayName || 'Creator Partner').slice(0, 140),
            accountDetail: '',
            country: 'United States',
            currency: 'USD',
            autoWeeklyPayout: true,
            payoutDay: 'Every Friday (10:00 AM EST)',
            minimumThreshold: 10,
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // Non-blocking if user record cannot be upgraded right now
      }
    }

    const account: UserAccount = {
      id: fbUser.uid,
      name: (data.name as string) || fbUser.displayName || 'Revio User',
      email: (data.email as string) || fbUser.email || '',
      role: currentRole,
      referralCode: (data.referralCode as string) || 'REVIO1',
      referredByCode: data.referredByCode as string | undefined,
      createdAt: toIsoDate(data.createdAt),
    };
    return { user: account, isNewUser: false };
  }

  const role: UserRole = mergedOptions?.preferredRole || 'owner';
  const displayName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'Revio User')
    .trim()
    .slice(0, 120) || 'Revio User';
  const rawEmail = (fbUser.email || '').trim().slice(0, 160);
  const email = rawEmail.length >= 3 ? rawEmail : `${fbUser.uid.slice(0, 8)}@revio.app`;
  const referralCode = generateReferralCode(displayName);
  const cleanRefCode = (mergedOptions?.referredByCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);

  const profilePayload: Record<string, unknown> = {
    uid: fbUser.uid,
    name: displayName,
    email,
    role,
    referralCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanRefCode) {
    profilePayload.referredByCode = cleanRefCode;
  }

  try {
    // Commit user profile + referral lookup FIRST so security rules referencing users/{uid}.role see committed state
    const batch = writeBatch(db);
    batch.set(userRef, profilePayload);
    batch.set(doc(db, 'referralCodes', referralCode), {
      code: referralCode,
      creatorUid: fbUser.uid,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  if (role === 'creator') {
    try {
      await setDoc(doc(db, 'users', fbUser.uid, 'gateway', 'default'), {
        creatorId: fbUser.uid,
        method: 'stripe',
        accountLabel: displayName,
        accountDetail: '',
        country: 'United States',
        currency: 'USD',
        autoWeeklyPayout: true,
        payoutDay: 'Every Friday (10:00 AM EST)',
        minimumThreshold: 10,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}/gateway/default`);
    }
  }

  // Seed default storefront or initial shop for the new user
  if (role === 'owner' && mergedOptions?.initialBusiness?.name) {
    const slug = sanitizeId(mergedOptions.initialBusiness.name.toLowerCase(), 'biz');
    const bizId = `biz-${Date.now()}`;
    await saveBusinessToFirestore(fbUser.uid, {
      ...INITIAL_BUSINESSES[0],
      id: bizId,
      ownerId: fbUser.uid,
      name: mergedOptions.initialBusiness.name.trim(),
      slug,
      city: mergedOptions.initialBusiness.city.trim() || 'United States',
      tagline: `Official Google Maps reviews for ${mergedOptions.initialBusiness.name.trim()}`,
      rating: 5.0,
      reviewCount: 1,
    });
  } else {
    const starterBiz: BusinessProfile = {
      ...INITIAL_BUSINESSES[0],
      id: `biz-${sanitizeId(fbUser.uid.slice(0, 12), 'u')}-1`,
      ownerId: fbUser.uid,
      slug: `${INITIAL_BUSINESSES[0].slug}-${fbUser.uid.slice(0, 6).toLowerCase()}`,
    };
    await saveBusinessToFirestore(fbUser.uid, starterBiz);
  }

  // If signed up with a creator referral code, record pending referral transaction for that creator
  if (role === 'owner' && cleanRefCode) {
    try {
      const refSnap = await getDoc(doc(db, 'referralCodes', cleanRefCode));
      if (refSnap.exists()) {
        const creatorUid = refSnap.data().creatorUid as string;
        if (creatorUid && creatorUid !== fbUser.uid) {
          const txId = `tx-${Date.now()}`;
          await setDoc(doc(db, 'users', creatorUid, 'transactions', txId), {
            id: txId,
            creatorId: creatorUid,
            businessName: (mergedOptions?.initialBusiness?.name || `${displayName}'s Shop`).slice(0, 140),
            businessCategory: 'Local Business',
            businessCity: (mergedOptions?.initialBusiness?.city || 'United States').slice(0, 120),
            ownerEmail: email,
            setupFeePaid: 0,
            monthlyPlanAmount: 2,
            commissionAmount: 10,
            paymentStatus: 'pending',
            payoutStatus: 'pending_weekly',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch {
      // Non-blocking if referral code lookup or creator tx creation is invalid
    }
  }

  return {
    user: {
      id: fbUser.uid,
      name: displayName,
      email,
      role,
      referralCode,
      referredByCode: cleanRefCode || undefined,
      createdAt: new Date().toISOString(),
    },
    isNewUser: true,
  };
}

export async function syncFirebaseUserProfile(
  fbUser: User,
  options?: SyncUserOptions
): Promise<{ user: UserAccount; isNewUser: boolean }> {
  const existingPromise = inFlightUserSyncs.get(fbUser.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const syncPromise = performSyncFirebaseUserProfile(fbUser, options).finally(() => {
    inFlightUserSyncs.delete(fbUser.uid);
  });
  inFlightUserSyncs.set(fbUser.uid, syncPromise);
  return syncPromise;
}

export async function upgradeUserToCreatorInFirestore(uid: string): Promise<UserAccount | null> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, {
      role: 'creator',
      updatedAt: serverTimestamp(),
    });

    const gwRef = doc(db, 'users', uid, 'gateway', 'default');
    const gwSnap = await getDoc(gwRef);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    if (!gwSnap.exists()) {
      await setDoc(gwRef, {
        creatorId: uid,
        method: 'stripe',
        accountLabel: ((userData.name as string) || 'Creator Partner').slice(0, 140),
        accountDetail: '',
        country: 'United States',
        currency: 'USD',
        autoWeeklyPayout: true,
        payoutDay: 'Every Friday (10:00 AM EST)',
        minimumThreshold: 10,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      id: uid,
      name: (userData.name as string) || 'Creator Partner',
      email: (userData.email as string) || '',
      role: 'creator',
      referralCode: (userData.referralCode as string) || 'REVIO1',
      referredByCode: userData.referredByCode as string | undefined,
      createdAt: toIsoDate(userData.createdAt),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

export function subscribeUserBusinesses(
  ownerId: string,
  onData: (businesses: BusinessProfile[]) => void
): Unsubscribe {
  let stopped = false;
  const path = 'businesses';

  const fetchBusinesses = async () => {
    if (stopped || !auth.currentUser || auth.currentUser.uid !== ownerId) return;
    try {
      const q = query(collection(db, path), where('ownerId', '==', ownerId));
      const snapshot = await getDocs(q);
      if (stopped || !auth.currentUser || auth.currentUser.uid !== ownerId) return;
      const items = snapshot.docs.map((d) =>
        hydrateBusinessFromDoc(d.data() as Record<string, unknown>, d.id)
      );
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    } catch (error) {
      if (stopped || !auth.currentUser || auth.currentUser.uid !== ownerId) return;
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      } else {
        console.warn('Transient error refreshing businesses:', msg);
      }
    }
  };

  void fetchBusinesses();
  const intervalId = setInterval(() => {
    void fetchBusinesses();
  }, 20000);

  return () => {
    stopped = true;
    clearInterval(intervalId);
  };
}

export async function saveBusinessToFirestore(
  ownerId: string,
  business: BusinessProfile
): Promise<BusinessProfile> {
  let targetId = sanitizeId(business.id, 'biz');
  let path = `businesses/${targetId}`;
  let docRef = doc(db, 'businesses', targetId);

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const existingOwner = existing.data().ownerId as string | undefined;
      if (existingOwner && existingOwner !== ownerId) {
        // Re-scope shared starter/local sample ID (e.g. 'biz-1') to this owner so update never collides
        targetId = sanitizeId(`${targetId}-${ownerId.slice(0, 8)}`, 'biz');
        path = `businesses/${targetId}`;
        docRef = doc(db, 'businesses', targetId);
        const scopedExisting = await getDoc(docRef);
        if (scopedExisting.exists() && scopedExisting.data().ownerId === ownerId) {
          const payload = buildBusinessWritePayload({ ...business, id: targetId }, ownerId, false);
          await updateDoc(docRef, payload);
        } else {
          if (scopedExisting.exists()) {
            targetId = sanitizeId(`biz-${ownerId.slice(0, 8)}-${Date.now()}`, 'biz');
            path = `businesses/${targetId}`;
            docRef = doc(db, 'businesses', targetId);
          }
          const payload = buildBusinessWritePayload({ ...business, id: targetId }, ownerId, true);
          await setDoc(docRef, payload);
        }
      } else {
        const payload = buildBusinessWritePayload({ ...business, id: targetId }, ownerId, false);
        await updateDoc(docRef, payload);
      }
    } else {
      const payload = buildBusinessWritePayload({ ...business, id: targetId }, ownerId, true);
      await setDoc(docRef, payload);
    }

    return {
      ...business,
      id: targetId,
      ownerId,
      googleReviewUrl: normalizeGoogleReviewUrl(business.googleReviewUrl, business.googlePlaceId),
      logoUrl: DEFAULT_BUSINESS_LOGO,
      coverUrl: DEFAULT_BUSINESS_COVER,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getPublicBusinessBySlug(slug: string): Promise<BusinessProfile | null> {
  const path = 'businesses';
  try {
    const q = query(
      collection(db, path),
      where('isPublic', '==', true),
      where('slug', '==', slug)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const first = snap.docs[0];
    return hydrateBusinessFromDoc(first.data() as Record<string, unknown>, first.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function subscribeBusinessFeedback(
  businessId: string,
  ownerId: string,
  onData: (feedback: PrivateFeedbackItem[]) => void
): Unsubscribe {
  let stopped = false;
  const path = `businesses/${businessId}/feedback`;

  const fetchFeedback = async () => {
    if (stopped || !auth.currentUser || auth.currentUser.uid !== ownerId) return;
    try {
      const q = query(collection(db, path), where('businessOwnerId', '==', ownerId));
      const snapshot = await getDocs(q);
      if (stopped || !auth.currentUser || auth.currentUser.uid !== ownerId) return;
      const items: PrivateFeedbackItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          businessId: (data.businessId as string) || businessId,
          rating: typeof data.rating === 'number' ? data.rating : 3,
          tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
          comments: (data.comments as string) || '',
          customerName: (data.customerName as string) || 'Valued Guest',
          customerEmail: (data.customerEmail as string) || '',
          customerPhone: (data.customerPhone as string) || '',
          status: (data.status as PrivateFeedbackItem['status']) || 'new',
          createdAt: toIsoDate(data.createdAt),
        };
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(items);
    } catch (error) {
      if (stopped || !auth.currentUser || auth.currentUser.uid !== ownerId) return;
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      } else {
        console.warn('Transient error refreshing feedback:', msg);
      }
    }
  };

  void fetchFeedback();
  const intervalId = setInterval(() => {
    void fetchFeedback();
  }, 20000);

  return () => {
    stopped = true;
    clearInterval(intervalId);
  };
}

export async function submitPrivateFeedbackToFirestore(
  businessId: string,
  businessOwnerId: string,
  payload: {
    rating: number;
    tags: string[];
    comments: string;
    customerName?: string;
    customerEmail?: string;
  }
): Promise<boolean> {
  const bizDoc = await getDoc(doc(db, 'businesses', businessId));
  if (!bizDoc.exists()) {
    return false;
  }

  const fbId = `fb-${Date.now()}`;
  const path = `businesses/${businessId}/feedback/${fbId}`;
  const cleanTags = (payload.tags || [])
    .map((t) => String(t).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 15);

  const cleanPayload: Record<string, unknown> = {
    businessId,
    businessOwnerId: (bizDoc.data().ownerId as string) || businessOwnerId,
    rating: Math.min(5, Math.max(1, payload.rating)),
    tags: cleanTags,
    comments: payload.comments.trim().slice(0, 2000) || 'Private feedback submitted.',
    customerName: (payload.customerName || 'Valued Guest').trim().slice(0, 100),
    customerEmail: (payload.customerEmail || '').trim().slice(0, 160),
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'businesses', businessId, 'feedback', fbId), cleanPayload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateFeedbackStatusInFirestore(
  businessId: string,
  feedbackId: string,
  status: 'new' | 'contacted' | 'resolved'
): Promise<void> {
  const path = `businesses/${businessId}/feedback/${feedbackId}`;
  try {
    await updateDoc(doc(db, 'businesses', businessId, 'feedback', feedbackId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function loadCreatorAffiliateDataFromFirestore(
  creatorId: string,
  referralCode: string,
  creatorName: string
): Promise<AffiliateDashboardData> {
  const gwPath = `users/${creatorId}/gateway/default`;
  const txPath = `users/${creatorId}/transactions`;
  const payoutPath = `users/${creatorId}/payouts`;

  let gateway: PayoutGatewayConfig;
  try {
    const gwSnap = await getDoc(doc(db, 'users', creatorId, 'gateway', 'default'));
    if (gwSnap.exists()) {
      const g = gwSnap.data();
      gateway = {
        method: (g.method as PayoutGatewayType) || 'stripe',
        accountLabel: (g.accountLabel as string) || creatorName,
        accountDetail: (g.accountDetail as string) || '',
        country: (g.country as string) || 'United States',
        currency: (g.currency as string) || 'USD',
        autoWeeklyPayout: Boolean(g.autoWeeklyPayout ?? true),
        payoutDay: (g.payoutDay as string) || 'Every Friday (10:00 AM EST)',
        minimumThreshold: typeof g.minimumThreshold === 'number' ? g.minimumThreshold : 10,
        updatedAt: toIsoDate(g.updatedAt),
      };
    } else {
      const defaultPayload = {
        creatorId,
        method: 'stripe' as PayoutGatewayType,
        accountLabel: (creatorName || 'Creator Partner').slice(0, 140),
        accountDetail: '',
        country: 'United States',
        currency: 'USD',
        autoWeeklyPayout: true,
        payoutDay: 'Every Friday (10:00 AM EST)',
        minimumThreshold: 10,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', creatorId, 'gateway', 'default'), defaultPayload);
      gateway = {
        method: defaultPayload.method,
        accountLabel: defaultPayload.accountLabel,
        accountDetail: defaultPayload.accountDetail,
        country: defaultPayload.country,
        currency: defaultPayload.currency,
        autoWeeklyPayout: defaultPayload.autoWeeklyPayout,
        payoutDay: defaultPayload.payoutDay,
        minimumThreshold: defaultPayload.minimumThreshold,
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, gwPath);
  }

  let transactions: ShopReferralTransaction[] = [];
  try {
    const txSnap = await getDocs(
      query(collection(db, 'users', creatorId, 'transactions'), where('creatorId', '==', creatorId))
    );
    transactions = txSnap.docs
      .map((d) => {
        const t = d.data();
        return {
          id: (t.id as string) || d.id,
          creatorId: (t.creatorId as string) || creatorId,
          businessName: (t.businessName as string) || '',
          businessCategory: (t.businessCategory as string) || 'Local Business',
          businessCity: (t.businessCity as string) || '',
          ownerEmail: (t.ownerEmail as string) || '',
          setupFeePaid: typeof t.setupFeePaid === 'number' ? t.setupFeePaid : 0,
          monthlyPlanAmount: typeof t.monthlyPlanAmount === 'number' ? t.monthlyPlanAmount : 2,
          commissionAmount: typeof t.commissionAmount === 'number' ? t.commissionAmount : 10,
          paymentStatus: (t.paymentStatus as 'paid' | 'pending') || 'pending',
          payoutStatus:
            (t.payoutStatus as 'pending_weekly' | 'paid' | 'processing') || 'pending_weekly',
          payoutBatchId: t.payoutBatchId as string | undefined,
          createdAt: toIsoDate(t.createdAt),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, txPath);
  }

  let payouts: WeeklyPayoutRecord[] = [];
  try {
    const poSnap = await getDocs(
      query(collection(db, 'users', creatorId, 'payouts'), where('creatorId', '==', creatorId))
    );
    payouts = poSnap.docs
      .map((d) => {
        const p = d.data();
        return {
          id: (p.id as string) || d.id,
          creatorId: (p.creatorId as string) || creatorId,
          weekLabel: (p.weekLabel as string) || 'Weekly Payout',
          periodRange: (p.periodRange as string) || '',
          shopsCount: typeof p.shopsCount === 'number' ? p.shopsCount : 1,
          amount: typeof p.amount === 'number' ? p.amount : 10,
          method: (p.method as PayoutGatewayType) || 'stripe',
          destinationMasked: (p.destinationMasked as string) || 'STRIPE',
          status: (p.status as WeeklyPayoutRecord['status']) || 'paid',
          paidAt: toIsoDate(p.paidAt),
        };
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, payoutPath);
  }

  const paidTxs = transactions.filter((t) => t.paymentStatus === 'paid');
  const pendingWeeklyTxs = paidTxs.filter((t) => t.payoutStatus !== 'paid');
  const totalEarned = paidTxs.reduce((sum, t) => sum + t.commissionAmount, 0);
  const pendingWeeklyBalance = pendingWeeklyTxs.reduce((sum, t) => sum + t.commissionAmount, 0);
  const paidOutTotal = payouts.reduce((sum, p) => sum + p.amount, 0);

  return {
    referralCode,
    commissionPerSignup: 10,
    nextPayoutDate: getNextFridayLabel(),
    gateway,
    transactions,
    payouts,
    summary: {
      totalEarned,
      pendingWeeklyBalance,
      paidOutTotal,
      paidShopsCount: paidTxs.length,
      pendingShopsCount: transactions.filter((t) => t.paymentStatus === 'pending').length,
    },
  };
}

export async function saveCreatorGatewayToFirestore(
  creatorId: string,
  gateway: {
    method: PayoutGatewayType;
    accountLabel: string;
    accountDetail: string;
    country: string;
    currency: string;
    autoWeeklyPayout: boolean;
    payoutDay: string;
    minimumThreshold: number;
  }
): Promise<void> {
  const path = `users/${creatorId}/gateway/default`;
  const gwRef = doc(db, 'users', creatorId, 'gateway', 'default');

  const payload = {
    creatorId,
    method: gateway.method,
    accountLabel: gateway.accountLabel.trim().slice(0, 140) || 'Creator Partner',
    accountDetail: gateway.accountDetail.trim().slice(0, 180),
    country: (gateway.country || 'United States').trim().slice(0, 100),
    currency: (gateway.currency || 'USD').trim().slice(0, 10),
    autoWeeklyPayout: Boolean(gateway.autoWeeklyPayout),
    payoutDay: (gateway.payoutDay || 'Every Friday (10:00 AM EST)').trim().slice(0, 80),
    minimumThreshold: Math.min(1000, Math.max(10, Number(gateway.minimumThreshold) || 10)),
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(gwRef);
    if (snap.exists()) {
      await updateDoc(gwRef, {
        method: payload.method,
        accountLabel: payload.accountLabel,
        accountDetail: payload.accountDetail,
        country: payload.country,
        currency: payload.currency,
        autoWeeklyPayout: payload.autoWeeklyPayout,
        payoutDay: payload.payoutDay,
        minimumThreshold: payload.minimumThreshold,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(gwRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function recordCreatorReferredBusinessInFirestore(
  creatorId: string,
  payload: {
    businessName: string;
    businessCategory: string;
    businessCity: string;
    ownerEmail: string;
    markSetupPaid: boolean;
  }
): Promise<string> {
  const txId = `tx-${Date.now()}`;
  const path = `users/${creatorId}/transactions/${txId}`;
  try {
    await setDoc(doc(db, 'users', creatorId, 'transactions', txId), {
      id: txId,
      creatorId,
      businessName: payload.businessName.trim().slice(0, 140),
      businessCategory: (payload.businessCategory || 'Local Business').trim().slice(0, 100),
      businessCity: payload.businessCity.trim().slice(0, 120),
      ownerEmail: payload.ownerEmail.trim().slice(0, 160),
      setupFeePaid: payload.markSetupPaid ? 30 : 0,
      monthlyPlanAmount: 2,
      commissionAmount: 10,
      paymentStatus: payload.markSetupPaid ? 'paid' : 'pending',
      payoutStatus: 'pending_weekly',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return txId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function markCreatorTransactionPaidInFirestore(
  creatorId: string,
  txId: string
): Promise<void> {
  const path = `users/${creatorId}/transactions/${txId}`;
  try {
    await updateDoc(doc(db, 'users', creatorId, 'transactions', txId), {
      paymentStatus: 'paid',
      setupFeePaid: 30,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function runCreatorWeeklyPayoutInFirestore(
  creatorId: string,
  gateway: PayoutGatewayConfig,
  transactions: ShopReferralTransaction[]
): Promise<WeeklyPayoutRecord> {
  const eligible = transactions.filter(
    (t) => t.paymentStatus === 'paid' && t.payoutStatus !== 'paid'
  );
  if (eligible.length === 0) {
    throw new Error('No cleared $10 shop commissions waiting for payout yet.');
  }

  const totalAmount = eligible.reduce((sum, t) => sum + t.commissionAmount, 0);
  const payoutId = `po-${Date.now()}`;
  const destinationMasked = maskDestination(gateway.method, gateway.accountDetail);
  const nowLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', creatorId, 'payouts', payoutId), {
    id: payoutId,
    creatorId,
    weekLabel: 'Instant Weekly Transfer',
    periodRange: `${nowLabel} Batch`,
    shopsCount: eligible.length,
    amount: totalAmount,
    method: gateway.method,
    destinationMasked,
    status: 'paid',
    paidAt: serverTimestamp(),
  });

  for (const tx of eligible) {
    batch.update(doc(db, 'users', creatorId, 'transactions', tx.id), {
      payoutStatus: 'paid',
      payoutBatchId: payoutId,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${creatorId}/payouts/${payoutId}`);
  }

  return {
    id: payoutId,
    creatorId,
    weekLabel: 'Instant Weekly Transfer',
    periodRange: `${nowLabel} Batch`,
    shopsCount: eligible.length,
    amount: totalAmount,
    method: gateway.method,
    destinationMasked,
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
}
