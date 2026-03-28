import { getTournamentStartDisplayModel } from "@/utils/normalizeTime";

type Props = {
  raw?: string;
};

export function FormattedTime({ raw }: Props) {
  const model = getTournamentStartDisplayModel(raw);
  if (!model) return null;

  if (model.mode === "plain") {
    return <span className="ml-1 font-black text-zinc-700">{model.text}</span>;
  }

  if (model.mode === "timeOnly") {
    return <span className="ml-1 font-black text-zinc-700">{model.time}</span>;
  }

  return (
    <>
      <span className="ml-1 font-black text-zinc-700">{model.time}</span>
      <span className="font-medium text-zinc-500">, {model.date}</span>
    </>
  );
}
