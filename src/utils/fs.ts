import fs from "fs-extra";
import path from "path";
import { URL } from "url";
import { ScrapedPage } from "../crawler/types.js";

function isFileProtected(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, "utf-8");
    return content.includes(
      "<!-- TRANSFORM_DIFF_MODIFIED: DO NOT OVERWRITE -->"
    );
  } catch {
    return false;
  }
}

export async function savePage(
  page: ScrapedPage,
  outputDir: string
): Promise<void> {
  const { url, title, content } = page;
  const parsedUrl = new URL(url);
  let relativePath = parsedUrl.pathname.replace(/\/$/, "");
  if (!relativePath) relativePath = "index";
  const outputPath = path.join(outputDir, `${relativePath}.md`);

  if (isFileProtected(outputPath)) {
    console.log(`⚠️  Skipping protected file: ${outputPath}`);
    return;
  }

  await fs.ensureDir(path.dirname(outputPath));
  const markdown = `# ${title}\n\n来源网址：[${url}](${url})\n\n## 内容\n\n${content}\n`;
  await fs.writeFile(outputPath, markdown);
}

export async function createIndex(
  pages: Array<{ url: string; title: string }>,
  outputDir: string
): Promise<void> {
  const indexPath = path.join(outputDir, "README.md");
  const markdown = `# Scraped Pages\n\nTotal pages: ${
    pages.length
  }\n\n## Pages\n\n${pages
    .map((page) => `- [${page.title}](${page.url})`)
    .join("\n")}\n\n---\n*Generated by Kemoway Scraper*\n`;
  await fs.writeFile(indexPath, markdown);
}
