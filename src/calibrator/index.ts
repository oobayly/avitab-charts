import { existsSync, readFileSync, writeFileSync } from "fs";
import { imageSize } from "image-size";
import * as path from "path";
import proj4 = require("proj4");
import { Document } from "../aip-fetcher/fetcher";

interface Calibration {
  x1: number;
  y1: number;
  latitude1: number;
  longitude1: number;
  x2: number;
  y2: number;
  latitude2: number;
  longitude2: number;
  prerotate: 0 | 1;
}

interface WorldFile {
  pixelWidth: number;
  yRotation: number;
  xRotation: number;
  pixelHeight: number;
  upperLeft: { x: number, y: number };
}

const getCalibrationFromPgw = (rasterPath: string, pgwPath: string): Calibration | undefined => {
  const worldFile = readWorldFile(pgwPath);

  if (!worldFile) {
    return undefined;
  }

  const { width, height } = imageSize(rasterPath);
  const { pixelWidth, pixelHeight } = worldFile;
  const { x, y } = worldFile.upperLeft;

  const x1 = x - (pixelWidth / 2);
  const y1 = y - (pixelHeight / 2);
  const x2 = x1 + (pixelWidth * width!);
  const y2 = y1 + (pixelHeight * height!);

  const proj = proj4("EPSG:3857");

  const [longitude1, latitude1] = proj.inverse([x1, y1]);
  const [longitude2, latitude2] = proj.inverse([x2, y2]);

  return {
    x1: 0, y1: 0, latitude1, longitude1,
    x2: 1, y2: 1, latitude2, longitude2,
    prerotate: 0,
  };
}

const getFolder = (chartPath: string, doc: Document): string => {
  return path.join(chartPath, "VFR", doc.icao);
}

const readConfig = (configPath: string): any => {
}

const readWorldFile = (pgwPath: string): WorldFile | undefined => {
  if (!existsSync(pgwPath)) {
    return undefined;
  }

  const pgw = readFileSync(pgwPath, "ascii")
    .split(/\n/)
    .map((l) => parseFloat(l))
    ;

  // See https://en.wikipedia.org/wiki/World_file
  return {
    pixelWidth: pgw[0],
    yRotation: pgw[1],
    xRotation: pgw[2],
    pixelHeight: pgw[3],
    upperLeft: {
      x: pgw[4],
      y: pgw[5],
    },
  };
}

export const calibrate = async (chartPath: string, doc: Document): Promise<Document> => {
  const folder = getFolder(chartPath, doc);
  const pdfPath = path.join(folder, doc.fileName);
  const baseName = pdfPath.replace(/\.pdf$/, "");
  const configPath = `${pdfPath}.json`;
  const pngPath = `${baseName}.png`;
  const pgwPath = `${baseName}.pgw`;

  const calibration = getCalibrationFromPgw(pngPath, pgwPath);

  if (calibration) {
    writeFileSync(
      `${pngPath}.json`,
      JSON.stringify({ calibration }, null, 2),
      "utf-8",
    );
  }

  return doc;
}
