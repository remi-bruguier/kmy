import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedPage } from "./types.js";
import { URL } from "url";
import { logger } from "../utils/logger.js";

function normalizeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    logger.warn(`Invalid URL: ${url}`);
    return url;
  }
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
}

function extractProductDetails($: cheerio.CheerioAPI): string {
  const details: string[] = [];

  // Price
  const price = $(".price").first().text().trim();
  if (price) details.push(`**Price:** ${price}`);

  // Product description
  const description = $(".product-description, .product__description")
    .text()
    .trim();
  if (description) details.push(`\n**Description:**\n${description}`);

  // Specifications
  const specs = $(".product-specs, .product__specs, .specifications");
  if (specs.length) {
    details.push("\n**Specifications:**");
    specs.find("li, tr").each((_, el) => {
      const text = $(el).text().trim();
      if (text) details.push(`- ${text}`);
    });
  }

  // Features
  const features = $(".product-features, .product__features");
  if (features.length) {
    details.push("\n**Features:**");
    features.find("li").each((_, el) => {
      const text = $(el).text().trim();
      if (text) details.push(`- ${text}`);
    });
  }

  return details.join("\n");
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(url).origin;

    // Remove unwanted elements
    $(
      "script, style, nav, footer, .header, .footer, .sidebar, .menu, .cart, .search, .social-share"
    ).remove();

    // Get title
    const title = $("title").text().trim().replace(/\s+/g, " ");

    // Get main content
    const mainContent = $(
      "main, article, .main-content, .content, #content, .product-content"
    )
      .text()
      .trim();

    // Get product details if it's a product page
    const productDetails = extractProductDetails($);

    // Combine content
    const content = [title, mainContent, productDetails]
      .filter(Boolean)
      .map(cleanText)
      .join("\n\n");

    // Get all links
    const links = $("a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter((href): href is string => !!href)
      .map((href) => normalizeUrl(href, baseUrl))
      .filter((href) => href.startsWith(baseUrl));

    return {
      url,
      title,
      content,
      links: [...new Set(links)],
    };
  } catch (error) {
    logger.error(`Error scraping ${url}:`, error);
    throw error;
  }
}
