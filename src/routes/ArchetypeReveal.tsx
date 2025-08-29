import { useEffect, useRef, useCallback, useState } from "react";
import ReactCanvasConfetti from "react-canvas-confetti";
import Shell from "../components/Shell";
import { PrimaryButton } from "../components/Buttons";
import { useNavigate, useLocation } from "react-router-dom";

import { getUser } from "../lib/firestore";
import type { ChefType } from "../app/archetype";
import { chefTitle, normalizeArchetype } from "../app/archetype";

export default function ArchetypeReveal() {
  const nav = useNavigate();
  const loc = useLocation();

  // prefer slug from location.state if present; normalize Legacy strings
  const stateSlug = normalizeArchetype((loc.state as any)?.chefType);
  const [chefType, setChefType] = useState<ChefType | undefined>(stateSlug);

  // just store the callable function; avoid strict typing since versions differ
  const confettiFn = useRef<any>(null);

  const handleInit = useCallback((params: any) => {
    confettiFn.current = params?.confetti ?? params;
  }, []);

  const makeShot = (particleRatio: number, opts: any) => {
    if (!confettiFn.current) return;
    confettiFn.current({
      ...opts,
      origin: { x: 0.5, y: 0.6 },
      particleCount: Math.floor(200 * particleRatio),
      colors: ["#254204", "#0a50a8", "#1d71c6", "#2b8a22", "#9dc02a"],
    });
  };

  const fire = () => {
    makeShot(0.25, { spread: 26, startVelocity: 55 });
    makeShot(0.2,  { spread: 60 });
    makeShot(0.35, { spread: 100, decay: 0.91, scalar: 1.2 });
    makeShot(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.5 });
    makeShot(0.1,  { spread: 120, startVelocity: 45 });
  };

  useEffect(() => {
    // Guard + hydrate from Firestore if state is missing
    (async () => {
      const u = await getUser();
      if (!u?.email) return nav("/email");        // email gate
      if (!stateSlug) setChefType(u?.chefType as ChefType | undefined);
      if (!stateSlug && !u?.chefType) return nav("/quiz"); // no result → back to quiz
    })();
  }, [nav, stateSlug]);

  useEffect(() => {
    const id = setTimeout(fire, 50); // fire once after mount
    return () => clearTimeout(id);
  }, []);

  const title = chefTitle(chefType); // <— SAFE: “Chef” if unknown, no double “Chef”

  return (
    <>
      <ReactCanvasConfetti
        onInit={handleInit}
        style={{
          position: "fixed",
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: 9999,
        }}
      />

      <Shell title="Hello there!" subtitle="">
        <div className="text-center py-6">
          <div className="text-4xl font-bold tracking-tight bg-gradient-to-r from-brand-leaf to-brand-sky text-transparent bg-clip-text">
            {title}
          </div>
          <p className="mt-2 text-gray-600">See what’s waiting for you inside.</p>
        </div>

        <PrimaryButton onClick={() => nav("/teaser", { state: { chefType } })}>
          See what’s in store for me →
        </PrimaryButton>
      </Shell>
    </>
  );
}
