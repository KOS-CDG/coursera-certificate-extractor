# 📘 Comprehensive Step-by-Step Guide: Extracting Coursera Courses & Certificates

If you are a prolific learner with dozens or hundreds of completed courses, Coursera does not provide an official "Export to CSV" or "Bulk Download Transcript" button on standard consumer accounts.

When developers attempt to automate this via automated `curl` scripts or browser `fetch()` requests against internal API endpoints like `/api/accomplishments.v1`, they encounter:

```
SyntaxError: Unexpected token '<', "<html>..." is not valid JSON
```

This guide explains **why** that happens, **how direct DOM extraction solves it in under 30 seconds**, and provides an easy walkthrough for non-technical and technical users alike.

---

## 🧠 Why Does Direct DOM Extraction Work Where API Calls Fail?

Coursera's backend protects internal API endpoints with:
1. **HTML Verification & CAPTCHA Challenges**: Requests lacking browser-level integrity verification receive a full HTML webpage challenge instead of JSON.
2. **Session Cookies & CSRF Protection**: Internal endpoints require active session tokens and CSRF headers that standard scripts omit.
3. **Internal Routing Walls**: Calling private endpoints directly triggers an authentication redirect back to the login screen.

### The Pure DOM Solution
When you are actively logged in and browsing your [**Completed** tab](https://www.coursera.org/my-learning?tab=completed), your browser has **already passed all verification and rendered every single course title, completion date, provider, and certificate link directly into the DOM (HTML structure)**.

By running a pure JavaScript extractor directly in your browser's Console:
- ❌ **Zero API calls** are dispatched.
- ❌ **Zero credentials or cookies** leave your machine.
- 🛡️ **100% Client-side and private**: The script merely queries what your browser is already displaying.
- ⚡ **Instant export**: Converts the rendered elements into a downloadable `.csv` or formatted Markdown table in milliseconds.

---

## 🚀 Step-by-Step Walkthrough

```
┌────────────────────────────────┐
│ 1. Open Coursera Completed Tab │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│ 2. Scroll to Load Cards (DOM)  │
│    (Manual or Auto-Scroller)   │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│ 3. Open DevTools Console (F12) │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│ 4. Paste Extractor Script      │
│    & Press Enter               │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│ 5. Auto-Download CSV / Copy MD │
│    & Format for Resume/LinkedIn│
└────────────────────────────────┘
```

---

### Step 1: Open Your Coursera Completed Tab

1. Open your browser (Google Chrome, Microsoft Edge, Brave, or Mozilla Firefox).
2. Ensure you are logged into your Coursera account.
3. Navigate directly to your Completed learning feed:
   👉 **[https://www.coursera.org/my-learning?tab=completed](https://www.coursera.org/my-learning?tab=completed)**

> **Note for Coursera for Business / Campus Users**: If your completed courses are under an organization portal (e.g., `coursera.org/programs/...`), switch to your organization workspace in the top dropdown first, then click **My Learning** $\rightarrow$ **Completed**.

---

### Step 2: Load All Course Cards into the DOM (Lazy Loading)

Coursera utilizes **infinite scrolling (virtual/lazy loading)**. If you have completed 40+ courses, only the first 10–20 cards are rendered initially. The rest load dynamically as you scroll down.

You have two choices:

#### Choice A: Quick Auto-Scroll Helper (Recommended for 20+ courses)
1. Open your browser console (press `F12`).
2. Paste the snippet from [`scripts/auto_scroll.js`](../scripts/auto_scroll.js) and press **Enter**:
   ```javascript
   (() => {
     let lastH = 0, stable = 0;
     const timer = setInterval(() => {
       const h = document.documentElement.scrollHeight;
       window.scrollTo({ top: h, behavior: 'smooth' });
       if (h === lastH) {
         if (++stable >= 4) {
           clearInterval(timer);
           window.scrollTo({ top: 0, behavior: 'smooth' });
           console.log("%c All courses loaded! Run extractor now.", "color:#10b981;font-weight:bold;");
         }
       } else {
         stable = 0;
         lastH = h;
       }
     }, 750);
   })();
   ```
3. Watch the page scroll smoothly to the very bottom and return to the top once every course card is rendered.

#### Choice B: Manual Scroll
Simply scroll down your browser window until you reach the very bottom of your list and no more cards appear.

---

### Step 3: Open Browser Developer Tools

Open the **Console** tab in Developer Tools using the shortcut for your operating system:

| Platform | Keyboard Shortcut |
| :--- | :--- |
| **Windows / Linux** | `F12` or `Ctrl + Shift + I` $\rightarrow$ click **Console** |
| **macOS** | `Cmd + Option + I` or `Cmd + Option + J` |

*(If Chrome displays a security warning like `Warning: Don't paste code into the DevTools Console...`, type `allow pasting` into the console and press Enter).*

---

### Step 4: Paste & Run the Extractor Script

Choose between the **Simple Extractor** or the **Advanced Extractor**.

#### Option 1: Simple DOM Extractor (Fast & Lightweight)
Paste this directly into the Console and press **Enter**:

```javascript
(() => {
  const records = [];
  const seen = new Set();

  document.querySelectorAll('a').forEach(a => {
    const href = a.href || '';
    const text = (a.innerText || '').trim();

    const isMatch = href.includes('/accomplishments') || 
                    href.includes('/certificate') || 
                    href.includes('/learn/') ||
                    text.toLowerCase().includes('view certificate') ||
                    text.toLowerCase().includes('completed');

    if (isMatch) {
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

  // Download CSV
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

#### Option 2: Advanced Extractor (With Credential IDs, Grades & In-Page Modal)
For detailed records including Partner / University names, Credential Verification IDs, and an on-screen action banner, use [`scripts/extract_coursera_courses.js`](../scripts/extract_coursera_courses.js).

---

### Step 5: What Happens Next?

1. **Table Preview**: A formatted table displays in your browser console showing all captured items.
2. **Instant Download**: A file named `coursera_completed_summary.csv` or `coursera_completed_courses.csv` automatically saves to your computer's `Downloads` folder.
3. **Ready to Format**: The CSV contains the exact Course Titles and Certificate Verification URLs.

---

## 🖨️ Zero-Code Fallback Method (No Console Required)

If your corporate device or browser security policies block pasting code into DevTools:

1. Go to your **[Completed Tab](https://www.coursera.org/my-learning?tab=completed)**.
2. Scroll to the bottom so all certificates are rendered on screen.
3. Press **`Ctrl + P`** (Windows) or **`Cmd + P`** (Mac).
4. Set the destination to **Save as PDF**.
5. Click **Save**.

The PDF will contain all visible courses, titles, completion dates, and printable verification links.

---

## 💼 What Can You Do With Your Exported Courses?

### 1. View & Format in the Offline Dashboard (`index.html`)
Open [`index.html`](../index.html) in your browser:
- Drag and drop your downloaded CSV.
- Search and filter across all courses.
- One-click copy into Markdown or LinkedIn formatting.

### 2. Generate GitHub Profile README Table
Using the included CLI tool:
```bash
python tools/format_converter.py coursera_completed_summary.csv --format markdown
```
Outputs:
| # | Course / Specialization | Issuer / Partner | Credential Link |
|---|---|---|---|
| 1 | **Machine Learning Specialization** | DeepLearning.AI | [Verify Certificate](https://coursera.org/...) (`ABC123DEF456`) |

### 3. Generate Resume Bullet Points
```bash
python tools/format_converter.py coursera_completed_summary.csv --format resume
```
Outputs:
```markdown
### Certifications & Continuous Learning
- **Machine Learning Specialization** - DeepLearning.AI ([Credential](https://coursera.org/...))
- **Google Data Analytics Professional Certificate** - Google ([Credential](https://coursera.org/...))
```

### 4. Bulk Prepare LinkedIn Additions
```bash
python tools/format_converter.py coursera_completed_summary.csv --format linkedin
```
Gives you each Course Name, Issuing Organization, Credential ID, and Credential URL ready to copy-paste into LinkedIn's *Add License or Certification* dialog.
