# Coursera Fast Course & Certificate Extractor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-success.svg)](scripts/)
[![Client-Side Privacy](https://img.shields.io/badge/Security-100%25%20Client--Side-brightgreen.svg)](docs/STEP_BY_STEP_GUIDE.md)
[![Platform](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Brave-blueviolet.svg)](scripts/)

Extract all completed Coursera courses, certificates, credential IDs, and verification URLs in seconds. Zero external API calls, zero login tokens required, 100% private.

---

## The Problem: Why Internal API Scraping Fails

When attempting to automate Coursera course extraction using `fetch()` or `curl` against internal API endpoints like `/api/accomplishments.v1`, requests fail with:

```
SyntaxError: Unexpected token '<', "<html>..." is not valid JSON
```

### Root Cause
Coursera protects internal API endpoints behind Cloudflare bot detection, HTML verification walls, and session routing checks. When an unverified script calls these endpoints, the server returns an HTML challenge page instead of raw JSON.

### The Solution: Direct DOM Extraction
When you are logged into Coursera on the [**Completed** tab](https://www.coursera.org/my-learning?tab=completed), your browser has already cleared all authentication checks. The DOM already contains every course title, completion card, and certificate link.

By extracting directly from the rendered webpage:
- No backend API endpoints are called.
- No authentication tokens or cookies leave your browser session.
- Extraction runs entirely in your local browser sandbox and downloads a clean CSV instantly.

---

## Quickstart

### 1. Open the Coursera Completed Tab
Navigate to:  
[https://www.coursera.org/my-learning?tab=completed](https://www.coursera.org/my-learning?tab=completed)

### 2. Scroll to Render Cards
Coursera uses lazy-loading. Scroll to the bottom of the page so all courses load into the DOM.  
*(For accounts with many completed courses, run the [Auto-Scroller Helper](#auto-scroller-helper-for-large-catalogs) below to automate this).*

### 3. Run Extractor in Console
Press `F12` (or `Ctrl + Shift + I` on Windows/Linux, `Cmd + Option + I` on macOS), navigate to the **Console** tab, paste the following snippet, and press **Enter**:

```javascript
(() => {
  const records = [];
  const seen = new Set();

  // Strategy 1: Target links pointing to accomplishments/certificates/courses
  document.querySelectorAll('a').forEach(a => {
    const href = a.href || '';
    const text = (a.innerText || '').trim();

    const isMatch = href.includes('/accomplishments') || 
                    href.includes('/certificate') || 
                    href.includes('/learn/') ||
                    text.toLowerCase().includes('view certificate') ||
                    text.toLowerCase().includes('completed');

    if (isMatch) {
      // Traverse up to find the enclosing card container
      let container = a.parentElement;
      for (let i = 0; i < 6 && container; i++) {
        const heading = container.querySelector('h2, h3, h4, [data-test*="title"], [data-testid*="title"]');
        if (heading && heading.innerText.trim()) {
          const title = heading.innerText.trim().split('\n')[0];
          if (!seen.has(title) && title.length > 3 && !['My Learning', 'Completed', 'In Progress', 'Certificates'].includes(title)) {
            seen.add(title);
            records.push({
              Title: title,
              URL: href.includes('http') ? href : window.location.origin + href
            });
          }
          break;
        }
        container = container.parentElement;
      }
    }
  });

  // Strategy 2: Fallback - inspect major headings in the feed
  if (records.length === 0) {
    document.querySelectorAll('h3, h2, h4').forEach(h => {
      const text = h.innerText.trim();
      const forbidden = ['My Learning', 'Completed', 'In Progress', 'Certificates', 'Browse', 'Explore'];
      if (text.length > 4 && !forbidden.includes(text) && !seen.has(text)) {
        seen.add(text);
        const parentLink = h.closest('a') || (h.parentElement ? h.parentElement.querySelector('a') : null);
        records.push({
          Title: text,
          URL: parentLink ? parentLink.href : 'Completed Tab'
        });
      }
    });
  }

  if (records.length === 0) {
    console.warn("No courses detected. Make sure you have scrolled down so the cards are rendered in the DOM.");
    return;
  }

  console.table(records);

  // Generate & trigger CSV download
  const csvContent = "data:text/csv;charset=utf-8," 
    + ["Title,URL"].concat(records.map(r => `"${r.Title.replace(/"/g, '""')}","${r.URL}"`)).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "coursera_completed_summary.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log(`Successfully captured ${records.length} items!`);
})();
```

The CSV file `coursera_completed_summary.csv` will download automatically.

---

## Zero-Code Fallback Method

If corporate device controls, strict group policies, or ad-blockers prevent running scripts in Developer Tools:

1. Navigate to the **Completed** tab and scroll to render all cards.
2. Press `Ctrl + P` (or `Cmd + P` on macOS).
3. Select **Save as PDF** as the destination and save.

This produces a clean, searchable archive of all course titles, completion records, and verification links.

---

## Repository Structure

```
coursera-certificate-extractor/
|-- index.html                         # Offline Web Dashboard & Interactive CSV Formatter
|-- scripts/
|   |-- extract_simple.js              # Lightweight DOM console extractor (CSV download)
|   |-- extract_coursera_courses.js    # Advanced extractor (Grades, Credential IDs, In-Page UI banner)
|   |-- auto_scroll.js                 # Automatic scroller to load all cards before extraction
|   `-- bookmarklet.txt                # One-click browser bookmarklet
|-- tools/
|   `-- format_converter.py            # CLI tool: Convert CSV to Markdown, Resume bullets, LinkedIn, or JSON
|-- docs/
|   |-- STEP_BY_STEP_GUIDE.md          # Comprehensive walkthrough for all skill levels
|   `-- TROUBLESHOOTING.md             # Troubleshooting for common browser errors and edge cases
|-- examples/
|   `-- sample_coursera_export.csv     # Example exported CSV for testing
`-- LICENSE                            # MIT License
```

---

## Auto-Scroller Helper for Large Catalogs

For accounts with dozens of completed courses, Coursera virtualizes cards in chunks. Run this script in the Console first to smoothly scroll down and render every card into the DOM:

```javascript
(() => {
  console.log("Starting Coursera Auto-Scroll...");
  let lastHeight = 0, stableCount = 0;
  const timer = setInterval(() => {
    const currentHeight = document.documentElement.scrollHeight;
    window.scrollTo({ top: currentHeight, behavior: 'smooth' });
    if (currentHeight === lastHeight) {
      if (++stableCount >= 4) {
        clearInterval(timer);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log("All courses loaded. You can now run the extractor script.");
      }
    } else {
      stableCount = 0;
      lastHeight = currentHeight;
    }
  }, 800);
})();
```

---

## One-Click Bookmarklet

To run the extractor without opening Developer Tools:
1. Open your browser Bookmarks Manager (`Ctrl + Shift + O` on Windows/Linux, `Cmd + Option + B` on macOS).
2. Create a new bookmark named **Coursera Extractor**.
3. Copy the minified code from [`scripts/bookmarklet.txt`](scripts/bookmarklet.txt) into the **URL** field.
4. Click the bookmark whenever you are on the Coursera Completed tab.

---

## CLI Formatter Tool (`format_converter.py`)

Convert exported CSV files into multiple formats using standard Python (no external dependencies):

```bash
# Output GitHub Markdown Table
python tools/format_converter.py coursera_completed_summary.csv --format markdown

# Output Resume Bullet Points
python tools/format_converter.py coursera_completed_summary.csv --format resume

# Output LinkedIn Certifications Format
python tools/format_converter.py coursera_completed_summary.csv --format linkedin

# Export clean JSON
python tools/format_converter.py coursera_completed_summary.csv --format json -o courses.json
```

### Sample Markdown Table Output

| # | Course / Specialization | Issuer / Partner | Credential Link |
|---|-------------------------|------------------|-----------------|
| 1 | **Machine Learning Specialization** | DeepLearning.AI & Stanford | [Verify Certificate](https://coursera.org/verify/ABC123DEF456) (`ABC123DEF456`) |
| 2 | **Google Data Analytics Professional Certificate** | Google | [Verify Certificate](https://coursera.org/verify/GGL789XYZ101) (`GGL789XYZ101`) |
| 3 | **Deep Learning Specialization** | DeepLearning.AI | [Verify Certificate](https://coursera.org/verify/DL9988776655) (`DL9988776655`) |

---

## Offline Web Dashboard (`index.html`)

Open [`index.html`](index.html) locally in any web browser:
- Drag-and-drop your exported CSV.
- Search and filter across courses by title, partner, or credential ID.
- Copy preformatted text for GitHub README, Resume, or LinkedIn with one click.
- Operates entirely offline with zero network requests.

---

## Documentation

- [Complete Step-by-Step Guide](docs/STEP_BY_STEP_GUIDE.md)
- [Troubleshooting & FAQ](docs/TROUBLESHOOTING.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
