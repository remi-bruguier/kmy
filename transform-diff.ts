import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join, extname } from "path";

interface Change {
  oldText: string;
  newText: string;
  startIndex: number;
  endIndex: number;
}

function parseChanges(content: string): Change[] {
  const changes: Change[] = [];

  // Only handle strikethrough + bold patterns (multi-line support)
  const strikethroughBoldRegex =
    /~~(.*?)~~\s*(?:\\\*\\\*|\*\*)(.*?)(?:\\\*\\\*|\*\*)/gs;
  let match;

  while ((match = strikethroughBoldRegex.exec(content)) !== null) {
    changes.push({
      oldText: match[1],
      newText: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return changes.sort((a, b) => a.startIndex - b.startIndex);
}

function createDiffHtml(content: string, changes: Change[]): string {
  if (changes.length === 0) return content;

  let result = content;

  // Sort changes by start index in reverse order to avoid index shifting
  const sortedChanges = [...changes].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  for (const change of sortedChanges) {
    const before = result.substring(0, change.startIndex);
    const after = result.substring(change.endIndex);

    // Replace strikethrough + bold with old/new div structure
    const replacement = `<div class="old-text">
  <span class="removed">${change.oldText}</span>
</div>

<div class="new-text">
  <span class="added">${change.newText}</span>
</div>`;

    result = before + replacement + after;
  }

  return result;
}

function transformMarkdown(content: string): string {
  const changes = parseChanges(content);

  if (changes.length > 0) {
    return createDiffHtml(content, changes);
  }

  return content;
}

function addProtectionMarker(content: string): string {
  const marker = "<!-- TRANSFORM_DIFF_MODIFIED: DO NOT OVERWRITE -->";
  if (content.includes(marker)) {
    return content;
  }
  return `${marker}\n\n${content}`;
}

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function scan(currentDir: string) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip certain directories
        if (!["node_modules", ".git", "public", "assets"].includes(item)) {
          scan(fullPath);
        }
      } else if (stat.isFile() && extname(item) === ".md") {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

function processFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, "utf-8");

    // Check if file has strikethrough+bold patterns only (including multi-line)
    const hasStrikethroughBold =
      /~~.*?~~\s*(?:\\\*\\\*|\*\*).*?(?:\\\*\\\*|\*\*)/gs.test(content);

    if (!hasStrikethroughBold) {
      console.log(`⏭️  Skipped ${filePath} (no changes detected)`);
      return true;
    }

    const transformed = transformMarkdown(content);
    const protectedContent = addProtectionMarker(transformed);
    writeFileSync(filePath, protectedContent, "utf-8");
    console.log(`✅ Transformed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  const docsPath = process.argv[2] || "docs";
  const fullDocsPath = resolve(docsPath);

  try {
    const markdownFiles = getAllMarkdownFiles(fullDocsPath);

    if (markdownFiles.length === 0) {
      console.log("No markdown files found in docs folder");
      return;
    }

    console.log(`Found ${markdownFiles.length} markdown files to process:\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of markdownFiles) {
      if (processFile(file)) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error scanning docs folder:`, error);
    process.exit(1);
  }
}

main();
