/**
 * HTML to Fabric.js Parser Utility
 * Converts an HTML DOM structure (from a template iframe) into Fabric.js objects on a Canvas.
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

  // Target the parent .card container to load all sections stacked vertically
  const cardEl = doc.querySelector('.card') || doc.body;

  // Clear existing canvas objects
  canvas.clear();

  // 1. Identify Foreground Elements (Text and Images)
  const foregroundElements = [];
  const allElements = cardEl.querySelectorAll('*');

  allElements.forEach(el => {
    // Skip non-visual tags
    if (['SCRIPT', 'STYLE', 'IFRAME', 'NOSCRIPT', 'SVG'].includes(el.tagName)) return;

    if (el.tagName === 'IMG') {
      foregroundElements.push({ type: 'image', el: el });
    } 
    else {
      // Check if it's a leaf text node
      const hasText = el.textContent.trim().length > 0;
      let isLeaf = true;
      for (let i = 0; i < el.children.length; i++) {
        if (el.children[i].tagName !== 'BR') {
          isLeaf = false;
          break;
        }
      }

      if (hasText && isLeaf) {
        foregroundElements.push({ type: 'text', el: el });
      }
    }
  });

  // Calculate the scale to fit the card within the canvas container
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Get the real pixel dimensions of the card
  const cardRect = cardEl.getBoundingClientRect();
  const cardWidth = cardRect.width;
  const cardHeight = cardRect.height;
  
  const scaleX = canvasWidth / cardWidth;
  const scaleY = canvasHeight / cardHeight;

  // 2. Generate Fabric Objects for Foreground Elements
  for (const item of foregroundElements) {
    const el = item.el;
    const rect = el.getBoundingClientRect();
    const computedStyle = iframe.contentWindow.getComputedStyle(el);

    // Calculate position relative to the target .card container
    const left = rect.left - cardRect.left;
    const top = rect.top - cardRect.top;

    if (item.type === 'text') {
      let text = el.innerText || el.textContent;
      text = text.trim();
      if (!text) continue;

      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight;
      const fontFamily = computedStyle.fontFamily.replace(/["']/g, ''); // strip quotes
      let color = computedStyle.color;
      if (color === 'rgba(0, 0, 0, 0)') color = '#000000';
      
      const textAlign = computedStyle.textAlign;

      const fabricText = new fabric.IText(text, {
        left: (left + rect.width / 2) * scaleX,
        top: (top + rect.height / 2) * scaleY,
        originX: 'center',
        originY: 'center',
        fontSize: fontSize * scaleX,
        fontFamily: fontFamily,
        fontWeight: fontWeight,
        fill: color,
        textAlign: textAlign,
        lineHeight: parseFloat(computedStyle.lineHeight) / fontSize || 1.3
      });
      canvas.add(fabricText);
    } 
    else if (item.type === 'image') {
      const src = el.src;
      if (!src) continue;

      await new Promise((resolve) => {
        fabric.Image.fromURL(src, function(img) {
          if (!img) return resolve();
          img.set({
            left: (left + rect.width / 2) * scaleX,
            top: (top + rect.height / 2) * scaleY,
            originX: 'center',
            originY: 'center'
          });
          img.scaleToWidth(rect.width * scaleX);
          canvas.add(img);
          resolve();
        });
      });
    }
  }

  // 3. Hide foreground elements to capture only the background
  const originalVisibility = new Map();
  foregroundElements.forEach(item => {
    originalVisibility.set(item.el, item.el.style.visibility);
    item.el.style.visibility = 'hidden';
  });

  // Capture background using html2canvas
  try {
    const bgCanvas = await html2canvas(cardEl, {
      backgroundColor: null,
      scale: 1, 
      logging: false,
      useCORS: true
    });

    fabric.Image.fromURL(bgCanvas.toDataURL('image/png'), function(bgImg) {
      bgImg.set({
        scaleX: canvasWidth / bgCanvas.width,
        scaleY: canvasHeight / bgCanvas.height,
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0
      });
      canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas));
    });

  } catch (err) {
    console.error("Failed to capture template background:", err);
  }

  // Restore foreground elements
  foregroundElements.forEach(item => {
    item.el.style.visibility = originalVisibility.get(item.el);
  });

  canvas.renderAll();
  return true;
}
