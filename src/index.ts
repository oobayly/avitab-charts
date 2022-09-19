import path = require("path");
import { downloadDocuments, getAirports } from "./aip-fetcher";

getAirports()
  .then((airports) => {

    return downloadDocuments(path.join("./", "charts"), airports);
    // return airports;
  })
  .then((airports) => {

  })
  .catch((e) => {
    console.log(e);
  })
  ;
