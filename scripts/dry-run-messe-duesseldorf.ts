import { fetchMesseDuesseldorfEvents } from "../lib/messe/sources/duesseldorf";

async function main() {
  const result = await fetchMesseDuesseldorfEvents();
  if (result.error) throw new Error(`Messe dry-run failed: ${result.error}`);

  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  for (const event of result.events) {
    if (ids.has(event.sourceEventId)) duplicateIds.push(event.sourceEventId);
    ids.add(event.sourceEventId);
  }
  const sorted = [...result.events].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const withOfficialUrl = sorted.filter((event) => event.officialUrl).length;

  console.log(JSON.stringify({
    ok: duplicateIds.length === 0,
    sourceProvider: result.sourceProvider,
    eventCount: sorted.length,
    skippedEventCount: result.skippedEventCount,
    duplicateEventIdCount: duplicateIds.length,
    withOfficialUrl,
    dateRange: sorted.length ? [sorted[0].startsOn, sorted.at(-1)?.endsOn] : null,
    sample: sorted.slice(0, 5),
  }, null, 2));

  if (duplicateIds.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
