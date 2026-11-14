import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.createHash('sha256').update(process.env.GEMINI_API_KEY || 'revio-ai-session-secret-key').digest('hex');

app.use(express.json({ limit: '10mb' }));

// Health check for publishing / Cloud Run
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'revio-ai', timestamp: new Date().toISOString() });
});

let lastAiDiagnostics: {
  source: string;
  attempts: { model: string; status: string; durationMs: number; error?: string }[];
  timestamp: string;
} | null = null;

// Track per-model 429 quota cooldowns so exhausted models are skipped cleanly
const modelCooldownUntil: Record<string, number> = {};

function isQuotaError(errMsg: string): boolean {
  return (
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.toLowerCase().includes('quota exceeded')
  );
}

function markModelCooldown(modelName: string, errMsg: string) {
  let cooldownMs = 15 * 60 * 1000;
  const match = errMsg.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
  if (match && match[1]) {
    const secs = parseInt(match[1], 10);
    if (Number.isFinite(secs) && secs > 0) {
      cooldownMs = Math.min(secs * 1000, 60 * 60 * 1000);
    }
  }
  modelCooldownUntil[modelName] = Date.now() + cooldownMs;
}

// Initialize GoogleGenAI client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// ---------------- Persistent JSON Data Store ----------------
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'owner' | 'creator';
  referralCode: string;
  referredByCode?: string;
  createdAt: string;
}

interface StoredGateway {
  method: 'stripe' | 'paypal' | 'wise_bank' | 'upi';
  accountLabel: string;
  accountDetail: string;
  country: string;
  currency: string;
  autoWeeklyPayout: boolean;
  payoutDay: string;
  minimumThreshold: number;
  updatedAt: string;
}

interface StoredTransaction {
  id: string;
  creatorId: string;
  businessName: string;
  businessCategory: string;
  businessCity: string;
  ownerEmail: string;
  setupFeePaid: number;
  monthlyPlanAmount: number;
  commissionAmount: number;
  paymentStatus: 'paid' | 'pending';
  payoutStatus: 'pending_weekly' | 'paid' | 'processing';
  payoutBatchId?: string;
  createdAt: string;
}

interface StoredPayout {
  id: string;
  creatorId: string;
  weekLabel: string;
  periodRange: string;
  shopsCount: number;
  amount: number;
  method: 'stripe' | 'paypal' | 'wise_bank' | 'upi';
  destinationMasked: string;
  status: 'paid' | 'scheduled' | 'processing';
  paidAt: string;
}

interface PrivateFeedback {
  id: string;
  businessId: string;
  rating: number;
  tags: string[];
  comments: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'resolved';
}

interface AppDataStore {
  users: StoredUser[];
  gateways: Record<string, StoredGateway>;
  transactions: StoredTransaction[];
  payouts: StoredPayout[];
  feedback: PrivateFeedback[];
  analytics: {
    scansCount: number;
    reviewsDrafted: number;
    copiedToGoogle: number;
    privateFeedbackCount: number;
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

function signSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token?: string): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.uid || (parsed.exp && Date.now() > parsed.exp)) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function generateReferralCode(name: string): string {
  const prefix = (name || 'REVIO')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'REVIO';
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}${suffix}`;
}

function getNextFridayLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const nextFriday = new Date(now.getTime() + daysUntilFriday * 86400000);
  return nextFriday.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildDefaultStore(): AppDataStore {
  const demoCreatorId = 'usr-creator-demo';
  const demoOwnerId = 'usr-owner-demo';

  return {
    users: [
      {
        id: demoCreatorId,
        name: 'Maya Lin (Creator)',
        email: 'creator@revio.app',
        passwordHash: hashPassword('creator123'),
        role: 'creator',
        referralCode: 'MAYA10',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: demoOwnerId,
        name: 'Alex Morgan (Store Owner)',
        email: 'owner@revio.app',
        passwordHash: hashPassword('owner123'),
        role: 'owner',
        referralCode: 'ALEX10',
        referredByCode: 'MAYA10',
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      },
    ],
    gateways: {
      [demoCreatorId]: {
        method: 'stripe',
        accountLabel: 'Maya Lin Studio LLC',
        accountDetail: 'acct_1Q9xRevio••••8421',
        country: 'United States',
        currency: 'USD',
        autoWeeklyPayout: true,
        payoutDay: 'Every Friday (10:00 AM EST)',
        minimumThreshold: 10,
        updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
    },
    transactions: [
      {
        id: 'TXN-8841',
        creatorId: demoCreatorId,
        businessName: 'The Roasted Bean Espresso Bar',
        businessCategory: 'Artisanal Cafe & Bakery',
        businessCity: 'San Francisco, CA',
        ownerEmail: 'owner@roastedbean.co',
        setupFeePaid: 30,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'paid',
        payoutStatus: 'paid',
        payoutBatchId: 'PO-2026-W44',
        createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
      },
      {
        id: 'TXN-8859',
        creatorId: demoCreatorId,
        businessName: 'Apex Modern Dental & Orthodontics',
        businessCategory: 'Dental & Healthcare Clinic',
        businessCity: 'Santa Monica, CA',
        ownerEmail: 'admin@apexdental.com',
        setupFeePaid: 30,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'paid',
        payoutStatus: 'paid',
        payoutBatchId: 'PO-2026-W44',
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
      },
      {
        id: 'TXN-8902',
        creatorId: demoCreatorId,
        businessName: 'Trattoria Bella Vista',
        businessCategory: 'Restaurant & Dining',
        businessCity: 'New York, NY',
        ownerEmail: 'marco@bellavista.ny',
        setupFeePaid: 30,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'paid',
        payoutStatus: 'paid',
        payoutBatchId: 'PO-2026-W45',
        createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
      },
      {
        id: 'TXN-8934',
        creatorId: demoCreatorId,
        businessName: 'Crown & Blade Grooming Lounge',
        businessCategory: 'Salon & Barber Shop',
        businessCity: 'Chicago, IL',
        ownerEmail: 'dante@crownblade.com',
        setupFeePaid: 30,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'paid',
        payoutStatus: 'pending_weekly',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'TXN-8948',
        creatorId: demoCreatorId,
        businessName: 'Lumen Yoga & Pilates Studio',
        businessCategory: 'Fitness & Yoga Studio',
        businessCity: 'Austin, TX',
        ownerEmail: 'hello@lumenstudio.io',
        setupFeePaid: 30,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'paid',
        payoutStatus: 'pending_weekly',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'TXN-8955',
        creatorId: demoCreatorId,
        businessName: 'Harbor Auto Detailers',
        businessCategory: 'Automotive & Repair',
        businessCity: 'Seattle, WA',
        ownerEmail: 'team@harborauto.co',
        setupFeePaid: 0,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'pending',
        payoutStatus: 'pending_weekly',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    ],
    payouts: [
      {
        id: 'PO-2026-W44',
        creatorId: demoCreatorId,
        weekLabel: 'Week 44 Payout',
        periodRange: 'Oct 26 – Nov 01',
        shopsCount: 2,
        amount: 20,
        method: 'stripe',
        destinationMasked: 'Stripe •••• 8421',
        status: 'paid',
        paidAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      },
      {
        id: 'PO-2026-W45',
        creatorId: demoCreatorId,
        weekLabel: 'Week 45 Payout',
        periodRange: 'Nov 02 – Nov 08',
        shopsCount: 1,
        amount: 10,
        method: 'stripe',
        destinationMasked: 'Stripe •••• 8421',
        status: 'paid',
        paidAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    feedback: [
      {
        id: 'fb-1',
        businessId: 'biz-1',
        rating: 3,
        tags: ['Long wait time', 'Noisy ambience'],
        comments: 'Waited 20 minutes for our matcha latte during morning rush. Coffee was fine though.',
        customerName: 'Marcus Chen',
        customerEmail: 'marcus.c@example.com',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        status: 'contacted',
      },
      {
        id: 'fb-2',
        businessId: 'biz-1',
        rating: 2,
        tags: ['Cold food', 'Missing cutlery'],
        comments: 'Pastry was cold when served, had to ask twice for a fork.',
        customerName: 'Elena Rostova',
        customerEmail: 'elena.r@example.com',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        status: 'new',
      },
    ],
    analytics: {
      scansCount: 482,
      reviewsDrafted: 319,
      copiedToGoogle: 247,
      privateFeedbackCount: 8,
    },
  };
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function loadStore(): AppDataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read existing store.json, initializing fresh store:', err);
  }
  const initial = buildDefaultStore();
  saveStore(initial);
  return initial;
}

function saveStore(store: AppDataStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist store.json:', err);
  }
}

const dbStore: AppDataStore = loadStore();

function sanitizeUser(u: StoredUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    referralCode: u.referralCode,
    referredByCode: u.referredByCode,
    createdAt: u.createdAt,
  };
}

function getAuthenticatedUser(req: Request): StoredUser | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const uid = verifySessionToken(token);
  if (!uid) return null;
  return dbStore.users.find((u) => u.id === uid) || null;
}

function getDefaultGatewayForUser(user: StoredUser): StoredGateway {
  if (!dbStore.gateways[user.id]) {
    dbStore.gateways[user.id] = {
      method: 'stripe',
      accountLabel: user.name,
      accountDetail: '',
      country: 'United States',
      currency: 'USD',
      autoWeeklyPayout: true,
      payoutDay: 'Every Friday (10:00 AM EST)',
      minimumThreshold: 10,
      updatedAt: new Date().toISOString(),
    };
    saveStore(dbStore);
  }
  return dbStore.gateways[user.id];
}

function maskDestination(method: StoredGateway['method'], detail: string): string {
  const clean = detail.trim();
  if (!clean) {
    return method === 'paypal'
      ? 'PayPal Account'
      : method === 'wise_bank'
      ? 'Bank Transfer'
      : method === 'upi'
      ? 'UPI Transfer'
      : 'Stripe Express';
  }
  const tail = clean.slice(-4);
  const label =
    method === 'paypal'
      ? 'PayPal'
      : method === 'wise_bank'
      ? 'Bank'
      : method === 'upi'
      ? 'UPI'
      : 'Stripe';
  return `${label} •••• ${tail}`;
}

// ---------------- Auth Endpoints ----------------
app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { name, email, password, role = 'owner', referralCodeInput = '', businessName = '', businessCity = '' } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();

  if (!cleanName || !cleanEmail || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and a password (6+ characters) are required.' });
  }

  if (dbStore.users.some((u) => u.email === cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }

  const normalizedRole: 'owner' | 'creator' = role === 'creator' ? 'creator' : 'owner';
  const cleanRefCode = String(referralCodeInput || '').trim().toUpperCase();

  let myCode = generateReferralCode(cleanName);
  while (dbStore.users.some((u) => u.referralCode === myCode)) {
    myCode = generateReferralCode(cleanName);
  }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash: hashPassword(String(password)),
    role: normalizedRole,
    referralCode: myCode,
    referredByCode: cleanRefCode || undefined,
    createdAt: new Date().toISOString(),
  };

  dbStore.users.push(newUser);

  // If signed up as a business owner using a creator's referral code, credit the creator's $10 pending/paid commission
  if (normalizedRole === 'owner' && cleanRefCode) {
    const referrer = dbStore.users.find((u) => u.referralCode === cleanRefCode && u.role === 'creator');
    if (referrer) {
      dbStore.transactions.unshift({
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: referrer.id,
        businessName: String(businessName || `${cleanName}'s Store`).trim(),
        businessCategory: 'Local Business',
        businessCity: String(businessCity || 'United States').trim(),
        ownerEmail: cleanEmail,
        setupFeePaid: 30,
        monthlyPlanAmount: 2,
        commissionAmount: 10,
        paymentStatus: 'paid',
        payoutStatus: 'pending_weekly',
        createdAt: new Date().toISOString(),
      });
    }
  }

  saveStore(dbStore);
  const token = signSessionToken(newUser.id);
  return res.json({
    success: true,
    token,
    user: sanitizeUser(newUser),
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = dbStore.users.find((u) => u.email === cleanEmail);

  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signSessionToken(user.id);
  return res.json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
  return res.json({ success: true, user: sanitizeUser(user) });
});

app.post('/api/auth/become-creator', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  user.role = 'creator';
  getDefaultGatewayForUser(user);
  saveStore(dbStore);
  return res.json({ success: true, user: sanitizeUser(user) });
});

// ---------------- Creator Affiliate Partner Endpoints ----------------
function buildAffiliateResponse(user: StoredUser) {
  const gateway = getDefaultGatewayForUser(user);
  const transactions = dbStore.transactions
    .filter((t) => t.creatorId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const payouts = dbStore.payouts
    .filter((p) => p.creatorId === user.id)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const paidTransactions = transactions.filter((t) => t.paymentStatus === 'paid');
  const pendingWeeklyBalance = paidTransactions
    .filter((t) => t.payoutStatus === 'pending_weekly')
    .reduce((sum, t) => sum + t.commissionAmount, 0);
  const totalEarned = paidTransactions.reduce((sum, t) => sum + t.commissionAmount, 0);
  const paidOutTotal = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    referralCode: user.referralCode,
    commissionPerSignup: 10,
    nextPayoutDate: getNextFridayLabel(),
    gateway,
    transactions,
    payouts,
    summary: {
      totalEarned,
      pendingWeeklyBalance,
      paidOutTotal,
      paidShopsCount: paidTransactions.length,
      pendingShopsCount: transactions.filter((t) => t.paymentStatus === 'pending').length,
    },
  };
}

app.get('/api/affiliate/overview', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'creator') {
    return res.status(403).json({ error: 'Affiliate Partner Program is available exclusively for Creator Partner accounts.' });
  }
  return res.json({ success: true, data: buildAffiliateResponse(user) });
});

app.put('/api/affiliate/gateway', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'creator') {
    return res.status(403).json({ error: 'Creator account required.' });
  }

  const {
    method = 'stripe',
    accountLabel = user.name,
    accountDetail = '',
    country = 'United States',
    currency = 'USD',
    autoWeeklyPayout = true,
    payoutDay = 'Every Friday (10:00 AM EST)',
    minimumThreshold = 10,
  } = req.body;

  const validMethods = ['stripe', 'paypal', 'wise_bank', 'upi'];
  const safeMethod = validMethods.includes(method) ? method : 'stripe';

  dbStore.gateways[user.id] = {
    method: safeMethod,
    accountLabel: String(accountLabel).trim() || user.name,
    accountDetail: String(accountDetail).trim(),
    country: String(country).trim() || 'United States',
    currency: String(currency).trim() || 'USD',
    autoWeeklyPayout: Boolean(autoWeeklyPayout),
    payoutDay: String(payoutDay).trim() || 'Every Friday (10:00 AM EST)',
    minimumThreshold: Math.max(10, Number(minimumThreshold) || 10),
    updatedAt: new Date().toISOString(),
  };

  saveStore(dbStore);
  return res.json({ success: true, data: buildAffiliateResponse(user) });
});

app.post('/api/affiliate/refer-business', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'creator') {
    return res.status(403).json({ error: 'Creator account required.' });
  }

  const {
    businessName,
    businessCategory = 'Local Business',
    businessCity,
    ownerEmail,
    markSetupPaid = true,
  } = req.body;

  if (!businessName || !businessCity || !ownerEmail) {
    return res.status(400).json({ error: 'Business name, city, and owner email are required.' });
  }

  const isPaid = Boolean(markSetupPaid);
  const newTx: StoredTransaction = {
    id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
    creatorId: user.id,
    businessName: String(businessName).trim(),
    businessCategory: String(businessCategory).trim(),
    businessCity: String(businessCity).trim(),
    ownerEmail: String(ownerEmail).trim().toLowerCase(),
    setupFeePaid: isPaid ? 30 : 0,
    monthlyPlanAmount: 2,
    commissionAmount: 10,
    paymentStatus: isPaid ? 'paid' : 'pending',
    payoutStatus: 'pending_weekly',
    createdAt: new Date().toISOString(),
  };

  dbStore.transactions.unshift(newTx);
  saveStore(dbStore);
  return res.json({ success: true, transaction: newTx, data: buildAffiliateResponse(user) });
});

app.post('/api/affiliate/mark-shop-paid/:txId', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'creator') {
    return res.status(403).json({ error: 'Creator account required.' });
  }

  const tx = dbStore.transactions.find((t) => t.id === req.params.txId && t.creatorId === user.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

  tx.paymentStatus = 'paid';
  tx.setupFeePaid = 30;
  saveStore(dbStore);
  return res.json({ success: true, data: buildAffiliateResponse(user) });
});

app.post('/api/affiliate/request-payout', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'creator') {
    return res.status(403).json({ error: 'Creator account required.' });
  }

  const gateway = getDefaultGatewayForUser(user);
  if (!gateway.accountDetail.trim()) {
    return res.status(400).json({ error: 'Please save your payout destination account details first.' });
  }

  const eligibleTxs = dbStore.transactions.filter(
    (t) => t.creatorId === user.id && t.paymentStatus === 'paid' && t.payoutStatus === 'pending_weekly'
  );

  const payoutAmount = eligibleTxs.reduce((sum, t) => sum + t.commissionAmount, 0);
  if (payoutAmount < 10) {
    return res.status(400).json({ error: 'Minimum $10.00 verified balance is required to initiate a payout.' });
  }

  const batchId = `PO-${new Date().getFullYear()}-W${Math.floor(46 + Math.random() * 50)}`;
  const now = new Date();
  const weekStart = new Date(now.getTime() - 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  for (const tx of eligibleTxs) {
    tx.payoutStatus = 'paid';
    tx.payoutBatchId = batchId;
  }

  const newPayout: StoredPayout = {
    id: batchId,
    creatorId: user.id,
    weekLabel: 'Weekly Partner Payout',
    periodRange: `${weekStart} – ${weekEnd}`,
    shopsCount: eligibleTxs.length,
    amount: payoutAmount,
    method: gateway.method,
    destinationMasked: maskDestination(gateway.method, gateway.accountDetail),
    status: 'paid',
    paidAt: now.toISOString(),
  };

  dbStore.payouts.unshift(newPayout);
  saveStore(dbStore);

  return res.json({ success: true, payout: newPayout, data: buildAffiliateResponse(user) });
});

// ---------------- AI Review & Reply Endpoints ----------------
function buildVariedFallbackReview(params: {
  businessName: string;
  businessLocation?: string;
  rating: number;
  selectedTags: string[];
  customNotes?: string;
  tone: string;
  length: string;
  language: string;
  variationIndex: number;
}): string {
  const {
    businessName,
    businessLocation,
    rating,
    selectedTags,
    customNotes,
    tone,
    length,
    language,
    variationIndex,
  } = params;

  const cleanTags = selectedTags.filter((t) => !t.startsWith('Special shoutout to '));
  const staffTag = selectedTags.find((t) => t.startsWith('Special shoutout to '));
  const staffName = staffTag ? staffTag.replace('Special shoutout to ', '') : '';
  const notes = customNotes?.trim() || '';
  const place = businessLocation?.split(',')[0]?.trim() || 'the area';
  const tagsPhrase =
    cleanTags.length > 1
      ? `the ${cleanTags[0].toLowerCase()} and ${cleanTags[1].toLowerCase()}`
      : cleanTags.length === 1
      ? `the ${cleanTags[0].toLowerCase()}`
      : 'the overall quality and hospitality';

  if (language === 'Spanish') {
    const base =
      rating >= 4
        ? `Tuve una experiencia excelente en ${businessName}. Todo estuvo muy bien cuidado y la atención fue muy amable.`
        : `Visité ${businessName} recientemente (${rating} estrellas). Hubo aspectos positivos, aunque creo que hay margen para mejorar.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` Mención especial para ${staffName} por su gran trato.` : '';
    const closing =
      length === 'short'
        ? ''
        : ` Sin duda un lugar muy recomendable en ${place}; volveré pronto.`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'French') {
    const base =
      rating >= 4
        ? `Très belle expérience chez ${businessName} ! L'accueil était chaleureux et le service vraiment soigné.`
        : `Passage chez ${businessName} (${rating} étoiles). Certains points étaient appréciables, mais quelques détails peuvent être améliorés.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` Un grand merci à ${staffName} pour son accueil.` : '';
    const closing =
      length === 'short' ? '' : ` Une adresse que je recommande volontiers à ${place}.`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'German') {
    const base =
      rating >= 4
        ? `Ein rundum gelungener Besuch bei ${businessName}! Das Team war sehr freundlich und alles hat gepasst.`
        : `Mein Besuch bei ${businessName} (${rating} Sterne) war insgesamt ordentlich, auch wenn es noch Luft nach oben gibt.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` Besonderen Dank an ${staffName} für den tollen Service.` : '';
    const closing = length === 'short' ? '' : ` Ich komme gerne wieder vorbei!`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Italian') {
    const base =
      rating >= 4
        ? `Ottima esperienza da ${businessName}! Personale cortese, ambiente piacevole e grande attenzione ai dettagli.`
        : `Visita recente da ${businessName} (${rating} stelle). Esperienza discreta con qualche aspetto migliorabile.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` Un ringraziamento speciale a ${staffName}.` : '';
    const closing = length === 'short' ? '' : ` Consigliatissimo a ${place}!`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Portuguese') {
    const base =
      rating >= 4
        ? `Experiência muito boa na ${businessName}! Atendimento atencioso e tudo com ótima qualidade.`
        : `Visitei a ${businessName} (${rating} estrelas). Alguns pontos foram bons, mas há espaço para melhorar.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` Destaque especial para ${staffName} pela simpatia.` : '';
    const closing = length === 'short' ? '' : ` Recomendo bastante em ${place}!`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Hindi') {
    const base =
      rating >= 4
        ? `${businessName} में मेरा अनुभव बहुत अच्छा रहा! यहाँ का माहौल और सेवा दोनों ही बहुत बढ़िया थे।`
        : `${businessName} का मेरा अनुभव (${rating} स्टार) ठीक रहा, हालांकि कुछ चीज़ों में सुधार किया जा सकता है।`;
    const detail = notes ? ` ${notes}।` : '';
    const staffLine = staffName ? ` ${staffName} का व्यवहार बहुत ही मददगार था।` : '';
    const closing = length === 'short' ? '' : ` ${place} में यह जगह जरूर देखने लायक है।`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Japanese') {
    const base =
      rating >= 4
        ? `${businessName}を訪れましたが、とても満足度の高い体験でした。スタッフの対応も丁寧で心地よかったです。`
        : `${businessName}を利用しました（${rating}つ星）。良い点もありましたが、いくつか改善の余地があると感じました。`;
    const detail = notes ? ` ${notes}。` : '';
    const staffLine = staffName ? ` 特に${staffName}さんの丁寧な対応が印象的でした。` : '';
    const closing = length === 'short' ? '' : ` また近くに来た際は立ち寄りたいと思います。`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Chinese (Simplified)') {
    const base =
      rating >= 4
        ? `在${businessName}的体验非常棒！服务贴心周到，整体环境也很舒适。`
        : `最近去过${businessName}（${rating}星）。整体还可以，但有些细节还有提升空间。`;
    const detail = notes ? ` ${notes}。` : '';
    const staffLine = staffName ? ` 特别感谢${staffName}的热情接待。` : '';
    const closing = length === 'short' ? '' : ` 很推荐来${place}的朋友试试！`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Arabic') {
    const base =
      rating >= 4
        ? `كانت تجربتي في ${businessName} رائعة للغاية! الخدمة ممتازة والأجواء مريحة ومرحبّة.`
        : `قمت بزيارة ${businessName} (${rating} نجوم). التجربة جيدة بشكل عام مع وجود مجال لبعض التحسينات.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` شكر خاص لـ ${staffName} على حسن التعامل.` : '';
    const closing = length === 'short' ? '' : ` أنصح بزيارة المكان في ${place}.`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (language === 'Korean') {
    const base =
      rating >= 4
        ? `${businessName}에 방문했는데 정말 만족스러웠습니다! 직원분들도 친절하고 분위기가 아주 좋았어요.`
        : `${businessName} 방문 후기입니다 (${rating}점). 좋은 점도 있었지만 조금 더 개선되면 좋겠는 부분도 있었습니다.`;
    const detail = notes ? ` ${notes}.` : '';
    const staffLine = staffName ? ` 특히 ${staffName}님 덕분에 기분 좋게 이용했습니다.` : '';
    const closing = length === 'short' ? '' : ` ${place} 근처에 오면 다시 방문하고 싶어요!`;
    return `${base}${detail}${staffLine}${closing}`.trim();
  }

  if (rating <= 3) {
    const midOpening = [
      `Visited ${businessName} recently and wanted to share honest feedback.`,
      `Stopped by ${businessName} in ${place} for a quick visit.`,
    ][variationIndex % 2];
    const midDetail = notes
      ? ` ${notes.charAt(0).toUpperCase() + notes.slice(1)}.`
      : cleanTags.length > 0
      ? ` I appreciated ${tagsPhrase}, though a few parts of the visit fell short of expectations.`
      : ` Some parts of the visit went smoothly, though there is room for improvement.`;
    const midClosing =
      length === 'short'
        ? ''
        : ` Giving ${rating} stars for now, and hoping my next visit is even better.`;
    return `${midOpening}${midDetail}${midClosing}`.trim();
  }

  const openersByTone: Record<string, string[]> = {
    'Warm & Enthusiastic': [
      `Stopped by ${businessName} today and walked out with a big smile!`,
      `Had such a lovely visit to ${businessName} in ${place}.`,
      `Really enjoyed my time at ${businessName}—everything felt so welcoming from the moment I walked in.`,
    ],
    'Concise & Punchy': [
      `Quick ${rating}-star shoutout to ${businessName} in ${place}.`,
      `Easy ${rating} stars for ${businessName}.`,
      `Visited ${businessName} recently and left very impressed.`,
    ],
    'Local Guide / Foodie': [
      `As someone who explores spots all around ${place}, ${businessName} is a genuine standout.`,
      `If you find yourself in ${place}, ${businessName} is well worth putting on your list.`,
      `Checked out ${businessName} this week and it easily earned its reputation in ${place}.`,
    ],
    'Professional & Detailed': [
      `I recently visited ${businessName} in ${place} and had a consistently positive experience.`,
      `My visit to ${businessName} was well organized, comfortable, and thoroughly enjoyable.`,
      `Had a smooth, reliable experience at ${businessName} from start to finish.`,
    ],
    'Family-Friendly': [
      `We brought the whole family to ${businessName} in ${place} and everyone had a great time!`,
      `Had a wonderful family visit to ${businessName}—super accommodating and relaxed.`,
      `${businessName} made our family outing in ${place} easy and enjoyable.`,
    ],
  };

  const openerPool = openersByTone[tone] || openersByTone['Warm & Enthusiastic'];
  const opener = openerPool[variationIndex % openerPool.length];

  const middleParts: string[] = [];
  if (cleanTags.length > 0) {
    const tagSentence = [
      `What stood out most was ${tagsPhrase}.`,
      `I especially appreciated ${tagsPhrase}.`,
      `Highlights for me were definitely ${tagsPhrase}.`,
    ][variationIndex % 3];
    middleParts.push(tagSentence);
  }

  if (notes) {
    const normalizedNote = notes.charAt(0).toUpperCase() + notes.slice(1);
    middleParts.push(normalizedNote.endsWith('.') || normalizedNote.endsWith('!') ? normalizedNote : `${normalizedNote}.`);
  }

  if (staffName) {
    const staffSentence = [
      `Big thank you to ${staffName} for going above and beyond!`,
      `Special shoutout to ${staffName} for making the visit extra memorable.`,
    ][variationIndex % 2];
    middleParts.push(staffSentence);
  }

  if (middleParts.length === 0) {
    middleParts.push(`The quality and attention to detail were noticeable right away.`);
  }

  if (length === 'short') {
    return `${opener} ${middleParts.slice(0, 2).join(' ')}`.trim();
  }

  const closingPool =
    rating === 5
      ? [
          `Everything ran smoothly, and I'll definitely be back soon.`,
          `Gladly giving 5 stars and recommending it to friends in ${place}.`,
          `It's rare to find a place this consistent—can't wait for my next visit.`,
        ]
      : [
          `Overall a solid 4-star experience and I'm looking forward to visiting again.`,
          `Really happy with my visit and would gladly return next time I'm in ${place}.`,
        ];
  const closing = closingPool[variationIndex % closingPool.length];

  if (length === 'long') {
    const extraDetail =
      cleanTags.length > 2
        ? ` On top of that, ${cleanTags.slice(2, 4).join(' and ').toLowerCase()} added a great touch to the overall atmosphere.`
        : ` You can tell the team genuinely cares about the customer experience and keeps everything running thoughtfully.`;
    return `${opener} ${middleParts.join(' ')}${extraDetail} ${closing}`.trim();
  }

  return `${opener} ${middleParts.join(' ')} ${closing}`.trim();
}

app.post('/api/generate-review', async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      businessCategory,
      businessLocation,
      highlights,
      rating = 5,
      selectedTags = [],
      customNotes = '',
      tone = 'Warm & Enthusiastic',
      length = 'medium',
      language = 'English',
      previousDraft = '',
      variationSeed = 0,
    } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: 'businessName is required' });
    }

    const lengthGuide =
      length === 'short'
        ? 'around 2 punchy sentences (25-45 words)'
        : length === 'long'
        ? 'around 4 to 6 detailed, expressive sentences (85-130 words)'
        : 'around 3 to 4 natural sentences (50-80 words)';

    const prompt = `You are a real customer writing a genuine, natural Google Maps review after visiting a local business.
Business Name: "${businessName}"
Business Category: "${businessCategory || 'Local Business'}"
Location: "${businessLocation || 'local area'}"
Business Specialties / Context: "${highlights || 'Great service and quality'}"
Star Rating Given: ${rating} out of 5 stars
Selected Highlights / Tags: ${
      Array.isArray(selectedTags) && selectedTags.length > 0
        ? selectedTags.join(', ')
        : 'none selected'
    }
Customer's Own Notes: ${customNotes?.trim() ? `"${customNotes.trim()}"` : 'none provided'}
Requested Tone: "${tone}"
Target Length: ${lengthGuide}
Language: Write the ENTIRE review strictly in ${language}.
${previousDraft ? `\nDo NOT repeat or closely paraphrase this previous draft—write a fresh angle:\n"${previousDraft}"\n` : ''}
Rules:
1. Write in first-person ("I" or "we") like a real everyday visitor on Google Maps.
2. Match the ${rating}-star sentiment accurately (if 4 stars, warm and positive; if 1-3 stars, constructive and honest).
3. Naturally weave in ALL selected tags, staff shoutouts, and the customer's own notes (translate concepts naturally if writing in a non-English language).
4. Avoid robotic AI clichés like "Look no further", "hidden gem", "game-changer", or "exceeded all expectations".
5. Output ONLY the plain review text—no quotes, no markdown, no intro or outro.`;

    let reviewText = '';
    let source: 'gemini' | 'template' = 'template';
    const attempts: { model: string; status: string; durationMs: number; error?: string }[] = [];

    if (process.env.GEMINI_API_KEY) {
      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
      for (const modelName of modelsToTry) {
        if (modelCooldownUntil[modelName] && Date.now() < modelCooldownUntil[modelName]) {
          attempts.push({
            model: modelName,
            status: 'cooldown',
            durationMs: 0,
          });
          continue;
        }

        const startedAt = Date.now();
        try {
          const ai = getAiClient();
          const controller = new AbortController();
          const timeoutMs = modelName === 'gemini-3.1-flash-lite' ? 6000 : 10000;
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const response = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                abortSignal: controller.signal,
                systemInstruction:
                  'You write authentic, concise, human-sounding Google Maps reviews for local businesses.',
                ...(modelName === 'gemini-4-hydrogen'
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                  : {}),
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs + 200)
            ),
          ]).finally(() => clearTimeout(timer));

          const candidate = response.text?.trim() || '';
          if (candidate) {
            reviewText = candidate.replace(/^["']|["']$/g, '').trim();
            source = 'gemini';
            attempts.push({
              model: modelName,
              status: 'ok',
              durationMs: Date.now() - startedAt,
            });
            lastAiDiagnostics = {
              source: 'gemini',
              attempts,
              timestamp: new Date().toISOString(),
            };
            break;
          }
          attempts.push({
            model: modelName,
            status: 'empty',
            durationMs: Date.now() - startedAt,
          });
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || String(geminiErr);
          if (isQuotaError(errMsg)) {
            markModelCooldown(modelName, errMsg);
            console.info(`Gemini free-tier quota reached on ${modelName}; switching to fallback.`);
          } else {
            console.warn(`Gemini API call failed on ${modelName}:`, errMsg);
          }
          attempts.push({
            model: modelName,
            status: isQuotaError(errMsg) ? 'quota_exhausted' : 'error',
            durationMs: Date.now() - startedAt,
            error: isQuotaError(errMsg) ? 'Free-tier quota reached' : errMsg,
          });
          lastAiDiagnostics = {
            source: 'fallback',
            attempts,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    if (!reviewText) {
      reviewText = buildVariedFallbackReview({
        businessName,
        businessLocation,
        rating: Number(rating) || 5,
        selectedTags: Array.isArray(selectedTags) ? selectedTags : [],
        customNotes,
        tone,
        length,
        language,
        variationIndex: Number(variationSeed) || 0,
      });
    }

    dbStore.analytics.reviewsDrafted += 1;
    saveStore(dbStore);

    return res.json({
      success: true,
      review: reviewText,
      language,
      tone,
      source,
    });
  } catch (error: any) {
    console.error('Error generating review:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate review draft',
    });
  }
});

app.get('/api/ai-status', (_req: Request, res: Response) => {
  return res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    lastAiDiagnostics,
  });
});

app.post('/api/generate-owner-reply', async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      reviewerName,
      reviewText,
      starRating,
      replyStyle = 'appreciative',
      savedTemplate,
    } = req.body;

    if (!reviewText) {
      return res.status(400).json({ error: 'reviewText is required' });
    }

    const styleInstructions =
      replyStyle === 'casual'
        ? 'friendly, warm, community-oriented, slightly conversational'
        : replyStyle === 'problem-solver'
        ? 'empathetic, constructive, solution-driven, inviting follow-up privately'
        : 'gracious, professional, polite, expressing heartfelt gratitude';

    const ownerPrompt = `You are the owner or general manager of "${businessName || 'our business'}".
Write 3 distinct options for a public reply to this Google Maps customer review:

Reviewer Name: ${reviewerName || 'A valued customer'}
Star Rating: ${starRating || 5}/5 stars
Customer Review:
"${reviewText}"
${savedTemplate ? `\nBusiness Preferred Thank-You Voice Reference:\n"${savedTemplate}"\n` : ''}
Reply Tone: ${styleInstructions}

Generate 3 varied responses:
1. Short & Gracious (concise, 1-2 sentences)
2. Detailed & Personal (mentions specific details from their review, 2-3 sentences)
3. Community & Warm Invitation (warm, encourages them to come back next time, 2-3 sentences)

Format the output strictly as valid JSON with an array of objects:
[
  { "title": "Quick & Gracious", "text": "..." },
  { "title": "Personalized & Thoughtful", "text": "..." },
  { "title": "Warm & Welcoming", "text": "..." }
]`;

    let replies = [];

    if (process.env.GEMINI_API_KEY) {
      const ownerModelsToTry = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
      for (const modelName of ownerModelsToTry) {
        if (modelCooldownUntil[modelName] && Date.now() < modelCooldownUntil[modelName]) {
          continue;
        }
        try {
          const ai = getAiClient();
          const controller = new AbortController();
          const timeoutMs = modelName === 'gemini-3.1-flash-lite' ? 6000 : 10000;
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const response = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: ownerPrompt,
              config: {
                abortSignal: controller.signal,
                responseMimeType: 'application/json',
                ...(modelName === 'gemini-4-hydrogen'
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                  : {}),
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs + 200)
            ),
          ]).finally(() => clearTimeout(timer));
          const rawJson = (response.text || '[]')
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            replies = parsed;
            break;
          }
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || String(geminiErr);
          if (isQuotaError(errMsg)) {
            markModelCooldown(modelName, errMsg);
            console.info(`Gemini free-tier quota reached for owner reply on ${modelName}; switching to fallback.`);
          } else {
            console.warn(`Gemini API call failed for owner reply on ${modelName}:`, errMsg);
          }
        }
      }
    }

    if (!replies || replies.length === 0) {
      replies = [
        {
          title: 'Quick & Gracious',
          text: `Thank you so much for the glowing review, ${reviewerName || 'friend'}! We truly appreciate you taking the time to share your experience with ${businessName}.`,
        },
        {
          title: 'Personalized & Thoughtful',
          text: `Hi ${reviewerName || 'there'}, we're thrilled to hear you had such a wonderful visit! Our team works hard to make every visit memorable, and your kind words mean the world to us.`,
        },
        {
          title: 'Warm & Welcoming',
          text: `Thank you for supporting ${businessName}! It was our absolute pleasure serving you, and we cannot wait to welcome you back next time!`,
        },
      ];
    }

    return res.json({ success: true, replies });
  } catch (error: any) {
    console.error('Error generating owner reply:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate owner reply',
    });
  }
});

// ---------------- Feedback & Analytics Endpoints ----------------
app.post('/api/feedback', (req: Request, res: Response) => {
  const { businessId, rating, tags, comments, customerName, customerEmail, customerPhone } = req.body;

  const newFeedback: PrivateFeedback = {
    id: `fb-${Date.now()}`,
    businessId: businessId || 'biz-1',
    rating: rating || 3,
    tags: tags || [],
    comments: comments || '',
    customerName: customerName || 'Anonymous Guest',
    customerEmail,
    customerPhone,
    createdAt: new Date().toISOString(),
    status: 'new',
  };

  dbStore.feedback.unshift(newFeedback);
  dbStore.analytics.privateFeedbackCount += 1;
  saveStore(dbStore);

  return res.json({ success: true, feedback: newFeedback });
});

app.get('/api/feedback', (_req: Request, res: Response) => {
  return res.json({ success: true, feedback: dbStore.feedback });
});

app.patch('/api/feedback/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const item = dbStore.feedback.find((f) => f.id === id);
  if (item && status) {
    item.status = status;
    saveStore(dbStore);
    return res.json({ success: true, item });
  }
  return res.status(404).json({ error: 'Feedback not found' });
});

app.get('/api/analytics', (_req: Request, res: Response) => {
  return res.json({ success: true, analytics: dbStore.analytics });
});

app.post('/api/analytics/track-copy', (_req: Request, res: Response) => {
  dbStore.analytics.copiedToGoogle += 1;
  saveStore(dbStore);
  return res.json({ success: true, copiedToGoogle: dbStore.analytics.copiedToGoogle });
});

app.post('/api/analytics/track-scan', (_req: Request, res: Response) => {
  dbStore.analytics.scansCount += 1;
  saveStore(dbStore);
  return res.json({ success: true, scansCount: dbStore.analytics.scansCount });
});

// ---------------- Vite Dev / Production Static Serving ----------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Revio AI Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
