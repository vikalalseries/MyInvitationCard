/**
 * HTML to Fabric.js Parser Utility
 * Captures the full HTML card template as a high-fidelity background image
 * on the Fabric.js canvas using html2canvas.
 */

async function parseHtmlToFabric(iframe, canvas, pageIndex = 0) {
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  
  // Wait for dynamic sections to load if they haven't
  if (!iframe.contentWindow.sectionsLoaded && iframe.contentWindow.document.location.href !== 'about:blank') {
    await new Promise(resolve => {
      let elapsed = 0;
      const checkInterval = setInterval(() => {
        elapsed += 50;
        if (iframe.contentWindow.sectionsLoaded || elapsed >= 5000) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  // Target the parent .card container (both sections stacked vertically)
  const cardEl = doc.querySelector('.card') || doc.body;

  // Clear existing canvas objects
  canvas.clear();

  // Get the real pixel dimensions of the card
  const cardRect = cardEl.getBoundingClientRect();
  const cardWidth = cardRect.width;
  const cardHeight = cardRect.height;

  // Keep a fixed canvas width and calculate height to preserve aspect ratio
  const canvasWidth = canvas.width || 893;
  const newCanvasHeight = Math.round(canvasWidth * (cardHeight / cardWidth));
  canvas.setWidth(canvasWidth);
  canvas.setHeight(newCanvasHeight);

  // Also resize the DOM container box to match
  const containerBox = document.getElementById('canvas-container-box');
  if (containerBox) {
    containerBox.style.width = canvasWidth + 'px';
    containerBox.style.height = newCanvasHeight + 'px';
  }

  // Calculate scaled section bounds for section-wise borders
  const sections = cardEl.querySelectorAll('.sec');
  const sectionBounds = [];
  const scale = canvasWidth / cardWidth;
  sections.forEach(sec => {
    const secRect = sec.getBoundingClientRect();
    sectionBounds.push({
      left: (secRect.left - cardRect.left) * scale,
      top: (secRect.top - cardRect.top) * scale,
      width: secRect.width * scale,
      height: secRect.height * scale
    });
  });
  window.cardSectionsBounds = sectionBounds;
  console.log("Calculated card section bounds:", window.cardSectionsBounds);

  // Wait for ALL images inside the card to be fully loaded
  const allImages = cardEl.querySelectorAll('img');
  if (allImages.length > 0) {
    await Promise.all(Array.from(allImages).map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve; // don't block on broken images
      });
    }));
    // Small extra delay for layout reflow after images load
    await new Promise(r => setTimeout(r, 200));
  }

  // Capture the ENTIRE card (with all text, images, backgrounds, borders)
  // using html2canvas for pixel-perfect rendering
  try {
    // Hide pre-added corner florettes so they are not captured in the background image
    const preAddedFl = cardEl.querySelectorAll('.fl');
    preAddedFl.forEach(el => el.style.setProperty('display', 'none', 'important'));

    const capturedCanvas = await html2canvas(cardEl, {
      backgroundColor: null,
      scale: 2,        // 2x for sharp/retina quality
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    const imgDataUrl = capturedCanvas.toDataURL('image/png');

    await new Promise((resolve) => {
      fabric.Image.fromURL(imgDataUrl, function(bgImg) {
        if (!bgImg) {
          console.error("Failed to create Fabric image from captured canvas");
          return resolve();
        }
        bgImg.set({
          scaleX: canvasWidth / capturedCanvas.width,
          scaleY: newCanvasHeight / capturedCanvas.height,
          originX: 'left',
          originY: 'top',
          left: 0,
          top: 0
        });
        canvas.setBackgroundImage(bgImg, function() {
          canvas.renderAll();
          resolve();
        });
      });
    });

  } catch (err) {
    console.error("Failed to capture template with html2canvas:", err);
  }

  canvas.renderAll();
  return true;
}
