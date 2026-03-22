export async function runUpdate(eventId: string) {
  await fetch(
    `${process.env.BASE_URL}/api/google/resolve-regnumbers?eventId=${eventId}`,
    { method: "POST" }
  );

  // await fetch(
  //   `${process.env.BASE_URL}/api/google/refresh-participant-time?eventId=${eventId}`,
  //   { method: "POST" }
  // );
}
