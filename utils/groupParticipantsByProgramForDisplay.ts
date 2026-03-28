type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
};

export type OrderDisplayVariant = "default" | "premium" | "green" | "blue";

export type DisplayItem = {
  regNumber: string;
  orderVariant: OrderDisplayVariant;
  program: string;
};

const UNKNOWN = "Не знаю";

function norm(s: string) {
  return (s ?? "").trim();
}

const VARIANT_RANK: Record<OrderDisplayVariant, number> = {
  default: 0,
  blue: 1,
  green: 2,
  premium: 3,
};

function mergeOrderVariants(
  a: OrderDisplayVariant,
  b: OrderDisplayVariant
): OrderDisplayVariant {
  return VARIANT_RANK[a] >= VARIANT_RANK[b] ? a : b;
}

function orderTypeToVariant(orderType: string): OrderDisplayVariant {
  const t = norm(orderType).toLowerCase();
  if (t === "*") return "premium";
  if (t === "1") return "green";
  if (t === "2") return "blue";
  return "default";
}

export function orderVariantTextClass(variant: OrderDisplayVariant): string {
  switch (variant) {
    case "premium":
      return "text-red-600";
    case "green":
      return "text-green-600";
    case "blue":
      return "text-blue-600";
    default:
      return "text-zinc-800";
  }
}

export function groupParticipantsByProgramForDisplay(
  participants: Participant[],
  opts?: { unknownValue?: string }
): Record<string, DisplayItem[]> {
  const unknownValue = opts?.unknownValue ?? UNKNOWN;

  const map: Record<
    string,
    Record<string, { count: number; variant: OrderDisplayVariant }>
  > = {};

  const unknownVariantByProgram: Record<string, OrderDisplayVariant[]> = {};

  for (const p of participants) {
    const prog = norm(p.program) || "Невідома";
    const reg = norm(p.regNumber);

    if (!map[prog]) map[prog] = {};
    if (!map[prog][reg]) {
      map[prog][reg] = { count: 0, variant: "default" };
    }

    map[prog][reg].count += 1;

    const v = orderTypeToVariant(p.orderType);
    map[prog][reg].variant = mergeOrderVariants(map[prog][reg].variant, v);

    if (reg === unknownValue) {
      (unknownVariantByProgram[prog] ??= []).push(v);
    }
  }

  const result: Record<string, DisplayItem[]> = {};

  for (const prog of Object.keys(map)) {
    const byReg = map[prog];
    const out: DisplayItem[] = [];

    for (const reg of Object.keys(byReg)) {
      const info = byReg[reg];

      if (reg === unknownValue) {
        const flags = unknownVariantByProgram[prog] ?? [];
        for (let i = 0; i < info.count; i++) {
          out.push({
            regNumber: reg,
            orderVariant: flags[i] ?? "default",
            program: prog ?? false,
          });
        }
      } else {
        out.push({
          regNumber: reg,
          orderVariant: info.variant,
          program: prog,
        });
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
