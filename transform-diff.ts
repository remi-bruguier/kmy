import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface Change {
  oldText: string;
  newText: string;
  startIndex: number;
  endIndex: number;
}

function parseChanges(line: string): Change[] {
  const changes: Change[] = [];
  const regex = /~~(.*?)~~\s*(?:\\\*\\\*|\*\*)(.*?)(?:\\\*\\\*|\*\*)/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    changes.push({
      oldText: match[1],
      newText: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return changes;
}

function createDiffHtml(line: string, changes: Change[]): string {
  if (changes.length === 0) return line;

  // Build the old version with removed spans
  let oldVersion = line;
  let newVersion = line;

  // Sort changes by start index in reverse order to avoid index shifting
  const sortedChanges = [...changes].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  for (const change of sortedChanges) {
    const before = line.substring(0, change.startIndex);
    const after = line.substring(change.endIndex);

    // For old version: replace with just the old text wrapped in removed span
    const oldReplacement = `<span class="removed">${change.oldText}</span>`;
    oldVersion = before + oldReplacement + after;

    // For new version: replace with just the new text wrapped in added span
    const newReplacement = `<span class="added">${change.newText}</span>`;
    newVersion = before + newReplacement + after;
  }

  return `<div class="old-text">
  ${oldVersion}
</div>

<div class="new-text">
  ${newVersion}
</div>`;
}

function transformMarkdown(content: string): string {
  const lines = content.split("\n");
  const transformedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const changes = parseChanges(line);

    if (changes.length > 0) {
      transformedLines.push(createDiffHtml(line, changes));
    } else {
      transformedLines.push(line);
    }
  }

  return transformedLines.join("\n");
}

function addProtectionMarker(content: string): string {
  const marker = "<!-- TRANSFORM_DIFF_MODIFIED: DO NOT OVERWRITE -->";
  if (content.includes(marker)) {
    return content;
  }
  return `${marker}\n\n${content}`;
}

function main() {
  const filePath = process.argv[2] || "docs/pages/a-propos-de-nous.md";
  const fullPath = resolve(filePath);

  try {
    const content = readFileSync(fullPath, "utf-8");
    const transformed = transformMarkdown(content);
    const protectedContent = addProtectionMarker(transformed);
    writeFileSync(fullPath, protectedContent, "utf-8");
    console.log(`✅ Transformed ${filePath}`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    process.exit(1);
  }
}

main();
