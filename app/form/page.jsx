import ParticipantForm from "./ParticipantForm";

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const name = params.participant || "";
  const eventId = params.event || "";

  let data;

  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL
      }/api/get-participant?event=${eventId}&name=${encodeURIComponent(name)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      data = await res.json();
    }
  } catch (e) {
    console.error("Error fetching categories:", e);
  }

  return <ParticipantForm name={name} results={data.results} />;
}
