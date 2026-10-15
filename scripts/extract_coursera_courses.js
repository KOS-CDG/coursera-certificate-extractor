/**
 * Coursera Advanced DOM Certificate & Course Extractor
 * 
 * Paste directly into the browser DevTools Console (F12) while on:
 * https://www.coursera.org/my-learning?tab=completed
 * 
 * Features:
 * - Zero API calls: bypasses Cloudflare/CAPTCHA & HTML login redirects
 * - Extracts Course Title, Provider/University, Grade, Completion Date, Credential ID, and Verification URL
 * - Automatic CSV download
 * - Automatic JSON download (optional)
 * - Copies Markdown table directly to clipboard
 * - Injects a sleek on-screen summary banner with download buttons
 */
(() => {
  const records = [];
  const seen = new Set();

  console.log("%c🔍 Scanning Coursera Completed tab DOM...", "color: #3b82f6; font-weight: bold; font-size: 14px;");

  // Helper to clean extracted text
  const cleanText = (str) => (str || '').replace(/\s+/g, ' ').trim();

  // Extract Credential ID from URL if present (e.g., /verify/ABC123XYZ or /specialization/ABC123XYZ)
  const extractCredentialId = (url) => {
    if (!url) return '';
    const match = url.match(/(?:verify|accomplishments\/(?:specialization|certificate)?)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  };

  // Extract date string if found
  const extractDate = (text) => {
    const match = text.match(/(?:Completed|Earned|Finished|Issued)?\s*([A-Za-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
    return match ? match[1] : '';
  };

  // Extract grade if found (e.g. Grade: 98.5%)
  const extractGrade = (text) => {
    const match = text.match(/(\d{1,3}(?:\.\d{1,2})?%)/);
    return match ? match[1] : '';
  };

  // Strategy 1: Targeted anchor scan for accomplishment & certificate links
  const anchors = Array.from(document.querySelectorAll('a'));
  anchors.forEach(a => {
    const href = a.href || '';
    const text = cleanText(a.innerText);

    const isCertificateLink = href.includes('/accomplishments') || 
                              href.includes('/certificate') || 
                              href.includes('/account/accomplishments') ||
                              text.toLowerCase().includes('view certificate') ||
                              text.toLowerCase().includes('share certificate');

    if (isCertificateLink) {
      // Find the parent card / row element
      let container = a.parentElement;
      for (let i = 0; i < 7 && container; i++) {
        // Look for headings or designated title elements
        const titleEl = container.querySelector('h2, h3, h4, [data-test*="title"], [data-testid*="title"]');
        if (titleEl && cleanText(titleEl.innerText)) {
          const title = cleanText(titleEl.innerText).split('\n')[0];
          const fullContainerText = cleanText(container.innerText);

          const forbiddenTitles = [
            'my learning', 'completed', 'in progress', 'certificates', 
            'browse', 'explore', 'recommendations', 'degree programs'
          ];

          if (!seen.has(title.toLowerCase()) && title.length > 3 && !forbiddenTitles.includes(title.toLowerCase())) {
            seen.add(title.toLowerCase());

            // Try to extract provider/partner
            let provider = '';
            const partnerEl = container.querySelector('[data-test*="partner"], [data-testid*="partner"], .partner-name, .rc-PartnerName');
            if (partnerEl) {
              provider = cleanText(partnerEl.innerText);
            } else {
              // Heuristic: line before or after title or provider badges
              const lines = fullContainerText.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean);
              for (const line of lines) {
                if (['google', 'ibm', 'deeplearning.ai', 'stanford university', 'meta', 'duke university', 'university of michigan', 'aws', 'microsoft'].some(p => line.toLowerCase().includes(p))) {
                  provider = line;
                  break;
                }
              }
            }

            const certUrl = href.startsWith('http') ? href : window.location.origin + href;
            const credId = extractCredentialId(certUrl);
            const date = extractDate(fullContainerText);
            const grade = extractGrade(fullContainerText);

            records.push({
              title,
              provider: provider || 'Coursera Partner',
              grade: grade || 'N/A',
              date: date || 'N/A',
              credentialId: credId || 'N/A',
              url: certUrl
            });
          }
          break;
        }
        container = container.parentElement;
      }
    }
  });

  // Strategy 2: If anchors didn't yield enough, inspect all card elements
  if (records.length === 0) {
    const cardCandidates = document.querySelectorAll('[data-testid*="course"], [data-test*="card"], [class*="CourseCard"], [class*="completed"]');
    cardCandidates.forEach(card => {
      const heading = card.querySelector('h2, h3, h4');
      const link = card.querySelector('a[href*="/accomplishments"], a[href*="/certificate"], a[href*="/learn/"]');
      if (heading && link) {
        const title = cleanText(heading.innerText);
        if (title.length > 3 && !seen.has(title.toLowerCase())) {
          seen.add(title.toLowerCase());
          const certUrl = link.href.startsWith('http') ? link.href : window.location.origin + link.href;
          records.push({
            title,
            provider: 'Coursera Partner',
            grade: 'N/A',
            date: 'N/A',
            credentialId: extractCredentialId(certUrl) || 'N/A',
            url: certUrl
          });
        }
      }
    });
  }

  // Strategy 3: Ultimate Fallback to all major headings on the Completed feed
  if (records.length === 0) {
    document.querySelectorAll('h3, h2, h4').forEach(h => {
      const text = cleanText(h.innerText);
      const forbidden = ['my learning', 'completed', 'in progress', 'certificates', 'browse', 'explore'];
      if (text.length > 4 && !forbidden.includes(text.toLowerCase()) && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        const parentLink = h.closest('a') || (h.parentElement ? h.parentElement.querySelector('a') : null);
        records.push({
          title: text,
          provider: 'Coursera Partner',
          grade: 'N/A',
          date: 'N/A',
          credentialId: 'N/A',
          url: parentLink ? parentLink.href : window.location.href
        });
      }
    });
  }

  if (records.length === 0) {
    console.warn("⚠️ No courses detected. Please ensure you are on the 'Completed' tab and have scrolled to load the cards.");
    alert("⚠️ No completed courses found in the DOM!\n\nMake sure:\n1. You are on https://www.coursera.org/my-learning?tab=completed\n2. You scrolled down so the cards rendered into view.\n\nTip: You can run auto_scroll.js first to load everything automatically.");
    return;
  }

  // Display Table in Console
  console.table(records.map(r => ({
    "Course Title": r.title,
    "Provider": r.provider,
    "Credential ID": r.credentialId,
    "URL": r.url
  })));

  // Generate CSV
  const csvHeaders = ["Title", "Provider", "Grade", "Completion Date", "Credential ID", "Certificate URL"];
  const csvRows = records.map(r => [
    `"${r.title.replace(/"/g, '""')}"`,
    `"${r.provider.replace(/"/g, '""')}"`,
    `"${r.grade.replace(/"/g, '""')}"`,
    `"${r.date.replace(/"/g, '""')}"`,
    `"${r.credentialId.replace(/"/g, '""')}"`,
    `"${r.url.replace(/"/g, '""')}"`
  ].join(","));
  const csvData = "\uFEFF" + [csvHeaders.join(",")].concat(csvRows).join("\r\n");

  // Function to download a file
  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  // Download CSV automatically
  downloadBlob(csvData, "coursera_completed_courses.csv", "text/csv;charset=utf-8;");

  // Generate Markdown Table
  const markdownRows = records.map((r, i) => 
    `| ${i + 1} | [${r.title}](${r.url}) | ${r.provider} | \`${r.credentialId}\` |`
  );
  const markdownTable = [
    "| # | Course Title & Link | Provider | Credential ID |",
    "|---|---------------------|----------|---------------|",
    ...markdownRows
  ].join("\n");

  // Try copying Markdown to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(markdownTable)
      .then(() => console.log("%c📋 Markdown summary table copied to clipboard!", "color: #8b5cf6; font-weight: bold;"))
      .catch(() => {});
  }

  // Create Sleek On-Screen Notification Banner
  const existingBanner = document.getElementById("coursera-extractor-banner");
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement("div");
  banner.id = "coursera-extractor-banner";
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: #0f172a;
    color: #f8fafc;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 420px;
    border: 1px solid #334155;
    animation: slideUp 0.3s ease-out;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">🎓</span>
        <strong style="font-size: 16px; color: #38bdf8;">Coursera Extractor</strong>
      </div>
      <button id="close-extractor-banner" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer;">&times;</button>
    </div>
    <p style="margin: 0 0 14px 0; font-size: 13.5px; line-height: 1.5; color: #cbd5e1;">
      Captured <strong style="color: #4ade80; font-size: 15px;">${records.length}</strong> completed certificates! CSV download started.
    </p>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button id="btn-download-json" style="flex: 1; padding: 8px 12px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        💾 Download JSON
      </button>
      <button id="btn-copy-markdown" style="flex: 1; padding: 8px 12px; background: #475569; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        📋 Copy Markdown
      </button>
      <button id="btn-re-download-csv" style="flex: 1; padding: 8px 12px; background: #059669; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        📊 Re-download CSV
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("close-extractor-banner").onclick = () => banner.remove();
  document.getElementById("btn-download-json").onclick = () => {
    downloadBlob(JSON.stringify(records, null, 2), "coursera_completed_courses.json", "application/json");
  };
  document.getElementById("btn-copy-markdown").onclick = () => {
    navigator.clipboard.writeText(markdownTable);
    alert("Markdown table copied to clipboard!");
  };
  document.getElementById("btn-re-download-csv").onclick = () => {
    downloadBlob(csvData, "coursera_completed_courses.csv", "text/csv;charset=utf-8;");
  };

  console.log(`%c🎉 Extraction complete! Captured ${records.length} courses/certificates.`, "color: #10b981; font-weight: bold; font-size: 16px;");
})();
