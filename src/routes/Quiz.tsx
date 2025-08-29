import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mapToArchetype } from "../app/archetype";
import { saveQuizTags } from "../lib/firestore";
import Shell from "../components/Shell";
import CardOption from "../components/CardOption";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";

// Brand questions (8 archetypes)
const Q = {
  q1: [
    "I’m booking gigs & pop-ups constantly",
    "I cook from family roots & tradition",
    "I bring people together — chefs, farms, Community",
    "I push boundaries with experiments & tech",
    "I tell stories through food & culture",
    "I feed my Community — mutual aid & food justice",
    "I’m building a scalable brand/product line",
    "I’m mobile — trucks, residencies, travel gigs",
  ],
  q2: [
    "More paid gigs / pop-ups",
    "Farm partnerships / sourcing direct",
    "Collabs with chefs & farmers",
    "Experimentation / fermentation / R&D",
    "Content, storytelling, media",
    "Community events / mutual aid",
    "Launch or scale a product (CPG, sauces)",
    "Traveling residencies / food truck ops",
  ],
  q3: [
    "A high-collaboration network (chefs × farms × diners)",
    "Transparent local sourcing & heritage-first",
    "Tools to scale my brand & operations",
    "A creative lab to experiment and iterate",
    "A platform to reach customers via gigs",
    "Community impact & access-first ecosystem",
    "Flexible mobility to cook anywhere",
    "Space to share culture & stories through food",
  ],
};
const PROMPTS = [
  "How do you describe your current cooking life?",
  "What do you want help with right now?",
  "What’s your ideal food ecosystem?",
];
const HELP = [
  "Choose one option",
  "Choose all that apply",
  "Choose one option",
];

export default function Quiz() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState<string[]>([]);
  const [a3, setA3] = useState("");

  const canNext = (step === 1 && !!a1) || (step === 2 && a2.length > 0) || (step === 3 && !!a3);

  const onNext = async () => {
    if (step < 3) { setStep(step + 1); return; }

    const chefType = mapToArchetype(a1, a2, a3);
    try {
      await saveQuizTags({
        chefType,
        wantsGigs: a2.includes(Q.q2[0]),
        chefFarmerConnect: a2.includes(Q.q2[1]) || a2.includes(Q.q2[2]),
        wantsSell: a2.includes(Q.q2[6]),
      });
    } catch (e) {
      console.error("saveQuizTags failed:", e);
    } finally {
      // on quiz completion:
      nav("/email");
    }
  };

  return (
    <Shell
      title="What's My Chef Archetype"
      subtitle="Answer 3 quick questions to get matched."
      step={step}
      total={3}
    >

      {/* Question prompt header */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {PROMPTS[step - 1]}
        </h2>
        <p className="text-sm text-gray-500">{HELP[step - 1]}</p>
      </div>
      {step === 1 && (
        <section className="grid gap-3">
          {Q.q1.map((opt) => (
            <CardOption key={opt} title={opt} active={a1 === opt} onClick={() => setA1(opt)} />
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-3">
          {Q.q2.map((opt) => {
            const active = a2.includes(opt);
            return (
              <CardOption
                key={opt}
                title={opt}
                checkbox
                active={active}
                onClick={() => setA2((prev) => (active ? prev.filter((x) => x !== opt) : [...prev, opt]))}
              />
            );
          })}
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-3">
          {Q.q3.map((opt) => (
            <CardOption key={opt} title={opt} active={a3 === opt} onClick={() => setA3(opt)} />
          ))}
        </section>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <SecondaryButton onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</SecondaryButton>
        <PrimaryButton disabled={!canNext} onClick={onNext}>
          {step < 3 ? "Continue" : "See your match"}
        </PrimaryButton>
      </div>
    </Shell>
  );
}
