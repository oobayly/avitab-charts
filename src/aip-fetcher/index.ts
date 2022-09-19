import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import fetch from "node-fetch";
import * as path from "path";
import { BI } from "./BI";
import { EG } from "./EG";
import { EI } from "./EI";
import { Airport, Fetcher, Region } from "./fetcher";

const AllRegions: [Region, Fetcher][] = [
  ["BI", BI],
  ["EG", EG],
  ["EI", EI],
];

export async function downloadDocuments(targetPath: string, airports?: Airport[]): Promise<Airport[]> {
  if (!airports) {
    airports = await getAirports();
  }

  for (let i = 0; i < airports.length; i++) {
    const { icao, documents } = airports[i];

    if (!documents?.length) {
      continue;
    }

    const aptPath = path.join(targetPath, icao);

    await mkdir(aptPath, {
      recursive: true,
    });

    for (let j = 0; j < documents.length; j++) {
      const doc = documents[j];
      const docPath = path.join(aptPath, `${doc.name}.pdf`);
      // const etagPath = path.join(aptPath, `${doc.name}.pdf.etag`);
      // let etag: string | null | undefined = undefined;

      // if (existsSync(etagPath)) {
      //   etag = await readFile(etagPath, "utf-8");
      // }

      const resp = await fetch(doc.uri, {
        headers: {
          // "If-None-Match": etag ? `"${etag}"` : "*",
          "Accept": "*/*",
        }
      });
      // etag = resp.headers.get("etag");

      await writeFile(docPath, await resp.buffer());

      // if (etag) {
      //   await writeFile(etagPath, etag);
      // }
    }
  }

  // Save the charts configuration
  const configPath = path.join(targetPath, "config.json");

  await writeFile(configPath, JSON.stringify(airports, null, 2));

  return airports;
}

export async function getAirports(...regions: Region[]): Promise<Airport[]> {
  const tasks = AllRegions
    .filter(([region]) => {
      return !regions.length || regions.includes(region);
    })
    .map(([_, fetcher]) => fetcher())
    ;

  const results = await Promise.all(tasks);

  return results
    .reduce((list, item) => {
      list.push(...item.airports);

      return list;
    }, [] as Airport[])
    .sort((a, b) => a.icao.localeCompare(b.icao))
    ;
}
