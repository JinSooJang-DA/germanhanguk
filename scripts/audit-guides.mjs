import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const { data: guides, error } = await supabase
  .from("guides")
  .select("slug,category,title,description,content,sources,last_verified_at,status,seo_description")
  .eq("status", "published");

if (error) throw error;

const today = new Date();
const rows = guides.map((guide) => {
  const verifiedAt = guide.last_verified_at ? new Date(guide.last_verified_at) : null;
  const verifiedAge = verifiedAt ? Math.floor((today - verifiedAt) / 86400000) : null;
  const contentLength = guide.content?.length || 0;
  const sourceCount = guide.sources?.length || 0;
  const flags = [];
  if (contentLength < 600) flags.push("thin<600");
  else if (contentLength < 900) flags.push("short<900");
  if (sourceCount < 2) flags.push("sources<2");
  if (verifiedAge === null) flags.push("unverified");
  else if (verifiedAge > 120) flags.push("verify>120d");
  return { ...guide, contentLength, sourceCount, verifiedAge, flags };
});
const categories = [...new Set(rows.map((row) => row.category))].sort();
console.log(`Published guides: ${rows.length}`);
console.log("category | count | avg chars | thin | short | src<2 | oldest verify");

for (const category of categories) {
  const items = rows.filter((row) => row.category === category);
  const avg = Math.round(items.reduce((sum, row) => sum + row.contentLength, 0) / items.length);
  const thin = items.filter((row) => row.contentLength < 600).length;
  const short = items.filter((row) => row.contentLength < 900).length;
  const weakSources = items.filter((row) => row.sourceCount < 2).length;
  const oldest = Math.max(...items.map((row) => row.verifiedAge ?? 99999));
  console.log(`${category} | ${items.length} | ${avg} | ${thin} | ${short} | ${weakSources} | ${oldest}d`);
}

const flagged = rows
  .filter((row) => row.flags.length)
  .sort((a, b) => a.contentLength - b.contentLength);

console.log(`\nFlagged guides: ${flagged.length}`);
for (const row of flagged) {
  console.log(`${row.contentLength}\t${row.sourceCount}\t${row.category}\t${row.slug}\t${row.flags.join(",")}`);
}

const staleNumbers = rows.filter((row) => /202[0-5]/.test(row.content || ""));
if (staleNumbers.length) {
  console.log("\nGuides containing older year references (manual context check):");
  staleNumbers.forEach((row) => console.log(`${row.category}\t${row.slug}`));
}
