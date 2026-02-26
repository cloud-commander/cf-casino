export type TablePhase = "IDLE" | "SPINNING" | "RESULT";

export type Jurisdiction = {
  code: string;
  name: string;
  flag: string;
  isAllowed: boolean;
};

export const JURISDICTIONS: Jurisdiction[] = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", isAllowed: true },
  { code: "MT", name: "Malta", flag: "🇲🇹", isAllowed: true },
  { code: "US-NV", name: "Nevada, USA", flag: "🇺🇸", isAllowed: false },
  { code: "SG", name: "Singapore", flag: "🇸🇬", isAllowed: false },
];
