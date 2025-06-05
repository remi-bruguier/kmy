import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedContent {
  title: string;
  content: string;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
}

async function scrapePage(url: string): Promise<ScrapedContent> {
  try {
    const decodedUrl = decodeURIComponent(url);
    const response = await axios.get(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements but keep body
    $(
      "svg, script, style, noscript, iframe, form, nav, footer, header, aside, button, input, select, textarea, img, video, audio, canvas, embed, object, param, source, track, wbr, br, hr, meta, link, base"
    ).remove();

    // Get title
    const title = $("title").text().trim();

    // Get main content
    const mainContent = $(
      "main, article, .main-content, .content, #content, .page-content, .page__content, .contact-page, .contact-form"
    ).first();
    const content = mainContent.length ? mainContent.text() : $("body").text();

    return {
      title,
      content: cleanText(content),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `HTTP Error scraping ${url}:`,
        error.response?.status,
        error.response?.statusText
      );
    } else {
      console.error(`Error scraping ${url}:`, error);
    }
    throw error;
  }
}

export { scrapePage, ScrapedContent };
