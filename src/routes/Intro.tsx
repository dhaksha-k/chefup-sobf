import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { PrimaryButton } from "../components/Buttons";
import { getUser, saveProfileName } from "../lib/firestore";

export default function Intro() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getUser();
        if (u?.displayName) setName(u.displayName);
      } catch {}
    })();
  }, []);

  const submit = async () => {
    if (!name.trim()) return setErr("Please enter your name");
    setErr(null);
    setLoading(true);
    try {
      await saveProfileName(name.trim());
      nav("/quiz");
    } catch (e) {
      console.error(e);
      setErr("Couldn’t save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="What's My Chef Archetype?" subtitle="First, tell us your name.">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Your name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Taylor Nguyen"
            className="mt-1 w-full border border-gray-200 rounded-2xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
          />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <PrimaryButton disabled={loading} onClick={submit}>
          {loading ? "Saving…" : "Start →"}
        </PrimaryButton>
      </div>
    </Shell>
  );
}
