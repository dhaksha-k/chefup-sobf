import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "qrcode.react";
import { useReactToPrint } from "react-to-print";
import {
  getUser,
  getUserByUid,
  ensureQrPass,
  ensureQrPassFor,
  markPrinted,
} from "../lib/firestore";
import { normalizeArchetype } from "../app/archetype";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

/** SCREEN PREVIEW ONLY (hidden when printing) */
const cardMap = import.meta.glob("../assets/cards/*_front.png", {
  eager: true,
  as: "url",
}) as Record<string, string>;
const cardFor = (slug: string) => cardMap[`../assets/cards/${slug}_front.png`];

// Overlay boxes in % of the 4×6 canvas
const NAME_BOX = { x: 8, y: 36, w: 84, h: 11 };
const QR_BOX   = { x: 9, y: 70, w: 28, h: 24 };

// Ensure QR URLs are absolute
function toPublicUrl(urlOrPath?: string | null) {
  if (!urlOrPath) return "";
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return new URL(urlOrPath, window.location.origin).toString();
}

// ✅ NEW: builder for the public profile URL (slug-based)
function publicProfileUrlFromSlug(slug: string) {
  // change /p/ to your actual public route if needed (e.g., /card/)
  return new URL(`/p/${slug}`, window.location.origin).toString();
}

// ✅ OPTIONAL: try to pull a slug out of any existing URL if your ensureFns don't return one
function tryInferSlugFromUrl(url?: string | null) {
  if (!url) return undefined;
  try {
    const u = new URL(toPublicUrl(url));
    const parts = u.pathname.split("/").filter(Boolean);
    // supports /p/<slug> or /card/<slug>
    const pIdx = parts.findIndex((p) => p === "p" || p === "card");
    if (pIdx >= 0 && parts[pIdx + 1]) return parts[pIdx + 1];
  } catch {}
  return undefined;
}

export default function PrintCard() {
  const [params] = useSearchParams();
  const uidParam = params.get("user") ?? params.get("uid") ?? null;
  const jobId = params.get("job"); // if opened from Admin queue

  const [displayName, setDisplayName] = useState("Chef");
  const [type, setType] = useState("Connector");
  const [qrUrl, setQrUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => cardRef.current!,
    onBeforePrint: () => setPrinting(true),
    onAfterPrint: async () => {
      try {
        if (jobId) {
          const db = getFirestore();
          await updateDoc(doc(db, "printJobs", jobId), {
            status: "printed",
            updatedAt: serverTimestamp(),
          });
        }
        // @ts-ignore (helper may accept optional uid)
        await markPrinted(uidParam || undefined);
      } finally {
        setPrinting(false);
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      const db = getFirestore();

      // ---------- 1) From printJobs ----------
      if (jobId) {
        try {
          const snap = await getDoc(doc(db, "printJobs", jobId));
          if (snap.exists()) {
            const j = snap.data() as any;
            const slug = normalizeArchetype(j?.chefType) || "Connector";
            setDisplayName(j?.displayName || "Chef");
            setType(slug);
            setBgUrl(cardFor(slug) || cardFor("Connector"));

            // ✅ get or mint a public-pass SLUG, then build the public URL
            let passSlug: string | undefined =
              j?.passSlug ||
              tryInferSlugFromUrl(j?.qrUrl);

            if (!passSlug && j?.uid) {
              try {
                const res = await ensureQrPassFor(j.uid); // expect res.slug (prefer)
                passSlug = res?.slug || tryInferSlugFromUrl(res?.url);
              } catch {}
            }

            if (passSlug) {
              const publicUrl = publicProfileUrlFromSlug(passSlug);
              setQrUrl(publicUrl);

              // persist so future prints are instant
              try {
                await updateDoc(doc(db, "printJobs", jobId), {
                  passSlug,
                  qrUrl: publicUrl,
                  updatedAt: serverTimestamp(),
                });
              } catch {}
            } else {
              setQrUrl("");
            }

            if (!cancelled) setReady(true);
            return;
          }
        } catch {
          // fall through
        }
      }

      // ---------- 2) Admin provided a uid ----------
      if (uidParam) {
        try {
          const u = await getUserByUid(uidParam);
          const slug = normalizeArchetype(u?.chefType) || "Connector";
          setDisplayName(u?.displayName || "Chef");
          setType(slug);
          setBgUrl(cardFor(slug) || cardFor("Connector"));

          // ✅ mint/find slug → build public URL
          let passSlug: string | undefined;
          try {
            const res = await ensureQrPassFor(uidParam);
            passSlug = res?.slug || tryInferSlugFromUrl(res?.url);
          } catch {}
          if (passSlug) setQrUrl(publicProfileUrlFromSlug(passSlug));

          if (!cancelled) setReady(true);
          return;
        } catch {
          // ok — continue to self-print
        }
      }

      // ---------- 3) Self-print (current authed user) ----------
      try {
        const u = await getUser();
        const slug = normalizeArchetype(u?.chefType) || "Connector";
        setDisplayName(u?.displayName || "Chef");
        setType(slug);
        setBgUrl(cardFor(slug) || cardFor("Connector"));

        // ✅ mint/find slug → build public URL
        let passSlug: string | undefined;
        try {
          const res = await ensureQrPass();
          passSlug = res?.slug || tryInferSlugFromUrl(res?.url);
        } catch {}
        if (passSlug) setQrUrl(publicProfileUrlFromSlug(passSlug));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uidParam, jobId]);

  // Auto-shrink the name to fit the pill
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let size = 56;
    el.style.fontSize = `${size}px`;
    el.style.lineHeight = "1.08";
    el.style.fontWeight = "700";
    const fits = () => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight;
    while (size > 18 && !fits()) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }, [displayName, type, ready]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div ref={cardRef} className="print-card relative">
        {/* Screen preview background (hidden when printing) */}
        {bgUrl && (
          <img
            src={bgUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover screen-only"
            draggable={false}
          />
        )}

        {/* Name overlay */}
        <div
          className="absolute flex items-center justify-center px-6 text-center select-none"
          style={{
            left: `${NAME_BOX.x}%`,
            top: `${NAME_BOX.y}%`,
            width: `${NAME_BOX.w}%`,
            height: `${NAME_BOX.h}%`,
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          <div ref={nameRef} className="w-full truncate">{displayName}</div>
        </div>

        {/* QR + URL overlay */}
        <div
          className="absolute"
          style={{
            left: `${QR_BOX.x}%`,
            top: `${QR_BOX.y}%`,
            width: `${QR_BOX.w}%`,
            height: `${QR_BOX.h}%`,
          }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center">
            {qrUrl ? (
              <>
                <div style={{ width: "74%", aspectRatio: "1 / 1" }}>
                  <QRCode
                    value={qrUrl}
                    size={1024}
                    style={{ width: "100%", height: "100%" }}
                    includeMargin={false}
                  />
                </div>
                <div
                  className="mt-1 text-center break-all"
                  style={{ fontSize: "10px", lineHeight: 1.1, color: "#2b2b2b", opacity: 0.9 }}
                  title={qrUrl}
                >
                  {qrUrl.replace(/^https?:\/\/(www\.)?/, "")}
                </div>
              </>
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-gray-400 border border-dashed">
                QR…
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        className="no-print mt-6 w-[360px] rounded-lg bg-black text-white py-3 font-medium shadow-sm hover:opacity-95 active:translate-y-px transition disabled:opacity-50"
        onClick={() => handlePrint?.()}
        disabled={!ready || printing}
      >
        {printing ? "Printing…" : "Print overlays"}
      </button>

      <style>{`
        .print-card { width: 4in; height: 6in; border-radius: 0; overflow: hidden; background: transparent; box-shadow: 0 10px 30px rgba(0,0,0,.12); }
        @page { size: 4in 6in; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .screen-only { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-card { box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
