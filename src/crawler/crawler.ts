import { scrapePage } from "./page.js";
import { savePage, createIndex } from "../utils/fs.js";
import { logger } from "../utils/logger.js";

export interface CrawlerOptions {
  baseUrl: string;
  outputDir: string;
  excludePatterns: string[];
  maxPages?: number;
}

export class Crawler {
  private visited: Set<string> = new Set();
  private queue: string[] = [];
  private results: Array<{ url: string; title: string }> = [];

  constructor(private options: CrawlerOptions) {
    this.queue.push(options.baseUrl);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // console.log({ parsedUrl: parsedUrl.pathname });
      const baseUrl = new URL(this.options.baseUrl);

      // Skip if not same origin
      if (parsedUrl.origin !== baseUrl.origin) {
        console.log("💥 not same origin");
        return false;
      }

      // Skip if matches exclude patterns
      if (
        this.options.excludePatterns.some((pattern) =>
          new RegExp(pattern).test(url)
        )
      ) {
        return false;
      }

      // Skip common Shopify paths
      const skipPaths: string[] = [
        // "/cdn/",
        // "/cart",
        // "/account",
        // "/search",
        // "/collections/all",
        // "/products.json",
        // "/admin",
        // "/apps",
        // "/checkout",
        // "/orders",
        // "/wishlist",
        // "/compare",
        // "/reviews",
        // "/blog/tagged",
        // "/blogs/tagged",
        // "/blogs/news",
        // "/blogs/press",
        // "/blogs/events",
        // "/blogs/faq",
        // "/blogs/about",
        // "/blogs/terms",
        // "/blogs/privacy",
        // "/blogs/shipping",
        // "/blogs/returns",
        // "/blogs/refund",
        // "/blogs/cancellation",
        // "/blogs/legal",
        // "/blogs/cookies",
        // "/blogs/sitemap",
        // "/blogs/rss",
        // "/blogs/feed",
        // "/blogs/atom",
        // "/blogs/json",
        // "/blogs/xml",
        // "/blogs/yaml",
        // "/blogs/txt",
        // "/blogs/csv",
        // "/blogs/pdf",
        // "/blogs/doc",
        // "/blogs/docx",
        // "/blogs/xls",
        // "/blogs/xlsx",
        // "/blogs/ppt",
        // "/blogs/pptx",
        // "/blogs/zip",
        // "/blogs/rar",
        // "/blogs/7z",
        // "/blogs/tar",
        // "/blogs/gz",
        // "/blogs/bz2",
        // "/blogs/xz",
        // "/blogs/iso",
        // "/blogs/img",
        // "/blogs/video",
        // "/blogs/audio",
        // "/blogs/other",
      ];

      if (skipPaths.some((path) => parsedUrl.pathname.startsWith(path))) {
        // console.log(`😫 skipping path ${parsedUrl.pathname}`);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async crawl(): Promise<void> {
    logger.info(`Starting crawl of ${this.options.baseUrl}`);

    while (this.queue.length > 0) {
      const url = this.queue.shift()!;

      if (this.visited.has(url)) {
        continue;
      }

      if (this.options.maxPages && this.visited.size >= this.options.maxPages) {
        logger.info(`Reached maximum page limit of ${this.options.maxPages}`);
        break;
      }

      try {
        logger.info(`Crawling ${url}`);
        const page = await scrapePage(url);
        this.visited.add(url);

        // Save the page
        await savePage(page, this.options.outputDir);
        this.results.push({ url: page.url, title: page.title });

        // Add new links to queue
        for (const link of page.links) {
          if (!this.visited.has(link) && this.isValidUrl(link)) {
            this.queue.push(link);
          }
        }
      } catch (error) {
        logger.error(`Error crawling ${url}:`, error);
      }
    }

    // Create index file
    await createIndex(this.results, this.options.outputDir);
    logger.info(`Crawl completed. Found ${this.visited.size} pages.`);
  }
}
