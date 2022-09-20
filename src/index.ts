import { execSync } from "child_process";
import { copyFileSync, existsSync, fstat, mkdirSync, readFile, readFileSync, writeFileSync } from "fs";
import path = require("path");
import yargs = require("yargs");
import { hideBin } from "yargs/helpers"
import { downloadDocuments, getAirports } from "./aip-fetcher";
import { Airport, Document, Region } from "./aip-fetcher/fetcher";
import { fromEpsg3857 } from "./projection";

const loadChartsConfig = (chartsPath: string): Airport[] => {
  return JSON.parse(readFileSync(
    path.join(chartsPath, "config.json"),
    "utf-8"
  )) as Airport[];
}

const saveChartsConfig = (chartsPath: string, airports: Airport[]) => {
  writeFileSync(
    path.join(chartsPath, "config.json"),
    JSON.stringify(airports, null, 2),
    "utf-8"
  );
}

const argv = yargs(hideBin(process.argv))
  .command(
    "fetch", "Fetch AIP documents",
    {
      download: { alias: "d", type: "boolean", description: "A flag indicating whether documents should be downloaded", default: true },
      cached: { alias: "c", type: "boolean", description: "A flag indicating whether the cached config should be used", default: false },
      regions: { alias: "r", type: "string", description: "A comma separated list of regions", default: undefined },
    },
    async (args) => {
      const chartsPath = args.path as string;
      const regions = args.regions ? (args.regions as string).toUpperCase().split(/,/) as Region[] : undefined;
      const airports = args.cached ? loadChartsConfig(chartsPath) : await getAirports(regions);

      if (args.download) {
        await downloadDocuments(chartsPath, airports);
      }

      if (!args.cached) {
        saveChartsConfig(chartsPath, airports);
      }
    }
  )
  .command(
    "vfr", "",
    {
      icao: { alias: "i", type: "string", description: "This ICAO code for the airport to convert", default: undefined },
    },
    async (args) => {
      const chartsPath = args.path as string;
      const airports = loadChartsConfig(chartsPath);
      const icao = args.icao;

      const vfr = airports
        .reduce((list, apt) => {
          if (!icao || apt.icao === icao) {
            if (apt.documents?.length) {
              list.push(...apt.documents.filter((d) => d.vfr));
            }
          }

          return list;
        }, [] as Document[]);

      vfr.forEach((doc) => {
        const srcFile = path.join(chartsPath, doc.icao, doc.fileName);
        const trgFolder = path.join(chartsPath, "VFR", doc.icao);
        const trgFile = path.join(trgFolder, doc.fileName);
        const trgFileConfig = `${trgFile}.json`;
        const trgFilePng = `${trgFile}.png`;
        let config: { rotate: number } = { rotate: 0 };

        mkdirSync(trgFolder, { recursive: true });
        copyFileSync(srcFile, trgFile);

        if (existsSync(trgFileConfig)) {
          config = JSON.parse(readFileSync(trgFileConfig, "utf-8"));
        } else {
          writeFileSync(trgFileConfig, JSON.stringify(config), "utf-8");
        }

        execSync(`convert -density 300 -rotate ${config.rotate} "${trgFile}" "${trgFilePng}"`);
      });
    }
  )
  .command(
    "epsg3857", "Transform coordinates between EPSG:4326 and EPSG:3857",
    {
      from: { alias: "f", type: "string" },
      to: { alias: "t", type: "string" },
    },
    (args) => {
      if (args.from) {
        const [x, y] = args.from.split(",").map((item) => parseFloat(item));
        const resp = fromEpsg3857(x, y);

        console.log(resp);
      } else if (args.to) {

      }

    }
  )
  .options({
    path: { alias: "p", type: "string", description: "The path of the AIP folder", default: "charts" },
  })
  .help()
  .alias("help", "h")
  .strict()
  .demandCommand()
  .argv
  ;
