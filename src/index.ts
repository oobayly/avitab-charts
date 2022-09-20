import { readFileSync, writeFileSync } from "fs";
import path = require("path");
import yargs = require("yargs");
import { hideBin } from "yargs/helpers"
import { downloadDocuments, getAirports } from "./aip-fetcher";
import { Airport, Region } from "./aip-fetcher/fetcher";

const argv = yargs(hideBin(process.argv))
  .command(
    "fetch", "Fetch AIP documents",
    (yargs) => {
      yargs.options({
        path: { alias: "p", type: "string", description: "The path of the AIP folder", default: "charts" },
        download: { alias: "d", type: "boolean", description: "A flag indicating whether documents should be downloaded", default: true },
        cached: { alias: "c", type: "boolean", description: "A flag indicating whether the cached config should be used", default: false },
        regions: { alias: "r", type: "string", description: "A comma separated list of regions", default: undefined },
      })
    },
    async (args) => {
      const chartsPath = args.path as string;
      const chartsConfig = path.join(chartsPath, "config.json");
      const regions = args.regions ? (args.regions as string).toUpperCase().split(/,/) as Region[] : undefined;
      const airports = args.cached
        ? JSON.parse(readFileSync(chartsConfig, "utf-8")) as Airport[]
        : await getAirports(regions);

      if (args.download) {
        await downloadDocuments(chartsPath, airports);
      }

      if (!args.cached) {
        writeFileSync(chartsConfig, JSON.stringify(airports, null, 2), "utf-8");
      }
    }
  )
  .help()
  .alias("help", "h")
  .strict()
  .demandCommand()
  .argv
  ;
