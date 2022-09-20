import { Airport, Fetcher } from "./fetcher";
import { downloadHtml, getInnerText } from "./helpers";

const BaseUri = "http://iaip.iaa.ie/iaip/";
const StartUri = `${BaseUri}aip_directory.htm`;

async function getAirports(): Promise<Airport[]> {
  const doc = await downloadHtml(StartUri);
  const links = [...doc.window.document.getElementsByTagName("a")];

  return links
    .filter((link) => /charts/.test(link.href))
    .reduce((list, x) => {
      const uri = `${BaseUri}${x.href}`;
      const icao = uri.match(/aip_([a-z]{4})_/)![1].toLocaleUpperCase();

      if (!list.some((x) => x.icao === icao)) {
        const name = x.innerHTML.replace(" Chart Information", "").trim();

        list.push({
          icao,
          name,
          uri,
        });
      }

      return list;
    }, [] as Airport[])
    .sort((a, b) => a.icao.localeCompare(b.icao))
    ;
}

async function getDocuments(apt: Airport): Promise<void> {
  const { icao, name, uri } = apt;

  console.log(`Getting documents for ${icao} - ${name}...`);

  const doc = await downloadHtml(uri);
  const rows = [...doc.window.document.getElementsByTagName("tr")];

  // Remove the title row
  rows.shift();

  apt.documents = rows.map((r) => {
    const name = getInnerText(r.children[0].children[0]);
    const link = r.getElementsByTagName("a")[0];
    const id = getInnerText(link).replace(icao, "").trim();
    const uri = `${BaseUri}${link.href}`;

    return {
      icao,
      id,
      fileName: `${id} ${name}.pdf`,
      name,
      uri,
    }
  })
}

export const EI: Fetcher = async () => {
  const airports = await getAirports();

  console.log(`Gettings documents for ${airports.length} airports...`);

  for (let i = 0; i < airports.length; i++) {
    await getDocuments(airports[i]);
  }

  return {
    region: "EI",
    airports,
  };
};
