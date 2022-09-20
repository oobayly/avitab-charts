import * as proj4 from "proj4";

const EPSG_4326 = "+proj=longlat +datum=WGS84 +no_defs";
const EPSG_3857 = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs";

export const toEpsg3857 = (x: number, y: number) => {
  return proj4(EPSG_4326, EPSG_3857).forward({ x, y });
}

export const fromEpsg3857 = (x: number, y: number) => {
  return proj4(EPSG_3857, EPSG_4326).forward({ x, y });
}
