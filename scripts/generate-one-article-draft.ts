import { loadEnvConfig } from "@next/env";
import { generateOneArticleDraft } from "../lib/articles/automation/runOneDraft";

loadEnvConfig(process.cwd());

generateOneArticleDraft()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
