import { loadEnvConfig } from "@next/env";
import { syncMesseDuesseldorf } from "../lib/messe/sync";

loadEnvConfig(process.cwd());

syncMesseDuesseldorf()
  .then((summary) => console.log(JSON.stringify(summary, null, 2)))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
