import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { PrimaryButton } from "../components/Buttons";

export default function TeaserDashboard() {
  const nav = useNavigate();
  const cards = [
    { title: "Delivery Boost", desc: "Connect with delivery partners and farmers" },
    { title: "Book Gigs", desc: "Upcoming gigs and chef opportunities" },
    { title: "Meet Your Farmer", desc: "Direct chef-to-farmer collaboration" },
    { title: "Get Certified", desc: "Badging and verification system" }
  ];

  return (
    <Shell
      title="A peek at what's coming"
      subtitle="These features will unlock for early access members soon."
    >
      <div className="grid gap-3">
        {cards.map((c) => (
          <div
            key={c.title}
            className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">{c.title}</div>
                <div className="text-sm text-gray-600">{c.desc}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-brand-lime/20 text-brand-olive border border-brand-lime/50">
                Locked
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={() => nav("/done")}>Continue</PrimaryButton>
      </div>
    </Shell>
  );
}
