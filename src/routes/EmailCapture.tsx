import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { PrimaryButton } from "../components/Buttons";
import { getUser, saveEmail } from "../lib/firestore";

export default function EmailCapture() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Guard: must have name first
  useEffect(() => {
    (async () => {
      try {
        const u = await getUser();
        if (!u?.displayName) nav("/");     // no name → back to start
        if (u?.email) setEmail(u.email);   // prefill if known
      } catch { }
    })();
  }, [nav]);

  const submit = async () => {
    const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!okEmail) return setErr("Enter a valid email");

    setErr(null);
    setLoading(true);
    try {
      await saveEmail(email.trim());
      nav("/archetype");
    } catch (e) {
      console.error(e);
      setErr("Couldn’t save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Unlock Your Result" subtitle="Enter your email to reveal your archetype.">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full border border-gray-200 rounded-2xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
          />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <PrimaryButton disabled={loading} onClick={submit}>
          {loading ? "Saving…" : "Reveal →"}
        </PrimaryButton>
      </div>
    </Shell>
  );
}
