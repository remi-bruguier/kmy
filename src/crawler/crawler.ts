import { CrawlerOptions, ScrapedPage } from "./types.js";
import { scrapePage } from "./page.js";
import { URL } from "url";

export class Crawler {
  private visited = new Set<string>();
  private queue: string[] = [];

  constructor(private options: CrawlerOptions) {
    this.queue.push(options.baseUrl);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.origin === new URL(this.options.baseUrl).origin;
    } catch {
      return false;
    }
  }

  private shouldExclude(url: string): boolean {
    if (!this.options.excludePatterns) return false;
    return this.options.excludePatterns.some((pattern) =>
      new RegExp(pattern).test(url)
    );
  }

  async crawl(): Promise<ScrapedPage[]> {
    const results: ScrapedPage[] = [];

    while (this.queue.length > 0) {
      const url = this.queue.shift()!;

      if (this.visited.has(url) || this.shouldExclude(url)) continue;

      try {
        const page = await scrapePage(url);
        this.visited.add(url);
        results.push(page);

        // Add new links to queue
        page.links
          .filter((link) => this.isValidUrl(link))
          .forEach((link) => this.queue.push(link));
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
      }
    }

    return results;
  }
}
