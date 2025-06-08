import axios from "axios";
import * as cheerio from "cheerio";
import type * as cheerioType from "cheerio";
import { ScrapedPage } from "./types.js";
import { URL } from "url";
// @ts-ignore
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
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .replace(/#{2,}\s+/g, "# ") // Fix double headers
    .trim();
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

function isBlockTag(tag: string) {
  return [
    "div",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
  ].includes(tag);
}

function domToMarkdown($: cheerio.CheerioAPI, nodes: any[]): string {
  let out: string[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      const text = cleanText(node.data || "");
      if (text) out.push(text);
      continue;
    }
    if (node.type !== "tag") continue;
    const tag = node.tagName.toLowerCase();
    let block = "";
    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = parseInt(tag[1]);
        const headerText = $(node).text().trim();
        block = `#`.repeat(level) + ` ${cleanText(headerText)}`;
        break;
      }
      case "ul":
      case "ol": {
        const items = $(node)
          .children("li")
          .map((_, li) => `- ${cleanText($(li).text())}`)
          .get();
        if (items.length) block = items.join("\n");
        break;
      }
      case "li": {
        block = `- ${cleanText($(node).text())}`;
        break;
      }
      case "p": {
        const text = $(node).text().trim();
        if (text) block = cleanText(text);
        break;
      }
      case "br": {
        out.push("  \\n");
        break;
      }
      case "table": {
        const rows = $(node)
          .find("tr")
          .map((_, tr) =>
            $(tr)
              .find("td,th")
              .map((_, td) => cleanText($(td).text()))
              .get()
              .join(" | ")
          )
          .get();
        if (rows.length) block = rows.join("\n");
        break;
      }
      case "div": {
        block = node.children
          ? node.children
              .map((child: any) => domToMarkdown($, [child]))
              .filter(Boolean)
              .join("\n\n")
          : "";
        break;
      }
      default: {
        if (node.children && node.children.length) {
          block = domToMarkdown($, node.children);
        }
        break;
      }
    }
    if (block) {
      if (isBlockTag(tag)) {
        out.push("\n\n", block, "\n\n");
      } else {
        out.push(block);
      }
    }
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractContent($: cheerio.CheerioAPI): string {
  const mainContent = $(
    "main, article, .main-content, .content, #content, .product-content"
  ).first();
  if (!mainContent.length) return "";
  return domToMarkdown($, mainContent[0].children);
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(url).origin;

    // Remove unwanted elements
    $(
      "script, style, .cart, .search, .social-share, .footer-copyright, .footer-copyright-text, .breadcrumb, .mega-menu-list, #locator-app-block, .product-card"
    ).remove();

    // Remove Shopify section elements with pattern shopify-section-template--{number}__main-product
    $('[class*="shopify-section-template-"][class*="__main-product"]').remove();
    $('[id*="shopify-section-template-"][id*="__main-product"]').remove();

    // Remove judge.me review widget blocks
    $('[id*="judge_me_reviews_review_widget"]').remove();

    // Get title
    const title = $("title").text().trim().replace(/\s+/g, " ");

    // Get main content with headers
    const mainContent = extractContent($);

    // Get product details if it's a product page
    const productDetails = extractProductDetails($);

    // Add CSS link and combine content
    const content = [
      '<link rel="stylesheet" href="/kmy/assets/css/markdown.css">',
      title,
      mainContent,
      productDetails,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Get all links
    const links = $("a")
      .map((_, el) => {
        let href = $(el).attr("href");
        if (!href) return null;
        // Remove trailing -%F0%9F%8C%B1 if present
        href = href.replace(/-%F0%9F%8C%B1$/, "");
        try {
          return decodeURIComponent(href);
        } catch {
          return href;
        }
      })
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
