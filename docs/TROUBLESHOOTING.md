# 🛠️ Troubleshooting & Frequently Asked Questions

Common issues and solutions when extracting Coursera courses and certificates.

---

## 1. DevTools Displays "Warning: Don't paste code into the DevTools Console"
### Why this happens
Modern Chromium browsers (Google Chrome, Microsoft Edge, Brave) display a self-XSS warning whenever you try to paste code into the console on sensitive websites.
### Solution
1. Type `allow pasting` (all lowercase) directly into the console.
2. Press **Enter**.
3. Now paste your extractor script and press **Enter** again.

---

## 2. Only 10–20 Courses Were Captured (I Have 80+ Completed)
### Why this happens
Coursera uses **virtualized DOM / infinite lazy loading**. It only renders cards that are currently in or near your viewport. If you run the extractor while at the top of the page, unrendered cards do not exist in the DOM yet.
### Solution
Run [`scripts/auto_scroll.js`](../scripts/auto_scroll.js) before running the extractor, or manually scroll all the way to the bottom of the page until you see your very first completed course. Then run the extractor.

---

## 3. CSV File Did Not Automatically Download
### Why this happens
- Browser pop-up blocker or aggressive privacy extensions (e.g. uBlock Origin, Brave Shields) blocked the dynamic `<a download="...">` anchor click.
### Solution
1. Check your browser's address bar for a blocked download or pop-up notification icon and select "Always allow downloads from coursera.org".
2. **Alternative**: If the CSV does not download, the script has already printed the entire table into your console. You can right-click the console table $\rightarrow$ select **Copy object** or **Store as global variable** to save the records.
3. If using [`scripts/extract_coursera_courses.js`](../scripts/extract_coursera_courses.js), a modal banner appears in the bottom right corner with manual download buttons for both CSV and JSON.

---

## 4. Coursera for Business / Degree Program Accounts
### Why this happens
If your courses were paid for or completed through an employer or university partnership, your dashboard URL might look like:
`https://www.coursera.org/programs/<program-slug>/my-learning?tab=completed`
### Solution
The extractor scripts work identically on enterprise/program URLs.
1. Open the top-left program switcher dropdown on Coursera.
2. Select your specific program or enterprise portal.
3. Switch to the **Completed** tab.
4. Run the extractor script.

---

## 5. Audited Courses vs. Paid Certificates
### Why some entries show "Completed Tab" instead of a Certificate URL
Coursera allows learners to "Audit" courses for free without paying for a verified certificate. If you audited a course:
- Coursera shows the course as completed in your feed.
- However, there is no verified certificate URL (`/account/accomplishments/...`) issued for it.
- In this case, the extractor correctly records the Course Title and notes that the credential URL was not issued.

---

## 6. What If Coursera Redesigns Their DOM in the Future?
The scripts in this repository use a **3-tier resilient fallback architecture**:
1. **Tier 1 (Targeted Semantics)**: Searches for links matching `/accomplishments`, `/certificate`, `/account/accomplishments/verify`, or button labels matching `"View Certificate"`, then climbs to the enclosing container heading.
2. **Tier 2 (Test ID & Semantic Containers)**: Looks for data attributes like `[data-testid*="course"]`, `[data-test*="card"]`, and card wrappers.
3. **Tier 3 (Heading Feed Fallback)**: Extracts all unique `h2`, `h3`, and `h4` headings across the feed while filtering out navigation labels like "Browse" or "My Learning".

If you ever encounter a Coursera update that breaks parsing, please [open an issue](https://github.com/) with a snippet of the updated card HTML.
