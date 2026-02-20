type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
};

export type DisplayItem = {
  regNumber: string;
  isPremium: boolean;
};

const UNKNOWN = "Не знаю";

function norm(s: string) {
  return (s ?? "").trim();
}

function isPremiumOrder(orderType: string) {
  return norm(orderType).toLowerCase() === "premium";
}

export function groupParticipantsByProgramForDisplay(
  participants: Participant[],
  opts?: { unknownValue?: string }
): Record<string, DisplayItem[]> {
  const unknownValue = opts?.unknownValue ?? UNKNOWN;

  const map: Record<
    string,
    Record<string, { count: number; anyPremium: boolean }>
  > = {};

  const unknownPremiumByProgram: Record<string, boolean[]> = {};

  for (const p of participants) {
    const prog = norm(p.program) || "Невідома";
    const reg = norm(p.regNumber);

    if (!map[prog]) map[prog] = {};
    if (!map[prog][reg]) map[prog][reg] = { count: 0, anyPremium: false };

    map[prog][reg].count += 1;

    const prem = isPremiumOrder(p.orderType);

    if (prem) map[prog][reg].anyPremium = true;

    if (reg === unknownValue) {
      (unknownPremiumByProgram[prog] ??= []).push(prem);
    }
  }

  const result: Record<string, DisplayItem[]> = {};

  for (const prog of Object.keys(map)) {
    const byReg = map[prog];
    const out: DisplayItem[] = [];

    for (const reg of Object.keys(byReg)) {
      const info = byReg[reg];

      if (reg === unknownValue) {
        const flags = unknownPremiumByProgram[prog] ?? [];
        for (let i = 0; i < info.count; i++) {
          out.push({ regNumber: reg, isPremium: flags[i] ?? false });
        }
      } else {
        out.push({ regNumber: reg, isPremium: info.anyPremium });
      }
    }

    out.sort((a, b) => {
      const aU = a.regNumber === unknownValue;
      const bU = b.regNumber === unknownValue;
      if (aU && !bU) return 1;
      if (!aU && bU) return -1;

      return a.regNumber.localeCompare(b.regNumber, "uk", { numeric: true });
    });

    result[prog] = out;
  }

  return result;
}
