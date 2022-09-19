import * as jsdom from "jsdom";
import fetch from "node-fetch";

export const downloadHtml = async (uri: string): Promise<jsdom.JSDOM> => {
  const page = await fetch(uri);
  const doc = new jsdom.JSDOM(await page.text());

  return doc;
}

export const fixText = (value: string): string => {
  if (!value) {
    return value;
  }

  return value
    .replace("–", "-") // Unicode hyphen
    .replace("�", "-") // Unicode replacement char - https://www.fileformat.info/info/unicode/char/fffd/index.htm
    .replace(/\n/g, "")
    .replace(/\//g, "-")
    .replace(/[ ]{2,}/g, " ") // Multiple spaces
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    ;
}

export const getInnerText = (element: Element): string => {
  if (!element.childElementCount) {
    return fixText(element.innerHTML);
  }

  return [...element.children].map((c) => {
    return getInnerText(c);
  }).join("").trim();
}
