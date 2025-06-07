# Translation Instructions

## Process

1. Run `pnpm start` to recrawl, scrape and generate markdown files
2. For each markdown file in the docs folder:
   - Add style tags at the top of the file
   - Analyze French quality
   - Improve 50% of content (focusing on worst parts)
   - Format changes with:
     - Light red background (#ffebeb) for old text
     - Light green background (#ebffeb) for new text
     - Use divs with classes ONLY for changed paragraphs
     - Add padding and margins
     - Within changed paragraphs:
       - Strikethrough old text
       - Bold new text
   - Keep original structure
   - Only change sections with significant improvement needed

## IMPORTANT: Div Structure

When making changes, ALWAYS wrap changed paragraphs in divs:

```html
<div class="old-text">Original text here</div>

<div class="new-text">Improved text here</div>
```

## Styling

Add this at the top of each markdown file:

```html
<style>
  .old-text {
    background-color: #ffebeb;
    padding: 10px;
    margin: 5px 0;
    border-radius: 4px;
  }
  .new-text {
    background-color: #ebffeb;
    padding: 10px;
    margin: 5px 0;
    border-radius: 4px;
  }
  /* For inline changes within paragraphs */
  .removed {
    text-decoration: line-through;
    color: #666;
  }
  .added {
    font-weight: bold;
  }
</style>
```

## Current Target

docs/pages/a-propos-de-nous.md

## Notes

- Only translate if French quality is significantly improved
- Keep technical terms unchanged
- Preserve all links and formatting
- Maintain consistent tone and style
- Run `pnpm start` before starting translation
- Change 50% of content, focusing on worst parts
- Use strikethrough and bold for inline changes
- Only wrap changed paragraphs in divs
- Add style tags at the top of each file
- ALWAYS use div structure for changes
