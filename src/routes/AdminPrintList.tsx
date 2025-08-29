import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore, doc, updateDoc, serverTimestamp,
  collection, query, orderBy, onSnapshot,
} from "firebase/firestore";

type JobStatus = "queued" | "printing" | "printed" | "denied";
type Job = {
  id: string;
  uid: string;
  displayName?: string;
  email?: string;
  chefType?: string;
  waitlistNumber?: number | null;
  qrUrl?: string;
  status?: JobStatus;
  createdAt?: any;
};

export default function AdminPrintList() {
  const [rows, setRows] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<JobStatus | "all">("queued");
  const nav = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const qy = query(collection(db, "printJobs"), orderBy("createdAt", "desc"));
    return onSnapshot(qy, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Job[]);
    });
  }, [db]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = rows;
    if (tab !== "all") list = list.filter((r) => (r.status ?? "queued") === tab);
    if (!term) return list;
    return list.filter((r) =>
      (r.displayName || "").toLowerCase().includes(term) ||
      (r.email || "").toLowerCase().includes(term) ||
      (r.chefType || "").toLowerCase().includes(term) ||
      String(r.waitlistNumber ?? "").includes(term)
    );
  }, [rows, q, tab]);

  const setStatus = async (id: string, status: JobStatus) =>
    updateDoc(doc(db, "printJobs", id), { status, updatedAt: serverTimestamp() });

  const openPrint = async (job: Job) => {
    await setStatus(job.id, "printing");
    nav(`/print?uid=${job.uid}&job=${job.id}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-3">Admin · Print queue</h1>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="inline-flex rounded-xl border p-1 bg-white">
          {(["queued","printing","printed","denied","all"] as const).map((t) => (
            <button
              key={t}
              className={`px-3 py-1 rounded-lg text-sm ${tab===t?"bg-black text-white":"text-gray-700"}`}
              onClick={() => setTab(t)}
            >{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>

        <input
          className="w-full md:w-80 rounded-xl border px-3 py-2"
          placeholder="Search name, email, archetype, number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Archetype</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No jobs yet.</td></tr>
            ) : filtered.map((r) => {
              const status = r.status ?? "queued";
              const canPrint = status !== "printed" && status !== "denied";
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.waitlistNumber ?? "—"}</td>
                  <td className="px-4 py-2">{r.displayName ?? "—"}</td>
                  <td className="px-4 py-2">{r.chefType ?? "—"}</td>
                  <td className="px-4 py-2">{status}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button className="rounded-lg border px-3 py-1" onClick={() => openPrint(r)} disabled={!canPrint}>Print</button>
                      <button className="rounded-lg border px-3 py-1" onClick={() => setStatus(r.id, "printed")} disabled={!canPrint}>Mark printed</button>
                      <button className="rounded-lg border px-3 py-1 text-red-600" onClick={() => setStatus(r.id, "denied")} disabled={status==="denied"}>Deny</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
