import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';

// Scheduled every hour: deletes the per-IP scan counters (hashed IPs) of all
// past hours, so they are kept at most ~2 hours – as stated in
// public/datenschutz.html. Daily totals (no personal data) are kept.

const currentBerlinHour = (now = new Date()): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
};

export default async () => {
  const store = getStore({ name: 'scan-limits', consistency: 'strong', region: 'eu-central-1' });
  const keep = `ip-hour/${currentBerlinHour()}/`;
  const { blobs } = await store.list({ prefix: 'ip-hour/' });
  const old = blobs.filter((b) => !b.key.startsWith(keep));
  await Promise.all(old.map((b) => store.delete(b.key)));
  console.log(`Deleted ${old.length} expired per-IP scan counters`);
};

export const config: Config = {
  schedule: '@hourly',
};
