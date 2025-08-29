import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Shell from "../components/Shell";
import { chefTitle, normalizeArchetype } from "../app/archetype";
import { getPublicPass, type PassPublic } from "../lib/firestore";

// ---------- THEME MAP (tweak hexes anytime) ----------
type Theme = {
    headerFrom: string;
    headerTo: string;
    accentText: string;
    buttonBg: string;
    buttonText: string;
    buttonHoverOpacity?: number; // 0..1 (defaults 0.92)
    calloutBg: string; // subtle tinted background
    calloutBorder: string;
};

function getTheme(t?: ReturnType<typeof normalizeArchetype>): Theme {
    switch (t) {
        case "connector":
            return {
                headerFrom: "#0B6E75",
                headerTo: "#21C4CF",
                accentText: "#0B8E95",
                buttonBg: "#0B6E75",
                buttonText: "#FFFFFF",
                calloutBg: "#E6FAFB",
                calloutBorder: "#9DE8EE",
            };
        case "hustler":
            return {
                headerFrom: "#033B34",
                headerTo: "#0C5B53",
                accentText: "#2BCB9A",
                buttonBg: "#0C5B53",
                buttonText: "#FFFFFF",
                calloutBg: "#E9FBF5",
                calloutBorder: "#B6F5DF",
            };
        case "innovator":
            return {
                headerFrom: "#4D0C55",
                headerTo: "#A01E73",
                accentText: "#F871A0",
                buttonBg: "#6E1767",
                buttonText: "#FFFFFF",
                calloutBg: "#FEEDF5",
                calloutBorder: "#FBC6DC",
            };
        case "legacy":
            return {
                headerFrom: "#5A2A14",
                headerTo: "#8A451E",
                accentText: "#F3C8A6",
                buttonBg: "#6E351B",
                buttonText: "#1B100B",
                calloutBg: "#FFF4EC",
                calloutBorder: "#FFDCC6",
            };
        case "nomad":
            return {
                headerFrom: "#F28A00",
                headerTo: "#FFB23A",
                accentText: "#7A3E00",
                buttonBg: "#C96500",
                buttonText: "#FFFFFF",
                calloutBg: "#FFF3E0",
                calloutBorder: "#FFD699",
            };
        case "storyteller":
            return {
                headerFrom: "#2B0D59",
                headerTo: "#6C2CB1",
                accentText: "#C77DFF",
                buttonBg: "#4B1989",
                buttonText: "#FFFFFF",
                calloutBg: "#F7EDFF",
                calloutBorder: "#E6C9FF",
            };
        case "chefpreneur":
            return {
                headerFrom: "#0F2131",
                headerTo: "#1A2E40",
                accentText: "#E7CD95",
                buttonBg: "#1A2E40",
                buttonText: "#E7CD95",
                calloutBg: "#FBF6E7",
                calloutBorder: "#F2E2B7",
            };
        case "community":
            return {
                headerFrom: "#C24C12",
                headerTo: "#E97717",
                accentText: "#FFB340",
                buttonBg: "#C24C12",
                buttonText: "#FFFFFF",
                calloutBg: "#FFF4E8",
                calloutBorder: "#FFD7A6",
            };
        default:
            return {
                headerFrom: "#334155",  // slate
                headerTo: "#64748B",
                accentText: "#0EA5E9",
                buttonBg: "#0F172A",
                buttonText: "#FFFFFF",
                calloutBg: "#F1F5F9",
                calloutBorder: "#E2E8F0",
            };
    }
}

export default function PublicCard() {
    const { slug } = useParams<{ slug: string }>();
    const [data, setData] = useState<PassPublic | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<"email" | "link" | null>(null);

    useEffect(() => {
        (async () => {
            if (!slug) return;
            const d = await getPublicPass(slug);
            setData(d);
            setLoading(false);
        })();
    }, [slug]);

    if (loading) {
        return (
            <Shell title="Loading…" subtitle="">
                <div className="py-12 text-center text-gray-500">Loading…</div>
            </Shell>
        );
    }
    if (!data) {
        return (
            <Shell title="Not found" subtitle="This link may be invalid or expired.">
                <div className="py-12 text-center text-gray-600">We couldn’t find that pass.</div>
            </Shell>
        );
    }

    const t = normalizeArchetype(data.chefType);
    const theme = getTheme(t);
    const title = chefTitle(t);

    // Build the single-line collaboration focus text
    const focus =
        [
            data.chefFarmerConnect ? "Partnering with farms" : null,
            data.wantsGigs ? "Open to gigs" : null,
            data.wantsSell ? "Selling produce/products" : null,
        ].filter(Boolean).join(" • ") || "—";


    // vCard content
    const vcard = buildVCard({
        name: data.displayName || "ChefUp Contact",
        email: data.email || "",
        title,
        notes: [
            data.waitlistNumber ? `Waitlist #${data.waitlistNumber}` : null,
            t ? `Type: ${title}` : null,
            data.wantsGigs ? "Open to gigs" : null,
            data.wantsSell ? "Selling produce/products" : null,
            data.chefFarmerConnect ? "Interested in partnering with farms" : null,
            "Shared via ChefUp by FarmdOut",
        ]
            .filter(Boolean)
            .join("\n"),
    });

    const downloadVcf = () => {
        const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeName = (data.displayName || "chefup-contact").replace(/[^\w\-]+/g, "_");
        a.href = url;
        a.download = `${safeName}.vcf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const copyEmail = async () => {
        if (!data.email) return;
        try {
            await navigator.clipboard?.writeText(data.email);
            setCopied("email");
            setTimeout(() => setCopied(null), 1200);
        } catch { }
    };

    const shareLink = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: `${data.displayName} — ${title}`, text: "ChefUp contact", url });
            } else {
                await navigator.clipboard?.writeText(url);
                setCopied("link");
                setTimeout(() => setCopied(null), 1200);
            }
        } catch { }
    };

    return (
        <Shell title="">
            <div className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl">
                {/* Header */}
                <div
                    className="h-24"
                    style={{
                        backgroundImage: `linear-gradient(90deg, ${theme.headerFrom}, ${theme.headerTo})`,
                    }}
                />

                {/* Body */}
                <div className="p-6 sm:p-8 -mt-12">
                    {/* Avatar */}
                    <div className="mx-auto w-24 h-24 rounded-2xl bg-white shadow-lg grid place-items-center text-3xl font-bold">
                        <span>{initials(data.displayName || "Chef")}</span>
                    </div>

                    {/* Title block */}
                    <div className="mt-4 text-center">
                        <div className="text-sm text-slate-500">ChefUp by FarmdOut</div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            {data.displayName || "Chef"}
                        </h1>
                        <div className="mt-1 text-sm font-medium" style={{ color: theme.accentText }}>
                            {title}
                        </div>
                    </div>

                    {/* Farmer connect callout (if enabled) */}
                    {data.chefFarmerConnect && (
                        <div
                            className="mt-6 rounded-2xl p-4 border"
                            style={{ backgroundColor: theme.calloutBg, borderColor: theme.calloutBorder }}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-xl">🌱</div>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: theme.accentText }}>
                                        Open to partnering with farms
                                    </div>
                                    <div className="text-sm" style={{ color: theme.accentText }}>
                                        This chef is interested in connecting directly with farmers.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info rows */}
                    <div className="mt-6 space-y-3">
                        <InfoRow label="WAITLIST NUMBER">
                            <span
                                className="text-4xl font-extrabold tracking-tight leading-none"
                                style={{ color: theme.accentText }}
                            >
                                {data.waitlistNumber ?? "—"}
                            </span>
                        </InfoRow>

                        <InfoRow
                            label="EMAIL"
                            rightSlot={
                                data.email ? (
                                    <button
                                        onClick={copyEmail}
                                        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-95 active:translate-y-px transition"
                                        style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
                                        aria-label="Copy email"
                                    >
                                        Copy
                                    </button>
                                ) : undefined
                            }
                        >
                            {data.email ? (
                                <a className="underline break-all" href={`mailto:${data.email}`}>
                                    {data.email}
                                </a>
                            ) : (
                                <span className="text-slate-400">—</span>
                            )}
                        </InfoRow>

                        <InfoRow label="COLLABORATION FOCUS">
                            <span>{focus}</span>
                        </InfoRow>

                    </div>

                    {/* Actions */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            onClick={downloadVcf}
                            className="rounded-xl py-3 px-4 text-sm font-medium shadow-sm hover:opacity-95 active:translate-y-px transition"
                            style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
                            title="Download .vcf to add to Contacts"
                        >
                            📇 Add to contacts
                        </button>

                        <button
                            onClick={shareLink}
                            className="rounded-xl py-3 px-4 text-sm font-medium shadow-sm hover:opacity-95 active:translate-y-px transition"
                            style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
                            title="Share this profile"
                        >
                            🔗 Share
                        </button>
                    </div>

                    {/* Tiny toasts */}
                    <div className="mt-2 h-5 text-center text-xs" style={{ color: theme.accentText }}>
                        {copied === "email" && "Email copied!"}
                        {copied === "link" && "Link copied!"}
                    </div>
                </div>
            </div>
        </Shell>
    );
}

/* ---------- helpers ---------- */

function initials(name: string) {
    return name
        .split(/\s+/)
        .map((s) => s[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("");
}

function buildVCard(opts: { name: string; email?: string; title?: string; notes?: string }) {
    const esc = (s?: string) =>
        String(s || "")
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/,/g, "\\,")
            .replace(/;/g, "\\;");
    const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${esc(opts.name)}`,
        opts.email ? `EMAIL;TYPE=INTERNET:${esc(opts.email)}` : "",
        opts.title ? `TITLE:${esc(opts.title)}` : "",
        `ORG:ChefUp by FarmdOut`,
        opts.notes ? `NOTE:${esc(opts.notes)}` : "",
        "END:VCARD",
    ].filter(Boolean);
    return lines.join("\n");
}

function InfoRow({
    label,
    children,
    rightSlot,
}: {
    label: string;
    children: React.ReactNode;
    rightSlot?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-500">
                        {label}
                    </div>
                    <div className="mt-1 text-[15px] text-slate-800">{children}</div>
                </div>
                {rightSlot}
            </div>
        </div>
    );
}
