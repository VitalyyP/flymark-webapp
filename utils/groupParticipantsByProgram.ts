export type ParticipantLike = {
  regNumber: string;
  program: string;
};

export function groupRegNumbersByProgram(
  participants: ParticipantLike[],
  keepDuplicatesValue = "Не знаю"
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  const seenPerProgram: Record<string, Set<string>> = {};

  for (const p of participants) {
    const prog = (p.program ?? "").trim();
    if (!prog) continue;

    if (!grouped[prog]) {
      grouped[prog] = [];
      seenPerProgram[prog] = new Set();
    }

    const num = (p.regNumber ?? "").trim();
    if (!num) continue;

    if (num === keepDuplicatesValue) {
      grouped[prog].push(num);
      continue;
    }

    if (!seenPerProgram[prog].has(num)) {
      seenPerProgram[prog].add(num);
      grouped[prog].push(num);
    }
  }

  return grouped;
}
