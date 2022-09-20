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
      const docPath = path.join(aptPath, `${doc.fileName}`);
      const etagPath = path.join(aptPath, `${doc.fileName}.etag`);
      let etag: string | null | undefined = undefined;
      const headers: HeadersInit = {};

      if (existsSync(etagPath)) {
        etag = await readFile(etagPath, "utf-8");

        headers["If-None-Match"] = etag;
      }

      console.log(`Fetching ${doc.uri}...`);

      const resp = await fetch(doc.uri, {
        headers,
      });

      if (resp.status === 200) {
        etag = resp.headers.get("etag");

        await writeFile(docPath, await resp.buffer());

        if (etag) {
          await writeFile(etagPath, etag);
        }
      }
    }
  }

  return airports;
}

export async function getAirports(regions?: Region[]): Promise<Airport[]> {
  const tasks = AllRegions
    .filter(([region]) => {
      return !regions?.length || regions.includes(region);
    })
    .map(([_, fetcher]) => fetcher())
    ;

  const results = (await Promise.all(tasks))
    .reduce((list, item) => {
      list.push(...item.airports);

      return list;
    }, [] as Airport[])
    .sort((a, b) => a.icao.localeCompare(b.icao))
    ;

  // Update the VFR flag    
  const vfr = /(2-4-[0-9]|vfr|vrp|visual approach)/i;
  results.forEach((apt) => {
    apt.documents?.forEach((doc) => {
      if (vfr.test(doc.fileName)) {
        doc.vfr = true;
      }
    });
  })

  return results;
}
