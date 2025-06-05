import fs from "fs-extra";
import path from "path";
import { URL } from "url";
import { ScrapedPage } from "../crawler/types.js";

export function urlToPath(url: string, baseUrl: string): string {
  const parsedUrl = new URL(url);
  const parsedBase = new URL(baseUrl);

  let relativePath = parsedUrl.pathname;
  if (relativePath.endsWith("/")) {
    relativePath += "index";
  }

  return relativePath.replace(/^\//, "");
}

export async function savePage(
  page: ScrapedPage,
  outputDir: string,
  baseUrl: string
): Promise<void> {
  const filePath = path.join(outputDir, urlToPath(page.url, baseUrl));
  const dirPath = path.dirname(filePath);

  await fs.ensureDir(dirPath);

  const markdown = `# ${page.title}

URL: ${page.url}

${page.content}
`;

  await fs.writeFile(`${filePath}.md`, markdown);
}

export async function savePages(
  pages: ScrapedPage[],
  outputDir: string,
  baseUrl: string
): Promise<void> {
  await fs.ensureDir(outputDir);

  for (const page of pages) {
    await savePage(page, outputDir, baseUrl);
  }
}
