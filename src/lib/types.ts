import type { ChefType } from "../app/archetype";

export type PrintStatus = "pending" | "approved" | "denied" | "printed";

export type ChefUser = {
  displayName?: string;
  email?: string;
  chefType?: ChefType;

  wantsGigs?: boolean;
  chefFarmerConnect?: boolean;
  wantsSell?: boolean;

  waitlistNumber?: number;
  betaAccess?: boolean;
  welcomeComplete?: boolean;
  printedCard?: boolean;
  createdAt?: number;

  printStatus?: PrintStatus;
  printRequestedAt?: any; // serverTimestamp
  printApprovedAt?: any;
  printDeniedAt?: any;
  approvedBy?: string;
  deniedBy?: string;
  printedAt?: any;

    // add these so printJobs.ts compiles
  qrUrl?: string;   // absolute or relative URL to the QR pass
  qrSlug?: string;  // optional slug you can turn into /v/<slug>
  

};
