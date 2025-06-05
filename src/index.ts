import { Command } from "commander";
import { Crawler } from "./crawler/crawler.js";
import { savePages } from "./utils/fs.js";

const program = new Command();

program
  .name("kemoway")
  .description("Website scraper for content translation")
  .version("1.0.0");

program
  .requiredOption("-u, --url <url>", "Base URL to scrape")
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("-e, --exclude <patterns...>", "URL patterns to exclude")
  .action(async (options) => {
    const crawler = new Crawler({
      baseUrl: options.url,
      outputDir: options.output,
      excludePatterns: options.exclude,
    });

    console.log(`Starting crawl of ${options.url}`);
    const pages = await crawler.crawl();
    console.log(`Found ${pages.length} pages`);

    await savePages(pages, options.output, options.url);
    console.log(`Saved pages to ${options.output}`);
  });

program.parse();
