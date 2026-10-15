/**
 * Coursera Simple DOM Extractor
 * 
 * Paste directly into the browser DevTools Console (F12) while on:
 * https://www.coursera.org/my-learning?tab=completed
 * 
 * Extracts all course titles and certificate URLs, prints a table, and downloads a CSV.
 */
(() => {
  const records = [];
  const seen = new Set();

  // Strategy 1: Target links pointing to accomplishments, certificates, or courses
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

  // Strategy 2: Fallback - if anchors are styled differently, inspect major headings
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
    console.warn("⚠️ No courses detected. Make sure you have scrolled down so all cards render in the DOM.");
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

  console.log(`%c Successfully captured ${records.length} items! CSV downloaded automatically.`, "color: #10b981; font-weight: bold; font-size: 14px;");
})();
