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
  chefType?: string;        // e.g. "Connector"
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

/** Ensure the *current* user has a QR pass + public snapshot; return {slug,url}. */
export const ensureQrPass = async (): Promise<{ slug: string; url: string }> => {
  const userId = await uid();
  return ensureQrPassFor(userId);
};

/** Tiny helper to keep the public pass in sync after any user write. */
async function syncPublicPassForCurrentUser() {
  try {
    await ensureQrPass();
  } catch {
    /* ignore sync errors */}
}

/** Save the quiz result (slug) into the canonical field `chefType`. */
export const saveArchetype = (slug: ChefType) =>
  upsert({ chefType: slug }).then(syncPublicPassForCurrentUser);

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

/** Convenience helpers (now auto-sync the public pass) */
export const saveQuizTags    = (tags: Partial<ChefUser>) => upsert(tags).then(syncPublicPassForCurrentUser);
export const saveProfile     = (data: Partial<ChefUser>) => upsert(data).then(syncPublicPassForCurrentUser);
export const saveProfileName = (displayName: string)     => upsert({ displayName }).then(syncPublicPassForCurrentUser);
export const markWelcome     = () => upsert({ welcomeComplete: true }).then(syncPublicPassForCurrentUser);
export const markPrinted     = () => upsert({ printedCard: true }); // no public fields change

/* ============================
   PRINT QUEUE — user + admin
   ============================ */

export const requestPrint = async () => {
  const userId = await uid();
  const userRef = doc(db, "users", userId);
  await ensureQrPass(); // ensures pass exists for preview/print
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
  await ensureQrPassFor(targetUid); // keep pass fresh
};

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
  await ensureQrPassFor(targetUid); // keep pass fresh
};

/* ============================
   EMAIL / WAITLIST
   ============================ */

export const saveEmail = async (email: string): Promise<number> => {
  const userId = await uid();
  const userRef = doc(db, "users", userId);
  const counterRef = doc(db, "counters", "waitlist");

  const START_AT = 100;

  const result = await runTransaction(db, async (tx) => {
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

  await syncPublicPassForCurrentUser(); // keep /v/:slug in sync
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

/** Ensure *another* user (by uid) has a QR pass — returns {slug,url} and
 *  always refreshes the public snapshot with the latest user fields. */
export const ensureQrPassFor = async (
  targetUid: string
): Promise<{ slug: string; url: string }> => {
  const userRef = doc(db, "users", targetUid);
  const userSnap = await getDoc(userRef);
  const u = (userSnap.exists() ? (userSnap.data() as any) : {}) as ChefUser & Record<string, any>;

  // Reuse slug if present; else mint a new one
  let slug: string = (u.qrSlug as string) || makeSlug(8);

  // Avoid a rare collision if we just minted a slug that already exists
  let passRef = doc(db, "passes", slug);
  let passSnap = await getDoc(passRef);
  if (!u.qrSlug && passSnap.exists()) {
    slug = makeSlug(10);
    passRef = doc(db, "passes", slug);
    passSnap = await getDoc(passRef);
  }

  // Canonical public URL
  const origin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://your-app.example.com";
  const url = `${origin}/v/${slug}`;

  // Normalize archetype once
  const chefSlug: string | undefined =
    normalizeArchetype(u.chefType) ?? normalizeArchetype(u.archetype) ?? undefined;

  // Preserve createdAt if pass exists
  const existingCreatedAt = passSnap.exists() ? (passSnap.data() as any)?.createdAt : undefined;

  // Build refreshed public snapshot (avoid empty strings)
  const displayName = (u.displayName || "").trim() || "Chef";
  const email = (u.email || "").trim();
  const waitlistNumber =
    typeof u.waitlistNumber === "number" && Number.isFinite(u.waitlistNumber)
      ? u.waitlistNumber
      : undefined;

  const passData: PassPublic = {
    uid: targetUid,
    displayName,
    chefType: chefSlug || undefined,
    email: email || undefined,
    waitlistNumber,
    wantsGigs: u.wantsGigs === true ? true : undefined,
    wantsSell: u.wantsSell === true ? true : undefined,
    chefFarmerConnect: u.chefFarmerConnect === true ? true : undefined,
    createdAt: existingCreatedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(passRef, passData, { merge: true });

  // Also store slug/url on user for reuse
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

  const next = await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const existing = userSnap.exists()
      ? (userSnap.data() as any).waitlistNumber
      : null;
    if (existing != null) return existing as number;

    const counterSnap = await tx.get(counterRef);
    let value: number;
    if (!counterSnap.exists()) {
      value = START_AT; // first assignment
      tx.set(
        counterRef,
        { value, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } else {
      const curr = (counterSnap.data() as any).value ?? START_AT - 1;
      value = Number(curr) + 1;
      tx.set(counterRef, { value, updatedAt: serverTimestamp() }, { merge: true });
    }

    tx.set(
      userRef,
      {
        waitlistNumber: value,
        updatedAt: serverTimestamp(),
        createdAt: userSnap.exists()
          ? (userSnap.data() as any).createdAt
          : serverTimestamp(),
      },
      { merge: true }
    );

    return value;
  });

  await syncPublicPassForCurrentUser(); // keep /v/:slug accurate
  return next;
};
