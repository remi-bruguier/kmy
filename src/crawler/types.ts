export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

export interface CrawlerOptions {
  baseUrl: string;
  outputDir: string;
  maxDepth?: number;
  excludePatterns?: string[];
}
