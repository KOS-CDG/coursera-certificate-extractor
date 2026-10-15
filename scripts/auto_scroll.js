/**
 * Coursera Auto-Scroll Helper
 * 
 * Paste directly into the browser DevTools Console (F12) while on:
 * https://www.coursera.org/my-learning?tab=completed
 * 
 * Automatically scrolls to the bottom of the page until all lazy-loaded
 * course cards are fully rendered into the DOM.
 */
(() => {
  console.log("%c Starting Coursera Auto-Scroll...", "color: #3b82f6; font-weight: bold; font-size: 14px;");

  let lastScrollHeight = 0;
  let noChangeCount = 0;
  const maxNoChange = 4; // Stop after 4 checks with no height increase (~3-4 seconds of stability)
  const scrollIntervalMs = 800;

  const timer = setInterval(() => {
    const currentHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.scrollTo({ top: currentHeight, behavior: 'smooth' });

    // Check count of potential course card elements currently in DOM
    const cardCount = document.querySelectorAll('a[href*="/accomplishments"], a[href*="/certificate"], [data-testid*="course"], [data-test*="card"]').length;
    console.log(`⏳ Scrolling... Page height: ${currentHeight}px | Detected card elements: ~${cardCount}`);

    if (currentHeight === lastScrollHeight) {
      noChangeCount++;
      if (noChangeCount >= maxNoChange) {
        clearInterval(timer);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log("%c Auto-scroll finished! All completed courses have been loaded into the DOM.", "color: #10b981; font-weight: bold; font-size: 15px;");
        console.log("%c👉 Now paste the extractor script (extract_coursera_courses.js or extract_simple.js) to download your courses.", "color: #f59e0b; font-weight: bold;");
      }
    } else {
      noChangeCount = 0;
      lastScrollHeight = currentHeight;
    }
  }, scrollIntervalMs);
})();
