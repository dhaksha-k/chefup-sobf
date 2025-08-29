// src/lib/firestore.ts
import { db } from "../app/firebase";
import {
  doc,
  setDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import type { ChefUser } from "./types";
import type { ChefType } from "../app/archetype";
import { normalizeArchetype } from "../app/archetype";

/** Public snapshot for QR “business card” pages (/v/:slug). */
export interface PassPublic {
  uid: string;
  displayName?: string;
  chefType?: string;        // slug, e.g. "Hustler"
  email?: string;
  waitlistNumber?: number;
  wantsGigs?: boolean;
  wantsSell?: boolean;
  chefFarmerConnect?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/** Print queue status values. */
export type PrintStatus = "pending" | "approved" | "denied" | "printed";

/** Resolve current auth uid (waits for anon sign-in if needed). */
async function uid(): Promise<string> {
  const auth = getAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        unsub();
        u ? resolve(u.uid) : reject(new Error("no auth"));
      },
      reject
    );
  });
}

/** Merge write to the user's doc (stamps server timestamps). */
async function upsert(partial: Partial<ChefUser>) {
  const ref = doc(db, "users", await uid());
  await setDoc(
    ref,
    {
      createdAt: serverTimestamp(),
      ...partial,
      updatedAt: serverTimestamp(),
    } as Partial<ChefUser>,
    { merge: true }
  );
}

/** Save the quiz result (slug) into the canonical field `chefType`. */
export const saveArchetype = (slug: ChefType) => upsert({ chefType: slug });

/** Fetch typed user document or null (normalizes Legacy `archetype` → `chefType`). */
export async function getUser(): Promise<ChefUser | null> {
  const ref = doc(db, "users", await uid());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const raw = snap.data() as ChefUser & { archetype?: string; chefType?: string };
  const normalized =
    normalizeArchetype(raw.chefType) ?? normalizeArchetype(raw.archetype);

  return {
    ...raw,
    chefType: (normalized ?? raw.chefType) as any,
  } as ChefUser;
}

/** Convenience helpers */
export const saveQuizTags   = (tags: Partial<ChefUser>) => upsert(tags);
export const saveProfile    = (data: Partial<ChefUser>) => upsert(data);
export const saveProfileName = (displayName: string) => upsert({ displayName });
export const markWelcome    = () => upsert({ welcomeComplete: true });
export const markPrinted    = () => upsert({ printedCard: true });

/* ============================
   PRINT QUEUE — user + admin
   ============================ */

/** User asks for a print — appears in admin queue as `pending`. */
export const requestPrint = async () => {
  const userId = await uid();
  const userRef = doc(db, "users", userId);
  // ensure a QR exists so preview/print works
  await ensureQrPass();
  await setDoc(
    userRef,
    {
      printStatus: "pending" as PrintStatus,
      printRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
};

/** Admin approves a print request. */
export const adminApprovePrint = async (targetUid: string) => {
  const ref = doc(db, "users", targetUid);
  const adminUid = getAuth().currentUser?.uid;
  await setDoc(
    ref,
    {
      printStatus: "approved" as PrintStatus,
      printApprovedAt: serverTimestamp(),
      approvedBy: adminUid,
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
};

/** Admin denies a print request. */
export const adminDenyPrint = async (targetUid: string) => {
  const ref = doc(db, "users", targetUid);
  const adminUid = getAuth().currentUser?.uid;
  await setDoc(
    ref,
    {
      printStatus: "denied" as PrintStatus,
      printDeniedAt: serverTimestamp(),
      deniedBy: adminUid,
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
};

/** Admin marks as printed (also sets `printedCard = true`). */
export const adminMarkPrinted = async (targetUid: string) => {
  const ref = doc(db, "users", targetUid);
  await setDoc(
    ref,
    {
      printStatus: "printed" as PrintStatus,
      printedCard: true,
      printedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
};

/* ============================
   EMAIL / WAITLIST
   ============================ */

/**
 * Save email + assign a unique waitlistNumber ONCE using a transaction.
 * Counter doc: counters/waitlist
 */
export const saveEmail = async (email: string): Promise<number> => {
  const userId = await uid();
  const userRef = doc(db, "users", userId);
  const counterRef = doc(db, "counters", "waitlist");

  const START_AT = 100;

  const result = await runTransaction(db, async (tx) => {
    // If user already has a number, just update email and return it
    const userSnap = await tx.get(userRef);
    const existing = userSnap.exists()
      ? (userSnap.data() as ChefUser).waitlistNumber
      : null;

    if (existing != null) {
      tx.set(
        userRef,
        { email, betaAccess: true, updatedAt: serverTimestamp() } as Partial<ChefUser>,
        { merge: true }
      );
      return existing as number;
    }

    // Read counter (init if missing)
    const counterSnap = await tx.get(counterRef);
    let next: number;

    if (!counterSnap.exists()) {
      next = START_AT;
    } else {
      const raw = (counterSnap.data() as any).value;
      const parsed =
        typeof raw === "number" ? raw :
        typeof raw === "string" ? parseInt(raw, 10) : NaN;

      const current = Number.isFinite(parsed) ? parsed : START_AT - 1;
      next = current + 1;
    }

    // Write new counter value and user assignment
    tx.set(
      counterRef,
      {
        value: next,
        updatedAt: serverTimestamp(),
        createdAt: counterSnap.exists()
          ? (counterSnap.data() as any).createdAt
          : serverTimestamp(),
      },
      { merge: true }
    );

    const preservedCreatedAt = userSnap.exists()
      ? (userSnap.data() as any).createdAt
      : serverTimestamp();

    tx.set(
      userRef,
      {
        email,
        betaAccess: true,
        waitlistNumber: next,
        createdAt: preservedCreatedAt,
        updatedAt: serverTimestamp(),
      } as Partial<ChefUser>,
      { merge: true }
    );

    return next;
  });

  return result;
};

/* ============================
   QR PASS (public business card)
   ============================ */

function makeSlug(len = 8) {
  return Array.from({ length: len })
    .map(() => Math.floor(Math.random() * 36).toString(36))
    .join("");
}

/** Ensure the *current* user has a QR pass + public snapshot; return {slug,url}. */
export const ensureQrPass = async (): Promise<{ slug: string; url: string }> => {
  const userId = await uid();
  return ensureQrPassFor(userId);
};

/** Ensure *another* user (by uid) has a QR pass — handy for admin preview/print. */
export const ensureQrPassFor = async (targetUid: string): Promise<{ slug: string; url: string }> => {
  const userRef = doc(db, "users", targetUid);
  const userSnap = await getDoc(userRef);
  const u = (userSnap.exists() ? (userSnap.data() as any) : {}) as ChefUser & Record<string, any>;

  // Reuse slug if present; otherwise mint one
  let slug: string | undefined = u.qrSlug;
  if (!slug) slug = makeSlug(8);

  let passRef = doc(db, "passes", slug);
  // very rare collision if slug was just minted
  if (!u.qrSlug && (await getDoc(passRef)).exists()) {
    slug = makeSlug(10);
    passRef = doc(db, "passes", slug);
  }

  const origin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://your-app.example.com";
  const url = `${origin}/v/${slug}`;

  // Normalize chef type from either chefType or Legacy archetype
  const chefSlug =
    normalizeArchetype((u as any).chefType) ?? normalizeArchetype((u as any).archetype);

  // Preserve createdAt if pass exists
  const passSnap = await getDoc(passRef);
  const existingCreatedAt = passSnap.exists() ? (passSnap.data() as any).createdAt : undefined;

  // Public snapshot: ONLY include fields safe to expose
  const passData: PassPublic = {
    uid: targetUid,
    displayName: u.displayName ?? "",
    chefType: chefSlug ?? undefined,
    email: u.email ?? undefined,
    waitlistNumber: u.waitlistNumber ?? undefined,
    wantsGigs: (u as any).wantsGigs ?? undefined,
    wantsSell: (u as any).wantsSell ?? undefined,
    chefFarmerConnect: (u as any).chefFarmerConnect ? true : undefined,
    createdAt: existingCreatedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(passRef, passData, { merge: true });

  // Store slug/url on user for reuse
  await setDoc(
    userRef,
    { qrSlug: slug, qrUrl: url, updatedAt: serverTimestamp() } as Partial<ChefUser>,
    { merge: true }
  );

  return { slug, url };
};

/** Read public pass (for /v/:slug). */
export async function getPublicPass(slug: string): Promise<PassPublic | null> {
  const ref = doc(db, "passes", slug);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as PassPublic) : null;
}

/** Read another user's doc (admin preview/print). */
export async function getUserByUid(targetUid: string): Promise<ChefUser | null> {
  const ref = doc(db, "users", targetUid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const raw = snap.data() as any;
  const normalized = normalizeArchetype(raw.chefType) ?? normalizeArchetype(raw.archetype);
  return { ...raw, chefType: normalized ?? raw.chefType } as ChefUser;
}

/* ============================
   WAITLIST NUMBER (idempotent)
   ============================ */

export const ensureWaitlistNumber = async (): Promise<number> => {
  const userId = await uid();
  const userRef = doc(db, "users", userId);
  const counterRef = doc(db, "counters", "waitlist");
  const START_AT = 100;

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const existing = userSnap.exists()
      ? (userSnap.data() as any).waitlistNumber
      : null;
    if (existing != null) return existing as number;

    const counterSnap = await tx.get(counterRef);
    let next: number;
    if (!counterSnap.exists()) {
      next = START_AT; // first assignment
      tx.set(
        counterRef,
        { value: next, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } else {
      const curr = (counterSnap.data() as any).value ?? START_AT - 1;
      next = Number(curr) + 1;
      tx.set(counterRef, { value: next, updatedAt: serverTimestamp() }, { merge: true });
    }

    tx.set(
      userRef,
      {
        waitlistNumber: next,
        updatedAt: serverTimestamp(),
        createdAt: userSnap.exists()
          ? (userSnap.data() as any).createdAt
          : serverTimestamp(),
      },
      { merge: true }
    );

    return next;
  });
};
