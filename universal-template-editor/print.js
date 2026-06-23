/* ════════════════════════════════════════════════════════════
   print.js - Print Configuration Logic
   ════════════════════════════════════════════════════════════ */

// Global State
let templateId = 'card1';
let documentTitle = 'Wedding Card';
let currentData = { fields: {}, events: {}, styles: {} };
let config = null; // Template configuration definition

// Print Options
let quantity = 100;
let paperStock = 'matte';
let envelopeOption = 'standard';
let unitPrice = 15.00;

// 3D Scene Controls
let rotX = 20;
let rotY = -10;
let isDragging = false;
let startX, startY;
let isAutoRotating = false; // Disabled by default for 2D flat view
let animationFrameId = null;

// Zoom State
let currentZoom = 1.0;

// Active View Mode ('3d', 'layers', 'flat')
let activeViewMode = 'flat'; // 2D flat view by default

// Exploder State
let depthMultiplier = 60; // default 60px between planes
let exploderRotX = 55;
let exploderRotZ = -40;
let isDraggingLayers = false;

// ── INITIALIZATION ──
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Load project data from localStorage
  loadProjectData();
  
  // Load template config first to resolve fallbacks
  await loadTemplateConfig();
  
  // 2. Load print settings if saved previously
  loadSavedPrintConfig();

  // 3. Initialize UI Inputs
  const titleInput = document.getElementById('doc-title-input');
  if (titleInput) {
    titleInput.value = documentTitle;
    titleInput.addEventListener('change', (e) => {
      documentTitle = e.target.value.trim() || 'Wedding Card';
      triggerSaving();
      toast('Draft renamed to: ' + documentTitle, 's');
      saveDraft();
    });
  }
  document.getElementById('quantity-input').value = quantity;
  syncQuantityChips(quantity);
  
  // Set checked radio button options
  setRadioChecked('paper-stock', paperStock);
  setRadioChecked('envelope', envelopeOption);
  
  // 4. Load all preview iframes
  initializeIframes();
  
  // 5. Setup Drag-to-Rotate mouse/touch events
  setup3DRotation();
  setupLayers3DRotation();
  
  // 6. Start auto-rotation loop
  if (isAutoRotating && activeViewMode === '3d') {
    startAutoRotateLoop();
  }
  
  // 7. Calculate initial pricing
  recalculatePricing();
});

// Load template config
async function loadTemplateConfig() {
  try {
    const response = await fetch(`templates/${templateId}/config.json`);
    if (response.ok) {
      config = await response.json();
    }
  } catch (err) {
    console.error("Failed to load template config:", err);
  }
}

// Load project data
function loadProjectData() {
  // Try retrieving custom print state first
  let savedDataStr = localStorage.getItem("mic_print_project_data");
  if (!savedDataStr) {
    // Fallback to saved VLS data
    savedDataStr = localStorage.getItem("savedVlsData");
  }
  
  if (savedDataStr) {
    try {
      const project = JSON.parse(savedDataStr);
      if (project) {
        templateId = project.templateId || 'card1';
        documentTitle = project.documentTitle || 'Wedding Card';
        currentData = project.data || { fields: {}, events: {}, styles: {} };
      }
    } catch (err) {
      console.error("Error loading project data for print:", err);
      toast("Error loading project draft details", "e");
    }
  } else {
    // If no project loaded, redirect back to dashboard or show default dummy data
    console.warn("No active project loaded in localStorage.");
    toast("No customized card found. Loading default template.", "i");
  }
  
  // Extract template ID from query params if present
  const params = new URLSearchParams(window.location.search);
  const paramTemplateId = params.get('templateId');
  if (paramTemplateId) {
    templateId = paramTemplateId;
  }
}

// Load saved print configurations
function loadSavedPrintConfig() {
  const savedConfigStr = localStorage.getItem("mic_saved_print_config");
  if (savedConfigStr) {
    try {
      const config = JSON.parse(savedConfigStr);
      if (config) {
        quantity = config.quantity || 100;
        paperStock = config.paperStock || 'matte';
        envelopeOption = config.envelopeOption || 'standard';
      }
    } catch (e) {
      console.error("Error parsing saved print config:", e);
    }
  }
}

// Setup radio button visual checked classes
function setRadioChecked(name, value) {
  const radios = document.getElementsByName(name);
  radios.forEach(radio => {
    const cardEl = radio.closest('.option-card');
    if (radio.value === value) {
      radio.checked = true;
      cardEl?.classList.add('checked');
    } else {
      radio.checked = false;
      cardEl?.classList.remove('checked');
    }
  });
}

// Initialize Iframes
function initializeIframes() {
  const templatePath = `templates/${templateId}/template.html`;
  
  // A list of all iframes on this page
  const iframeIds = [
    'iframe-sec1', 'iframe-sec2', 'iframe-cover',
    'iframe-layer-cover', 'iframe-layer-sec1', 'iframe-layer-sec2',
    'iframe-flat-full'
  ];
  
  iframeIds.forEach(id => {
    const iframe = document.getElementById(id);
    if (iframe) {
      iframe.src = templatePath;
      iframe.onload = () => {
        // 1. Sync card data (texts, styles)
        syncIframeData(iframe);
        // 2. Apply isolation styles specific to each view
        applyIframeIsolation(id);
        
        // If it's the flat preview iframe, call resetZoom() to set correct initial sizes
        if (id === 'iframe-flat-full') {
          resetZoom();
        }
      };
    }
  });
}

// Send synchronized data updates to iframe
function syncIframeData(iframe) {
  if (iframe && iframe.contentWindow) {
    const resolvedData = {
      fields: {},
      events: {},
      styles: currentData.styles || {}
    };
    
    // Resolve fields and events with config defaults if they are null
    if (config) {
      if (config.fields) {
        config.fields.forEach(f => {
          const val = (currentData.fields && currentData.fields[f.id]);
          resolvedData.fields[f.id] = (val === null || val === undefined) ? (f.default || '') : val;
        });
      }
      if (config.events) {
        config.events.forEach(e => {
          const currentEv = (currentData.events && currentData.events[e.id]) || {};
          const nameVal = currentEv.name;
          const dateVal = currentEv.date;
          resolvedData.events[e.id] = {
            name: (nameVal === null || nameVal === undefined) ? (e.defaultName || '') : nameVal,
            date: (dateVal === null || dateVal === undefined) ? (e.defaultDate || '') : dateVal,
            time: currentEv.time || '',
            venue: currentEv.venue || '',
            active: currentEv.active !== false
          };
        });
      }
    } else {
      // Fallback
      resolvedData.fields = currentData.fields || {};
      resolvedData.events = currentData.events || {};
    }
    
    iframe.contentWindow.postMessage({
      type: 'UPDATE_TEMPLATE_DATA',
      data: resolvedData
    }, '*');
  }
}

// Apply isolated layer styles inside individual iframes
function applyIframeIsolation(iframeId) {
  let actualId = iframeId;
  if (iframeId.startsWith('zoom-')) {
    actualId = 'iframe-zoom-preview';
  }
  const iframe = document.getElementById(actualId);
  if (!iframe) return;
  
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  if (!doc) return;
  
  const styleEl = doc.createElement('style');
  let cssText = '';
  
  // Force layout sizing of iframes to display sections cleanly
  const baseLayoutCSS = `
    body { background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; }
    .card { padding: 0 !important; margin: 0 !important; gap: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; width: 21.5cm !important; height: 8.5cm !important; min-height: 8.5cm !important; overflow: hidden !important; }
  `;
  
  switch(iframeId) {
    case 'iframe-sec1':
    case 'iframe-layer-sec1':
    case 'zoom-sec1':
      cssText = `
        ${baseLayoutCSS}
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; margin: 0 !important; position: absolute !important; }
      `;
      break;
      
    case 'iframe-sec2':
    case 'iframe-layer-sec2':
    case 'zoom-sec2':
      cssText = `
        ${baseLayoutCSS}
        .sec1 { display: none !important; }
        .sec2 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; margin: 0 !important; position: absolute !important; }
      `;
      break;
      
    case 'iframe-flat-full':
      cssText = `
        body { background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        .card { width: 23.5cm !important; height: 19cm !important; min-height: 19cm !important; background: #f9f1d0 !important; padding: 1cm !important; display: flex !important; flex-direction: column !important; gap: 0.3cm !important; box-sizing: border-box !important; border: none !important; box-shadow: none !important; }
        .sec { display: block !important; position: relative !important; }
      `;
      break;
      
    case 'iframe-cover':
    case 'iframe-layer-cover':
    case 'zoom-cover':
      // Build a beautiful custom cover page that matches card theme inside top fold back
      cssText = `
        ${baseLayoutCSS}
        .sec1, .sec2 { display: none !important; }
        
        .card {
          background: linear-gradient(135deg, #ea580c 0%, #d97706 40%, #9a3412 100%) !important;
          border: 0.08cm solid #fbbf24 !important;
          box-shadow: inset 0 0 0 0.12cm #ea580c, inset 0 0 0 0.20cm #fbbf24, 0 10px 35px rgba(0,0,0,0.2) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        /* Ornamental corners */
        .cover-ornament {
          position: absolute;
          color: #fbbf24;
          font-size: 1.1cm;
          line-height: 1;
          z-index: 10;
          opacity: 0.95;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        .c-tl { top: 0.3cm; left: 0.3cm; }
        .c-tr { top: 0.3cm; right: 0.3cm; }
        .c-bl { bottom: 0.2cm; left: 0.3cm; }
        .c-br { bottom: 0.2cm; right: 0.3cm; }
        
        .cover-content {
          text-align: center;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 90%;
          height: 90%;
        }
        
        /* Medallion style for Ganesha */
        .cover-medallion {
          width: 2.3cm;
          height: 2.3cm;
          border-radius: 50%;
          border: 0.06cm solid #fbbf24;
          background: radial-gradient(circle, #fffbeb 50%, #fef3c7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.25cm;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 12px rgba(251, 191, 36, 0.4);
        }
        
        .cover-ganesh {
          width: 1.5cm;
          height: 1.5cm;
          object-fit: contain;
        }
        
        .cover-title {
          font-size: 0.65cm;
          font-weight: 700;
          color: #fffbeb;
          margin-bottom: 0.1cm;
          letter-spacing: 0.06cm;
          font-family: 'Playfair Display', 'Noto Serif Devanagari', serif;
          text-shadow: 0 2px 4px rgba(0,0,0,0.25);
        }
        
        /* Name Banner */
        .cover-banner {
          background: rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(251, 191, 36, 0.3);
          border-bottom: 1px solid rgba(251, 191, 36, 0.3);
          width: 100%;
          padding: 0.15cm 0;
          margin: 0.2cm 0;
          backdrop-filter: blur(4px);
        }
        
        .cover-names {
          font-size: 0.65cm;
          font-weight: 700;
          color: #fbbf24;
          letter-spacing: 0.02cm;
          font-family: 'Playfair Display', 'Noto Serif Devanagari', serif;
          text-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        /* Couple illustration area */
        .cover-couple-wrap {
          margin-top: 0.15cm;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 1.4cm;
        }
        
        .cover-couple {
          height: 1.4cm;
          width: auto;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          opacity: 0.95;
        }
        
        .cover-footer {
          font-size: 0.36cm;
          color: #fffbeb;
          letter-spacing: 0.04cm;
          opacity: 0.9;
          margin-top: 0.25cm;
          font-family: 'Inter', 'Noto Serif Devanagari', sans-serif;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
      `;
      
      // Inject elements for cover
      setTimeout(() => {
        const cardContainer = doc.querySelector('.card');
        if (cardContainer) {
          // Extract Ganesh icon src
          let ganeshSrc = "../../../builder1/assets/icons/ganesh.png";
          const gEl = doc.querySelector('.ganesh-icon img');
          if (gEl) ganeshSrc = gEl.src;
          
          // Extract couple weds illustration src
          let coupleSrc = "../../../builder1/assets/icons/weds.png";
          const cEl = doc.querySelector('.couple-box img');
          if (cEl) coupleSrc = cEl.src;
          
          // Extract bride/groom names
          let bName = "नीलम";
          let gName = "अमित";
          const bEl = doc.querySelector('[data-field="brideName"]');
          if (bEl) bName = bEl.textContent.trim().split(" ")[0];
          const grEl = doc.querySelector('[data-field="groomName"]');
          if (grEl) gName = grEl.textContent.trim().split(" ")[0];
          
          // Determine language and connect names
          let isHindi = /[\u0900-\u097F]/.test(bName);
          let nameText = isHindi ? `${bName} संग ${gName}` : `${bName.toUpperCase()} WEDS ${gName.toUpperCase()}`;
          let titleText = isHindi ? `|| निमन्त्रण पत्र ||` : `|| INVITATION ||`;
          let footerText = isHindi ? `श्रीमती एवं श्री मौर्य परिवार` : `Family & Friends Welcome You`;
          
          cardContainer.innerHTML = `
            <div class="cover-ornament c-tl">✿</div>
            <div class="cover-ornament c-tr">✿</div>
            <div class="cover-ornament c-bl">✿</div>
            <div class="cover-ornament c-br">✿</div>
            <div class="cover-content">
              <div class="cover-medallion">
                <img class="cover-ganesh" src="${ganeshSrc}" alt="Ganesh">
              </div>
              <div class="cover-title">${titleText}</div>
              <div class="cover-banner">
                <div class="cover-names">${nameText}</div>
              </div>
              <div class="cover-couple-wrap">
                <img class="cover-couple" src="${coupleSrc}" alt="Wedding Couple">
              </div>
              <div class="cover-footer">${footerText}</div>
            </div>
          `;
        }
      }, 50);
      break;
      
    case 'iframe-layer-background':
      // Layer 1: Background only. Hide everything else.
      cssText = `
        ${baseLayoutCSS}
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border-color: transparent !important; box-shadow: none !important; background: #f9f1d0 !important; top: 0 !important; left: 0 !important; position: absolute !important; }
        .fl, img, p, span, h1, h2, h3, h4, div:not(.card):not(.sec1) { visibility: hidden !important; }
      `;
      break;
      
    case 'iframe-layer-borders':
      // Layer 2: Borders & Corner ornaments. Hide background, text, artwork.
      cssText = `
        ${baseLayoutCSS}
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: 0.07cm solid #8b0040 !important; box-shadow: inset 0 0 0 0.13cm transparent, inset 0 0 0 0.20cm #8b0040 !important; background: transparent !important; top: 0 !important; left: 0 !important; position: absolute !important; }
        .fl { visibility: visible !important; }
        img, p, span, h1, h2, h3, h4, div:not(.card):not(.sec1):not(.fl) { visibility: hidden !important; }
      `;
      break;
      
    case 'iframe-layer-art':
      // Layer 3: Graphic Art & Icons. Hide background, borders, text.
      cssText = `
        ${baseLayoutCSS}
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border-color: transparent !important; box-shadow: none !important; background: transparent !important; top: 0 !important; left: 0 !important; position: absolute !important; }
        .fl, p, span, h1, h2, h3, h4 { visibility: hidden !important; }
        img, .ganesh-icon, .sun-icon, .chainleft, .chainright, .top-icon, .bottom-icon, .top1-icon, .mid-icon { visibility: visible !important; }
      `;
      break;
      
    case 'iframe-layer-text':
      // Layer 4: Personalized Text. Hide background, borders, artwork.
      cssText = `
        ${baseLayoutCSS}
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border-color: transparent !important; box-shadow: none !important; background: transparent !important; top: 0 !important; left: 0 !important; position: absolute !important; }
        .fl, img, .ganesh-icon, .sun-icon, .chainleft, .chainright, .top-icon, .bottom-icon, .top1-icon, .mid-icon { visibility: hidden !important; }
        p, span, h1, h2, h3, h4 { visibility: visible !important; }
      `;
      break;
  }
  
  styleEl.textContent = cssText;
  doc.head.appendChild(styleEl);
}

// ── NAVIGATION & TABS ──
function switchPreviewMode(mode) {
  activeViewMode = mode;
  
  // Toggle tab buttons
  document.querySelectorAll('.preview-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${mode}`).classList.add('active');
  
  // Toggle viewports
  document.querySelectorAll('.viewport-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`view-${mode}`).classList.add('active');
  
  // Toggle toolbars
  if (mode === '3d') {
    document.getElementById('controls-3d').style.display = 'flex';
    document.getElementById('controls-layers').style.display = 'none';
    document.getElementById('layers-toggle-panel').style.display = 'none';
    // Restart auto rotate if playing
    if (isAutoRotating) startAutoRotateLoop();
  } else if (mode === 'layers') {
    document.getElementById('controls-3d').style.display = 'none';
    document.getElementById('controls-layers').style.display = 'flex';
    document.getElementById('layers-toggle-panel').style.display = 'block';
    // Stop 3D auto rotate
    stopAutoRotateLoop();
  } else {
    document.getElementById('controls-3d').style.display = 'none';
    document.getElementById('controls-layers').style.display = 'none';
    document.getElementById('layers-toggle-panel').style.display = 'none';
    stopAutoRotateLoop();
  }
  
  resetZoom();
}

function goBackToEditor() {
  window.location.href = `editor.html?templateId=${templateId}`;
}

// Switch between Layered Spread and Canva Grid view modes
function switchPagesViewMode(mode) {
  const viewport = document.getElementById('pages-viewport');
  const btnSpread = document.getElementById('btn-toggle-spread');
  const btnGrid = document.getElementById('btn-toggle-grid');
  
  if (!viewport) return;
  
  // Toggle active sub-tab buttons
  if (mode === 'grid') {
    viewport.classList.remove('mode-spread');
    viewport.classList.add('mode-grid');
    if (btnSpread) btnSpread.classList.remove('active');
    if (btnGrid) btnGrid.classList.add('active');
  } else {
    viewport.classList.remove('mode-grid');
    viewport.classList.add('mode-spread');
    if (btnGrid) btnGrid.classList.remove('active');
    if (btnSpread) btnSpread.classList.add('active');
  }
}

// Open zoom inspector modal
function openZoomInspector(page) {
  const modal = document.getElementById('modal-zoom-inspector');
  const iframe = document.getElementById('iframe-zoom-preview');
  const title = document.getElementById('zoom-page-title');
  if (!modal || !iframe || !title) return;
  
  let pageTitle = "Page Preview";
  if (page === 'cover') pageTitle = "Page 1: Front Cover";
  if (page === 'sec1') pageTitle = "Page 2: Event Details";
  if (page === 'sec2') pageTitle = "Page 3: Invitation Text";
  title.textContent = pageTitle;
  
  modal.classList.add('active');
  
  const templatePath = `templates/${templateId}/template.html`;
  iframe.src = templatePath;
  iframe.onload = () => {
    syncIframeData(iframe);
    applyIframeIsolation('zoom-' + page);
  };
}

// Close zoom inspector modal
function closeZoomInspector() {
  const modal = document.getElementById('modal-zoom-inspector');
  const iframe = document.getElementById('iframe-zoom-preview');
  if (modal) {
    modal.classList.remove('active');
  }
  if (iframe) {
    iframe.src = 'about:blank'; // Clear to free resource memory
  }
}

// Close modal on ESC key press
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeZoomInspector();
  }
});

// ── 3D DRAG ROTATION (360° MOCKUP) ──
function setup3DRotation() {
  const container = document.getElementById('view-3d');
  const card = document.getElementById('card-3d');
  
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    container.style.cursor = 'grabbing';
    stopAutoRotateLoop(); // Stop auto rotate when user interacts
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    rotY += dx * 0.5; // horizontal rotate
    rotX -= dy * 0.5; // vertical rotate
    
    // Constraint vertical rotate to prevent card flipping upside down completely
    rotX = Math.max(-60, Math.min(80, rotX));
    
    update3DCardTransforms();
    
    startX = e.clientX;
    startY = e.clientY;
  });
  
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = 'grab';
      // If auto rotate was playing, resume it
      if (isAutoRotating) startAutoRotateLoop();
    }
  });
  
  // Touch support
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      stopAutoRotateLoop();
    }
  });
  
  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    
    rotY += dx * 0.5;
    rotX -= dy * 0.5;
    rotX = Math.max(-60, Math.min(80, rotX));
    
    update3DCardTransforms();
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });
  
  window.addEventListener('touchend', () => {
    isDragging = false;
    if (isAutoRotating) startAutoRotateLoop();
  });
}

function update3DCardTransforms() {
  const card = document.getElementById('card-3d');
  if (card) {
    card.style.transform = `scale(${currentZoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }
}

// Auto Rotation Loop
function startAutoRotateLoop() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  
  function rotate() {
    rotY += 0.3; // Rotate 0.3 degrees per frame
    if (rotY >= 360) rotY -= 360;
    update3DCardTransforms();
    animationFrameId = requestAnimationFrame(rotate);
  }
  
  animationFrameId = requestAnimationFrame(rotate);
  
  // Update button visual
  const btn = document.getElementById('btn-auto-rotate');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Auto';
    btn.classList.add('active');
  }
}

function stopAutoRotateLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  // Update button visual
  const btn = document.getElementById('btn-auto-rotate');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Auto Rotate';
    btn.classList.remove('active');
  }
}

function toggleAutoRotate() {
  if (isAutoRotating) {
    isAutoRotating = false;
    stopAutoRotateLoop();
  } else {
    isAutoRotating = true;
    startAutoRotateLoop();
  }
}

function reset3DCard() {
  rotX = 20;
  rotY = -10;
  currentZoom = 1.0;
  document.getElementById('fold-slider').value = 30;
  document.getElementById('fold-val').textContent = '30°';
  adjustFoldAngle(30);
  update3DCardTransforms();
}

// Fold hinge control
function adjustFoldAngle(deg) {
  const foldTop = document.getElementById('fold-top');
  const foldVal = document.getElementById('fold-val');
  if (foldTop) {
    // Top fold rotates from 0deg (open flat) to -180deg (folded shut face-to-face)
    const angle = -180 + Number(deg);
    foldTop.style.transform = `rotateX(${angle}deg)`;
  }
  if (foldVal) {
    foldVal.textContent = `${deg}°`;
  }
}

// ── 3D DRAG ROTATION FOR LAYERS VIEW ──
function setupLayers3DRotation() {
  const container = document.getElementById('view-layers');
  const stack = document.getElementById('exploder-stack');
  
  container.addEventListener('mousedown', (e) => {
    isDraggingLayers = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!isDraggingLayers) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    exploderRotZ += dx * 0.4;
    exploderRotX -= dy * 0.4;
    exploderRotX = Math.max(10, Math.min(85, exploderRotX)); // Limit pitch
    
    updateLayersTransforms();
    
    startX = e.clientX;
    startY = e.clientY;
  });
  
  window.addEventListener('mouseup', () => {
    isDraggingLayers = false;
  });
}

function updateLayersTransforms() {
  const stack = document.getElementById('exploder-stack');
  if (stack) {
    stack.style.transform = `scale(${currentZoom}) rotateX(${exploderRotX}deg) rotateZ(${exploderRotZ}deg)`;
  }
}

function adjustExplosionDepth(val) {
  depthMultiplier = Number(val);
  const stack = document.getElementById('exploder-stack');
  const depthVal = document.getElementById('depth-val');
  if (stack) {
    stack.style.setProperty('--z-depth', `${depthMultiplier}px`);
  }
  if (depthVal) {
    depthVal.textContent = `${depthMultiplier}px`;
  }
}

function toggleLayer(layerName, isChecked) {
  const layerPlane = document.getElementById(`layer-${layerName}`);
  if (layerPlane) {
    if (isChecked) {
      layerPlane.style.opacity = '1';
      layerPlane.style.display = 'block';
    } else {
      layerPlane.style.opacity = '0';
      // Use set timeout to hide completely after fade transition finishes
      setTimeout(() => {
        if (!isChecked) layerPlane.style.display = 'none';
      }, 350);
    }
  }
}

function resetLayersView() {
  exploderRotX = 55;
  exploderRotZ = -40;
  currentZoom = 1.0;
  depthMultiplier = 60;
  document.getElementById('depth-slider').value = 60;
  document.getElementById('depth-val').textContent = '60px';
  
  const stack = document.getElementById('exploder-stack');
  if (stack) {
    stack.style.setProperty('--z-depth', `60px`);
  }
  updateLayersTransforms();
}

// ── ZOOM CONTROLS ──
function zoomPreview(val) {
  currentZoom += val;
  currentZoom = Math.max(0.4, Math.min(2.0, currentZoom));
  
  if (activeViewMode === '3d') {
    update3DCardTransforms();
  } else if (activeViewMode === 'layers') {
    updateLayersTransforms();
  } else if (activeViewMode === 'flat') {
    updateFlatCardTransforms();
  }
}

function resetZoom() {
  currentZoom = activeViewMode === '3d' ? 0.9 : (activeViewMode === 'flat' ? 0.8 : 1.0);
  if (activeViewMode === '3d') {
    update3DCardTransforms();
  } else if (activeViewMode === 'layers') {
    updateLayersTransforms();
  } else if (activeViewMode === 'flat') {
    updateFlatCardTransforms();
  }
}

const FLAT_TEMPLATE_WIDTH = 888;
const FLAT_TEMPLATE_HEIGHT = 718;

function updateFlatCardTransforms() {
  const card = document.querySelector('.flat-full-frame');
  const scalerWrap = document.querySelector('.flat-scaler-wrapper');
  if (card && scalerWrap) {
    card.style.transform = `translateX(-50%) scale(${currentZoom})`;
    scalerWrap.style.width = (FLAT_TEMPLATE_WIDTH * currentZoom) + 'px';
    scalerWrap.style.height = (FLAT_TEMPLATE_HEIGHT * currentZoom) + 'px';
  }
}

// ── PRICING & QUANTITY ──
function adjustQuantity(val) {
  const input = document.getElementById('quantity-input');
  let newQty = parseInt(input.value) + val;
  if (isNaN(newQty)) newQty = 100;
  if (newQty < 100) newQty = 100;
  
  input.value = newQty;
  validateAndSetQuantity(newQty);
}

function validateAndSetQuantity(val) {
  const feedback = document.getElementById('qty-validation-feedback');
  let qtyVal = parseInt(val);
  
  if (isNaN(qtyVal) || qtyVal < 100) {
    qtyVal = 100;
    document.getElementById('quantity-input').value = 100;
    feedback.textContent = "Minimum printing limit is 100 cards. Quantity set to 100.";
    feedback.style.display = "block";
  } else {
    feedback.style.display = "none";
  }
  
  quantity = qtyVal;
  syncQuantityChips(qtyVal);
  recalculatePricing();
  triggerSaving();
}

function setQuantityPreset(qtyVal) {
  const input = document.getElementById('quantity-input');
  if (input) {
    input.value = qtyVal;
  }
  validateAndSetQuantity(qtyVal);
}

function syncQuantityChips(qty) {
  document.querySelectorAll('.qty-chip').forEach(chip => {
    chip.classList.remove('active');
  });
  const matchingChip = document.getElementById(`chip-${qty}`);
  if (matchingChip) {
    matchingChip.classList.add('active');
  }
}

function updatePaperSelection(el) {
  paperStock = el.value;
  
  // Highlight card wrapper
  document.querySelectorAll('input[name="paper-stock"]').forEach(radio => {
    radio.closest('.option-card')?.classList.remove('checked');
  });
  el.closest('.option-card')?.classList.add('checked');
  
  recalculatePricing();
  triggerSaving();
}

function updateEnvelopeSelection(el) {
  envelopeOption = el.value;
  
  // Highlight card wrapper
  document.querySelectorAll('input[name="envelope"]').forEach(radio => {
    radio.closest('.option-card')?.classList.remove('checked');
  });
  el.closest('.option-card')?.classList.add('checked');
  
  recalculatePricing();
  triggerSaving();
}

// Pricing calculation logic
function recalculatePricing() {
  // 1. Base card price tier brackets based on quantity
  let basePrice = 20.00;
  let tierLabel = 'Standard Tier';
  
  if (quantity >= 500) {
    basePrice = 10.00; // 50% discount
    tierLabel = 'Royal Tier (50% Off)';
  } else if (quantity >= 300) {
    basePrice = 13.00; // 35% discount
    tierLabel = 'Gold Tier (35% Off)';
  } else if (quantity >= 150) {
    basePrice = 16.00; // 20% discount
    tierLabel = 'Silver Tier (20% Off)';
  } else {
    basePrice = 20.00; // standard base price
    tierLabel = 'Standard Tier';
  }
  
  // 2. Paper upgrades add-on
  let paperAddon = 0.00;
  switch (paperStock) {
    case 'glossy': paperAddon = 2.00; break;
    case 'linen': paperAddon = 5.00; break;
    case 'metallic': paperAddon = 8.00; break;
  }
  
  // 3. Envelope upgrades add-on
  let envelopeAddon = 0.00;
  switch (envelopeOption) {
    case 'velvet': envelopeAddon = 5.00; break;
    case 'none': envelopeAddon = -2.00; break; // Discount if envelopes omitted
  }
  
  // Total calculated price per unit
  unitPrice = basePrice + paperAddon + envelopeAddon;
  
  // Itemized calculations
  let volumeDiscount = 20.00 - basePrice;
  let grandTotal = unitPrice * quantity;
  
  // Update UI Elements
  const basePriceEl = document.getElementById('base-price-val');
  if (basePriceEl) basePriceEl.textContent = '₹20.00';
  
  const paperAddonEl = document.getElementById('paper-addon-val');
  if (paperAddonEl) paperAddonEl.textContent = `+₹${paperAddon.toFixed(2)}`;
  
  const envelopeAddonEl = document.getElementById('envelope-addon-val');
  if (envelopeAddonEl) {
    if (envelopeAddon >= 0) {
      envelopeAddonEl.textContent = `+₹${envelopeAddon.toFixed(2)}`;
      envelopeAddonEl.style.color = '';
    } else {
      envelopeAddonEl.textContent = `-₹${Math.abs(envelopeAddon).toFixed(2)}`;
      envelopeAddonEl.style.color = '#fbbf24'; // Highlight discount color
    }
  }
  
  const discountRow = document.getElementById('discount-breakdown-row');
  const discountAddonEl = document.getElementById('discount-addon-val');
  if (discountRow && discountAddonEl) {
    if (volumeDiscount > 0) {
      discountAddonEl.textContent = `-₹${volumeDiscount.toFixed(2)}`;
      discountRow.style.display = 'flex';
    } else {
      discountRow.style.display = 'none';
    }
  }
  
  const tierBadge = document.getElementById('discount-badge-label');
  if (tierBadge) tierBadge.textContent = tierLabel;
  
  // Update unit price on UI
  const unitPriceEl = document.getElementById('unit-price-val');
  if (unitPriceEl) unitPriceEl.textContent = unitPrice.toFixed(2);
  
  // Update Grand Total on UI
  const totalPriceEl = document.getElementById('total-price-val');
  if (totalPriceEl) {
    totalPriceEl.textContent = grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  // Update discount notice banner
  const discountBanner = document.getElementById('discount-banner');
  if (discountBanner) {
    if (quantity >= 500) {
      discountBanner.innerHTML = '<i class="fa-solid fa-crown"></i> Royal Tier: 50% off base card stock applied!';
      discountBanner.style.background = 'rgba(255, 255, 255, 0.08)';
    } else if (quantity >= 300) {
      discountBanner.innerHTML = '<i class="fa-solid fa-tag"></i> Gold Tier: 35% off base card stock applied!';
      discountBanner.style.background = 'rgba(255, 255, 255, 0.06)';
    } else if (quantity >= 150) {
      discountBanner.innerHTML = '<i class="fa-solid fa-tag"></i> Silver Tier: 20% off base card stock applied!';
      discountBanner.style.background = 'rgba(255, 255, 255, 0.06)';
    } else {
      discountBanner.innerHTML = '<i class="fa-solid fa-circle-info"></i> Order 150+ cards to unlock discount tiers!';
      discountBanner.style.background = 'rgba(255, 255, 255, 0.04)';
    }
  }
}

// ── SAVE DRAFT ──
let saveTimeout = null;
function triggerSaving() {
  const status = document.getElementById('save-status');
  const text = document.getElementById('save-status-text');
  if (!status || !text) return;
  
  status.classList.add('saving');
  text.textContent = 'Saving...';
  
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    status.classList.remove('saving');
    text.textContent = 'Draft Saved';
  }, 1000);
}

function saveDraft() {
  const config = {
    quantity,
    paperStock,
    envelopeOption
  };
  localStorage.setItem("mic_saved_print_config", JSON.stringify(config));
  
  triggerSaving();
  toast("Print customization saved to draft successfully!", "s");
}

// ── CHECKOUT NAVIGATION ──
function proceedToCheckout() {
  // Package order details
  const orderDetails = {
    templateId,
    documentTitle,
    quantity,
    paperStock,
    envelopeOption,
    unitPrice,
    data: currentData
  };
  
  // Store details
  localStorage.setItem("mic_current_order_config", JSON.stringify(orderDetails));
  
  // Go to checkout step 2
  window.location.href = "checkout.html";
}

// ── LOCAL HOME PRINT ──
function triggerLocalPrint() {
  toast("Preparing PDF for local printing...", "i");
  const hiddenIframe = document.getElementById('print-iframe-hidden');
  if (hiddenIframe) {
    hiddenIframe.src = `templates/${templateId}/template.html`;
    hiddenIframe.onload = () => {
      // Send print template updates
      syncIframeData(hiddenIframe);
      // Wait for rendering, then run browser print
      setTimeout(() => {
        hiddenIframe.contentWindow.focus();
        hiddenIframe.contentWindow.print();
      }, 500);
    };
  }
}

// ── TOAST MESSAGES ──
function toast(msg, type = 's') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const t = document.createElement('div');
  t.className = `toast ${type === 's' ? 'success' : type === 'e' ? 'error' : 'info'}`;
  
  let icon = 'fa-circle-check';
  if (type === 'e') icon = 'fa-circle-exclamation';
  if (type === 'i') icon = 'fa-circle-info';
  
  t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
  container.appendChild(t);
  
  // Auto-remove
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(20px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

// ── Firebase Modules Loader for Navbar Sync ──
let firebaseAuth = null;
let firebaseConfig = null;
let currentUser = null;
let userLoggedIn = false;

Promise.all([
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
  import("../assets/js/firebase-config.js")
]).then(([authMod, configMod]) => {
  firebaseAuth = authMod;
  firebaseConfig = configMod;

  firebaseAuth.onAuthStateChanged(firebaseConfig.auth, (user) => {
    if (user) {
      const displayName = user.displayName?.trim() || localStorage.getItem("signupFullName")?.trim() || user.email.split('@')[0];
      currentUser = {
        name: displayName,
        email: user.email,
        photoURL: user.photoURL
      };
      userLoggedIn = true;
    } else {
      currentUser = null;
      userLoggedIn = false;
    }
    updateHeaderProfileUI(user);
  });
}).catch(err => {
  console.error("Failed to load Firebase modules in navbar:", err);
});

// Update profile avatar & button in header
function updateHeaderProfileUI(user) {
  const avatarBtn = document.getElementById('builderUserMenuBtn');
  const loginBtn = document.getElementById('builderHeaderLoginBtn');
  const avatarSpan = document.getElementById('builderAvatar');
  const popupAvatar = document.getElementById('builderPopupAvatar');
  const popupName = document.getElementById('builderPopupUserName');
  const popupEmail = document.getElementById('builderPopupUserEmail');

  if (user) {
    if (avatarBtn) avatarBtn.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';

    const displayName = user.displayName || localStorage.getItem('signupFullName') || user.email?.split('@')[0] || 'User';
    if (popupName) popupName.textContent = displayName;
    if (popupEmail) popupEmail.textContent = user.email || 'No email';

    if (user.photoURL) {
      const imgHTML = `<img src="${user.photoURL}" alt="avatar">`;
      if (avatarSpan) avatarSpan.innerHTML = imgHTML;
      if (popupAvatar) popupAvatar.innerHTML = imgHTML;
    } else {
      const initial = displayName.charAt(0).toUpperCase();
      const bgColor = getAvatarBgColor(displayName);
      const avatarHTML = `<div class="avatar-initial" style="background-color: ${bgColor}">${initial}</div>`;
      if (avatarSpan) avatarSpan.innerHTML = avatarHTML;
      if (popupAvatar) popupAvatar.innerHTML = avatarHTML;
    }
  } else {
    if (avatarBtn) avatarBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'flex';
    const userPopup = document.getElementById('builderUserPopup');
    if (userPopup) userPopup.classList.remove('show');
  }
}

function getAvatarBgColor(name) {
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

// Bind avatar click toggle
window.addEventListener('DOMContentLoaded', () => {
  const profileBtn = document.getElementById('builderUserMenuBtn');
  const userPopup = document.getElementById('builderUserPopup');
  if (profileBtn && userPopup) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userPopup.classList.toggle('show');
    });
    userPopup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Close popup on click outside
  document.addEventListener('click', () => {
    const popup = document.getElementById('builderUserPopup');
    if (popup) popup.classList.remove('show');
  });

  // Logout actions
  const logoutBtn = document.getElementById('builderLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLogoutConfirm();
    });
  }
});

// Logout Popups
function showLogoutConfirm() {
  const popup = document.getElementById('logout-confirm-popup');
  if (popup) popup.style.display = 'block';
}

function closeLogoutConfirm() {
  const popup = document.getElementById('logout-confirm-popup');
  if (popup) popup.style.display = 'none';
}

function executeLogout() {
  closeLogoutConfirm();
  if (firebaseAuth && firebaseConfig) {
    firebaseAuth.signOut(firebaseConfig.auth).then(() => {
      toast("Logged out successfully", "s");
      setTimeout(() => {
        window.location.href = '../template-dashboard.html';
      }, 1000);
    }).catch(err => {
      console.error("Signout error:", err);
      toast("Error logging out", "e");
    });
  } else {
    toast("Auth connection error", "e");
  }
}
