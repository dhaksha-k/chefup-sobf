import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { PrimaryButton } from "../components/Buttons";
import { login } from "../lib/adminAuth";

export default function AdminLogin() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(u.trim(), p.trim())) nav("/admin", { replace: true });
    else setErr("Invalid credentials.");
  };

  return (
    <Shell title="Admin sign in" subtitle="Restricted area">
      <form onSubmit={onSubmit} className="grid gap-3 max-w-sm">
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Username</span>
          <input className="rounded-lg border px-3 py-2" value={u} onChange={(e)=>setU(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Password</span>
          <input className="rounded-lg border px-3 py-2" type="password" value={p} onChange={(e)=>setP(e.target.value)} />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <PrimaryButton type="submit">Sign in</PrimaryButton>
      </form>
    </Shell>
  );
}
