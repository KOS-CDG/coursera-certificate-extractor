# 🎓 Coursera Fast Course & Certificate Extractor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-success.svg)](scripts/)
[![Client-Side Privacy](https://img.shields.io/badge/Security-100%25%20Client--Side-brightgreen.svg)](docs/STEP_BY_STEP_GUIDE.md)
[![Platform](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Brave-blueviolet.svg)](scripts/)

> Extract **all** completed Coursera courses, certificates, credential IDs, and verification URLs in **under 30 seconds**. Zero external API calls, zero login tokens required, 100% private.

---

## ⚡ The Problem: Why Internal API Scraping Fails

When attempting to automate Coursera course extraction using `fetch()` or `curl` against internal API endpoints like `/api/accomplishments.v1`, you will almost certainly encounter this error:

```
SyntaxError: Unexpected token '<', "<html>..." is not valid JSON
```

### Why does this happen?
Coursera's backend guards internal API endpoints behind **Cloudflare bot challenges, HTML verification walls, and session routing checks**. When an unverified script hits these endpoints, the server returns an **HTML verification webpage** instead of raw JSON.

### The Silver Bullet: Pure DOM Extraction
When you are logged into Coursera on your [**Completed** tab](https://www.coursera.org/my-learning?tab=completed), your browser has **already cleared all security checks**. The DOM already contains every single course title, completion card, and certificate link.

We do **not** need to call any backend endpoints. We simply query the rendered webpage, compile the data, and download a clean CSV immediately.

---

## 🚀 30-Second Quickstart

### 1. Open your Coursera Completed tab
Navigate to:
👉 **[https://www.coursera.org/my-learning?tab=completed](https://www.coursera.org/my-learning?tab=completed)**

### 2. Scroll to render your cards
Coursera uses lazy-loading. Scroll down to the bottom of the page so all courses load into the DOM.  
*(Got 30+ courses? Run our [Auto-Scroller](#-auto-scroller-helper-for-50-courses) to do this automatically!)*

### 3. Paste the extractor into the Console
Press **`F12`** (or `Ctrl + Shift + I` / `Cmd + Option + I`), switch to the **Console** tab, paste the code below, and press **Enter**:

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

  console.log(`%c Successfully captured ${records.length} items!`, "color: #10b981; font-weight: bold; font-size: 14px;");
})();
```

Your browser will automatically download **`coursera_completed_summary.csv`**!

---

## 🖨️ Zero-Code Fallback Method (No Console Required)

If corporate restrictions, ad-blockers, or browser policies prevent opening DevTools:

1. Stay on the **Completed** tab and scroll to load all cards.
2. Press **`Ctrl + P`** (or `Cmd + P` on Mac).
3. Choose **Save as PDF** $\rightarrow$ Click **Save**.

You now have a clean, searchable PDF backup containing all course titles, completion records, and links.

---

## 📦 What's Inside This Repository

```
coursera-certificate-extractor/
├── index.html                         # Offline Web Dashboard & Interactive CSV Formatter
├── scripts/
│   ├── extract_simple.js              # Lightweight, robust console extractor (CSV download)
│   ├── extract_coursera_courses.js    # Advanced extractor (Grades, Credential IDs, In-Page UI banner)
│   ├── auto_scroll.js                 # Automatic scroller to load all lazy cards before extraction
│   └── bookmarklet.txt                # 1-Click browser bookmarklet
├── tools/
│   └── format_converter.py            # CLI tool: Convert CSV to Markdown, Resume bullets, LinkedIn, or JSON
├── docs/
│   ├── STEP_BY_STEP_GUIDE.md          # Visual step-by-step walkthrough for all skill levels
│   └── TROUBLESHOOTING.md             # In-depth guide for errors, extensions, and edge cases
├── examples/
│   └── sample_coursera_export.csv     # Example exported CSV for testing
└── LICENSE                            # MIT License
```

---

## 📜 Auto-Scroller Helper (For 50+ Courses)

If you have dozens of completed certificates, Coursera lazy-loads them in chunks. Paste this snippet in the Console **first** to automatically scroll and render every single course card:

```javascript
(() => {
  console.log("%c Starting Coursera Auto-Scroll...", "color: #3b82f6; font-weight: bold;");
  let lastHeight = 0, stableCount = 0;
  const timer = setInterval(() => {
    const currentHeight = document.documentElement.scrollHeight;
    window.scrollTo({ top: currentHeight, behavior: 'smooth' });
    if (currentHeight === lastHeight) {
      if (++stableCount >= 4) {
        clearInterval(timer);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log("%c All courses loaded! You can now run the extractor script.", "color: #10b981; font-weight: bold; font-size: 14px;");
      }
    } else {
      stableCount = 0;
      lastHeight = currentHeight;
    }
  }, 800);
})();
```

---

## 📑 1-Click Bookmarklet

Don't want to open the console every time?
1. Open your browser Bookmarks Manager (`Ctrl + Shift + O`).
2. Add a new bookmark named **`🎓 Coursera Extractor`**.
3. Paste the bookmarklet code from [`scripts/bookmarklet.txt`](scripts/bookmarklet.txt) into the **URL** field.
4. Next time you're on the Coursera Completed tab, simply click the bookmark!

---

## 🛠️ CLI Formatter Tool (`format_converter.py`)

Convert your exported CSV file into any format using Python (standard library only, zero external packages):

```bash
# Generate a GitHub Markdown Table:
python tools/format_converter.py coursera_completed_summary.csv --format markdown

# Generate Resume Bullet Points:
python tools/format_converter.py coursera_completed_summary.csv --format resume

# Generate LinkedIn Certifications Checklist:
python tools/format_converter.py coursera_completed_summary.csv --format linkedin

# Export to clean JSON:
python tools/format_converter.py coursera_completed_summary.csv --format json -o courses.json
```

### Example Markdown Table Output:
| # | Course / Specialization | Issuer / Partner | Credential Link |
|---|-------------------------|------------------|-----------------|
| 1 | **Machine Learning Specialization** | DeepLearning.AI & Stanford | [Verify Certificate](https://coursera.org/verify/ABC123DEF456) (`ABC123DEF456`) |
| 2 | **Google Data Analytics Professional Certificate** | Google | [Verify Certificate](https://coursera.org/verify/GGL789XYZ101) (`GGL789XYZ101`) |
| 3 | **Deep Learning Specialization** | DeepLearning.AI | [Verify Certificate](https://coursera.org/verify/DL9988776655) (`DL9988776655`) |

---

## 💻 Offline Web Dashboard (`index.html`)

Double-click [`index.html`](index.html) in any browser to open the built-in offline dashboard:
- 📁 **Drag-and-drop** your exported CSV.
- 🔍 **Search & filter** through all your completed courses.
- 📋 **1-Click Copy** to GitHub Markdown, Resume bullets, or LinkedIn.
- 🔒 Runs **100% locally** in your browser without sending any data anywhere.

---

## 📖 In-Depth Guides
- [📘 Complete Step-by-Step Guide](docs/STEP_BY_STEP_GUIDE.md)
- [🛠️ Troubleshooting & FAQ](docs/TROUBLESHOOTING.md)

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
