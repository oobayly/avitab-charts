import { readFileSync, writeFileSync } from "fs";
import path = require("path");
import proj4 = require("proj4");
import yargs = require("yargs");
import { hideBin } from "yargs/helpers"
import { downloadDocuments, getAirports } from "./aip-fetcher";
import { Airport, Region } from "./aip-fetcher/fetcher";
import { calibrate, extract } from "./vfr";

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
      icao: { alias: "i", type: "string", description: "A comma-separated list of ICAO codes", default: undefined },
      extract: { alias: "e", type: "boolean", description: "A flag indicating whether VFR charts should be extracted from AIP", default: false },
      calibrate: { alias: "c", type: "boolean", description: "A flag indicating whether VFR charts should calibrated", default: false }
    },
    async (args) => {
      const chartsPath = args.path as string;
      const icao = args.icao ? (args.icao as string).split(",") : undefined;
      let airports = loadChartsConfig(chartsPath);

      if (icao?.length) {
        airports = airports.filter((apt) => icao.includes(apt.icao));
      }

      if (args.extract) {
        extract(chartsPath, airports);
      }

      if (args.calibrate) {
        calibrate(chartsPath, airports);
      }
    }
  )
  .command(
    "epsg3857", "Transform coordinates between EPSG:4326 and EPSG:3857",
    {
      from: { alias: "f", type: "string", description: "Comma-separated x,y coordinates" },
      to: { alias: "t", type: "string", description: "Comma-separated WGS84 lat,lng coordinates" },
    },
    (args) => {
      const proj = proj4("EPSG:3857");

      if (args.from) {
        const xy = args.from.split(",").map((item) => parseFloat(item));
        const [lng, lat] = proj.inverse(xy);

        console.log(`${lat},${lng}`);
      } else if (args.to) {
        const [lat, lng] = args.to.split(",").map((item) => parseFloat(item));
        const [x, y] = proj.forward([lng, lat]);

        console.log(`${x},${y}`);
      }
    }
  )
  .options({
    path: { alias: "p", type: "string", description: "The path of the AIP folder", default: "Charts" },
  })
  .help()
  .alias("help", "h")
  .strict()
  .demandCommand()
  .argv
  ;
