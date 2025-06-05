import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedPage } from "./types.js";

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  // Remove script and style elements
  $("script, style").remove();

  // Get all text content
  const content = $("body").text().replace(/\s+/g, " ").trim();

  // Get all links
  const links = $("a")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((href): href is string => !!href);

  return {
    url,
    title: $("title").text().trim(),
    content,
    links,
  };
}
