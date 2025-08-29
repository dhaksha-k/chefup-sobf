import { useEffect, useState, useRef } from "react";
import Shell from "../components/Shell";
import { getUser, markWelcome, ensureWaitlistNumber } from "../lib/firestore";
import confetti from "canvas-confetti";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { signOut, signInAnonymously } from "firebase/auth";
import { auth } from "../app/firebase";
import { enqueueMyPrintJob } from "../lib/printJobs";

export default function Confirmation() {
  const [num, setNum] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const firedRef = useRef(false);

  const resetForNextChef = async () => {
    try { await signOut(auth); } catch {}
    try { await signInAnonymously(auth); } catch {}
    window.location.assign("/");
  };

  useEffect(() => {
    markWelcome().catch(console.error);
    (async () => {
      const u = await getUser();
      const n = u?.waitlistNumber ?? (await ensureWaitlistNumber());
      setNum(n);
      if (!firedRef.current) { firedRef.current = true; burst(); setTimeout(burst, 350); }
    })();
  }, []);

  const onPrintBadge = async () => {
    try {
      setErr(null);
      setSubmitting(true);
      await enqueueMyPrintJob();   // write printJobs/<uid>
      setQueued(true);
    } catch (e: any) {
      setErr(e?.message || "Missing or insufficient permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title="You're on the ChefUp list 🎉" subtitle="Show this at the booth.">
      <div className="text-center py-8">
        <div className="text-sm text-gray-500 mb-1">Your waitlist number</div>
        <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-brand-leaf to-brand-lime text-transparent bg-clip-text">
          {num ?? "—"}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <SecondaryButton onClick={resetForNextChef}>Start over</SecondaryButton>
        <PrimaryButton onClick={onPrintBadge} disabled={submitting || queued}>
          {submitting ? "Sending…" : queued ? "Queued!" : "Print badge"}
        </PrimaryButton>
      </div>

      {queued && <p className="mt-2 text-sm text-green-700">Sent to the admin print queue.</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </Shell>
  );
}

function burst() {
  confetti({
    particleCount: 160,
    spread: 70,
    origin: { y: 0.2 },
    ticks: 140,
    colors: ["#254204", "#2b8a22", "#9dc02a", "#0a50a8", "#1d71c6"],
  });
}
