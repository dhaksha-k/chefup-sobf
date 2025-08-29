// src/lib/printJobs.ts
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../app/firebase";
import { getUser, ensureQrPass } from "./firestore";

const toPublicUrl = (maybe: string | undefined | null) => {
  if (!maybe) return "";
  if (/^https?:\/\//i.test(maybe)) return maybe;
  return new URL(maybe, window.location.origin).toString();
};

export async function enqueueMyPrintJob() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const u = await getUser();

  // 1) prefer qrUrl already saved on the user
  let qrUrl = toPublicUrl(u?.qrUrl as any);

  // 2) else ask your helper to generate/return it
  if (!qrUrl) {
    const { url } = await ensureQrPass();
    qrUrl = toPublicUrl(url);
  }

  // 3) last-ditch: build from qrSlug if you have one
  if (!qrUrl && (u as any)?.qrSlug) {
    qrUrl = toPublicUrl(`/v/${(u as any).qrSlug}`);
  }

  await setDoc(
    doc(db, "printJobs", uid), // one job per user; swap to addDoc if you want multiples
    {
      uid,
      displayName: u?.displayName || "Chef",
      email: u?.email || "",
      chefType: u?.chefType || "",
      waitlistNumber: u?.waitlistNumber ?? null,
      qrUrl,                              // <- ensure it’s set
      status: "queued",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
