import { Airport, Fetcher } from "./fetcher";
import { downloadHtml, fixText, getInnerText } from "./helpers";

const IndexUri = "https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/AIP/";

const getAirports = async (baseUri: string): Promise<Airport[]> => {
  const page = await downloadHtml(`${baseUri}eAIP/EG-menu-en-GB.html`);
  const container = page.window.document.getElementById("AD-2details")!;
  const links = [...container.getElementsByTagName("a")];

  return links
    .filter((link) => /^AD-2.[A-Z]{4}$/.test(link.id))
    .map((link) => {
      const icao = link.id.substring(5);
      const uri = `${baseUri}eAIP/${link.href}`;
      const name = getInnerText(link.getElementsByClassName("SD")[0]);

      return {
        icao,
        name,
        uri,
      };
    })
    .sort((a, b) => a.icao.localeCompare(b.icao))
    ;
}

const getCurrentUri = async (): Promise<string> => {
  const doc = await downloadHtml(IndexUri);
  const [current] = [...doc.window.document.getElementsByTagName("a")]
    .filter((link) => link.innerHTML.includes("Current"))
    ;

  let { href } = current;
  const index = href.lastIndexOf("/");

  return href.substring(0, index + 1);
}

const getDocuments = async (baseUri: string, apt: Airport): Promise<void> => {
  const { icao, name, uri } = apt;

  console.log(`Getting documents for ${icao} - ${name}...`);

  const doc = await downloadHtml(uri);
  const div = doc.window.document.getElementById(`${icao}-AD-2.24`);
  const rows = [...div!.getElementsByTagName("tr")];

  apt.documents = [];

  for (let i = 0; i < rows.length; i += 2) {
    const name = getInnerText(rows[i]);
    const link = rows[i + 1].getElementsByTagName("a")[0];

    apt.documents.push({
      icao,
      id: fixText(getInnerText(link)),
      name,
      uri: `${baseUri}eAIP/${link.href}`,
    });
  }
}

export const EG: Fetcher = async () => {
  const current = await getCurrentUri();
  const airports = await getAirports(current);

  console.log(`Gettings documents for ${airports.length} airports...`);

  for (let i = 0; i < airports.length; i++) {
    await getDocuments(current, airports[i]);
  }

  return {
    region: "EG",
    airports,
  };
};
