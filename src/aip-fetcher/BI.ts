import { Airport, Fetcher } from "./fetcher";
import { downloadHtml, fixText, getInnerText } from "./helpers";

const IndexUri = "https://eaip.isavia.is/";

const getAirports = async (baseUri: string): Promise<Airport[]> => {
  const page = await downloadHtml(`${baseUri}eAIP/menu.html`);
  const container = page.window.document.getElementById("ADis-ISdetails")!;
  const links = [...container.getElementsByTagName("a")];

  return links
    .filter((link) => {
      return /^AD [A-Z]{4}.+(is-IS)$/.test(link.id);
    })
    .reduce((list, link) => {
      // IDs aren't unique here
      const icao = link.id.substring(3, 7);

      if (!list.some((x) => x.icao === icao)) {
        const uri = `${baseUri}eAIP/${encodeURI(link.href)}`;
        const name = getInnerText(link.getElementsByClassName("Number")[0])
          .substring(8);

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

const getCurrentUri = async (): Promise<string> => {
  const doc = await downloadHtml(IndexUri);
  const current = doc.window.document.getElementById("current") as HTMLAnchorElement;

  return `${current.href}/`;
}

const getDocuments = async (baseUri: string, apt: Airport): Promise<void> => {
  const { icao, name, uri } = apt;

  console.log(`Getting documents for ${icao} - ${name}...`);

  const doc = await downloadHtml(uri);
  const links = [...doc.window.document.getElementsByTagName("a")]
    .filter((link) => /\.pdf$/.test(link.href));

  // const div = doc.window.document.getElementById(`${icao}-AD-2.24`);
  // const rows = [...div!.getElementsByTagName("tr")];

  apt.documents = links.map((link) => {
    const row = link.parentElement!.parentElement!;
    const { href } = link;
    const name = getInnerText(row.firstElementChild!);

    return {
      icao,
      name,
      fileName: `${name}.pdf`,
      uri: `${baseUri}eAIP/${href}`,
    };
  });

  // for (let i = 0; i < rows.length; i += 2) {
  //   const name = getInnerText(rows[i]);
  //   const link = rows[i + 1].getElementsByTagName("a")[0];

  //   apt.documents.push({
  //     icao,
  //     id: fixText(getInnerText(link)),
  //     name,
  //     uri: `${baseUri}eAIP/${link.href}`,
  //   });
  // }
}

export const BI: Fetcher = async () => {
  const current = await getCurrentUri();
  const airports = await getAirports(current);

  console.log(`Gettings documents for ${airports.length} airports...`);

  for (let i = 0; i < airports.length; i++) {
    await getDocuments(current, airports[i]);
  }

  return {
    region: "BI",
    airports,
  };
};
