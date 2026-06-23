/* ════════════════════════════════════════════════════════════
   print.js - Print Configuration Logic
   ════════════════════════════════════════════════════════════ */

// Global State
let templateId = 'card1';
let documentTitle = 'Wedding Card';
let currentData = { fields: {}, events: {}, styles: {} };

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
let isAutoRotating = true;
let animationFrameId = null;

// Zoom State
let currentZoom = 1.0;

// Active View Mode ('3d', 'layers', 'flat')
let activeViewMode = '3d';

// Exploder State
let depthMultiplier = 60; // default 60px between planes
let exploderRotX = 55;
let exploderRotZ = -40;
let isDraggingLayers = false;

// ── INITIALIZATION ──
window.addEventListener('DOMContentLoaded', () => {
  // 1. Load project data from localStorage
  loadProjectData();
  
  // 2. Load print settings if saved previously
  loadSavedPrintConfig();

  // 3. Initialize UI Inputs
  document.getElementById('doc-title-display').textContent = documentTitle;
  document.getElementById('quantity-input').value = quantity;
  
  // Set checked radio button options
  setRadioChecked('paper-stock', paperStock);
  setRadioChecked('envelope', envelopeOption);
  
  // 4. Load all preview iframes
  initializeIframes();
  
  // 5. Setup Drag-to-Rotate mouse/touch events
  setup3DRotation();
  setupLayers3DRotation();
  
  // 6. Start auto-rotation loop
  if (isAutoRotating) {
    startAutoRotateLoop();
  }
  
  // 7. Calculate initial pricing
  recalculatePricing();
});

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
    'iframe-layer-text', 'iframe-layer-art', 'iframe-layer-borders', 'iframe-layer-background',
    'iframe-flat-sec1', 'iframe-flat-sec2'
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
      };
    }
  });
}

// Send synchronized data updates to iframe
function syncIframeData(iframe) {
  if (iframe && iframe.contentWindow) {
    const resolvedData = {
      fields: currentData.fields || {},
      events: currentData.events || {},
      styles: currentData.styles || {}
    };
    
    iframe.contentWindow.postMessage({
      type: 'UPDATE_TEMPLATE_DATA',
      data: resolvedData
    }, '*');
  }
}

// Apply isolated layer styles inside individual iframes
function applyIframeIsolation(iframeId) {
  const iframe = document.getElementById(iframeId);
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
    case 'iframe-flat-sec1':
      cssText = `
        ${baseLayoutCSS}
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; margin: 0 !important; position: absolute !important; }
      `;
      break;
      
    case 'iframe-sec2':
    case 'iframe-flat-sec2':
      cssText = `
        ${baseLayoutCSS}
        .sec1 { display: none !important; }
        .sec2 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; margin: 0 !important; position: absolute !important; }
      `;
      break;
      
    case 'iframe-cover':
      // Build a beautiful custom cover page that matches card theme inside top fold back
      cssText = `
        ${baseLayoutCSS}
        .sec1, .sec2 { display: none !important; }
        
        .card {
          background: #f9f1d0 !important;
          border: 0.07cm solid #8b0040 !important;
          box-shadow: inset 0 0 0 0.13cm #f9f1d0, inset 0 0 0 0.20cm #8b0040 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
          box-sizing: border-box !important;
        }
        
        /* Ornamental corners */
        .cover-ornament {
          position: absolute;
          color: #8b0040;
          font-size: 1.2cm;
          line-height: 1;
          z-index: 10;
        }
        .c-tl { top: 0.4cm; left: 0.2cm; }
        .c-tr { top: 0.4cm; right: 0.2cm; }
        .c-bl { bottom: -0.07cm; left: 0.2cm; }
        .c-br { bottom: -0.07cm; right: 0.2cm; }
        
        .cover-content {
          text-align: center;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .cover-ganesh {
          width: 1.8cm;
          height: auto;
          margin-bottom: 0.3cm;
        }
        
        .cover-title {
          font-size: 0.65cm;
          font-weight: 700;
          color: #6e0035;
          margin-bottom: 0.2cm;
          letter-spacing: 0.05cm;
        }
        
        .cover-names {
          font-size: 0.58cm;
          font-weight: 600;
          color: #8b0040;
          margin-bottom: 0.4cm;
        }
        
        .cover-footer {
          font-size: 0.35cm;
          color: #6e0035;
          letter-spacing: 0.04cm;
          opacity: 0.85;
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
          
          // Extract bride/groom names
          let bName = "नीलम";
          let gName = "अमित";
          const bEl = doc.querySelector('[data-field="brideName"]');
          if (bEl) bName = bEl.textContent.trim().split(" ")[0];
          const grEl = doc.querySelector('[data-field="groomName"]');
          if (grEl) gName = grEl.textContent.trim().split(" ")[0];
          
          cardContainer.innerHTML = `
            <div class="cover-ornament c-tl">✿</div>
            <div class="cover-ornament c-tr">✿</div>
            <div class="cover-ornament c-bl">✿</div>
            <div class="cover-ornament c-br">✿</div>
            <div class="cover-content">
              <img class="cover-ganesh" src="${ganeshSrc}" alt="Ganesh">
              <div class="cover-title">|| निमन्त्रण पत्र ||</div>
              <div class="cover-names">${bName} संग ${gName}</div>
              <div class="cover-footer">श्रीमती एवं श्री मौर्य परिवार</div>
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
  }
}

function resetZoom() {
  currentZoom = activeViewMode === '3d' ? 0.9 : 1.0;
  if (activeViewMode === '3d') {
    update3DCardTransforms();
  } else if (activeViewMode === 'layers') {
    updateLayersTransforms();
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
  recalculatePricing();
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
  
  if (quantity >= 500) {
    basePrice = 10.00; // 50% discount
  } else if (quantity >= 300) {
    basePrice = 13.00; // 35% discount
  } else if (quantity >= 150) {
    basePrice = 16.00; // 20% discount
  } else {
    basePrice = 20.00; // standard base price
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
  
  // Update unit price on UI
  document.getElementById('unit-price-val').textContent = unitPrice.toFixed(2);
  
  // Update discount notice banner
  const discountBanner = document.getElementById('discount-banner');
  if (quantity >= 500) {
    discountBanner.innerHTML = '<i class="fa-solid fa-crown"></i> Royal Tier: 50% off base card stock applied!';
    discountBanner.style.background = 'rgba(255, 255, 255, 0.18)';
  } else if (quantity >= 300) {
    discountBanner.innerHTML = '<i class="fa-solid fa-tag"></i> Gold Tier: 35% off base card stock applied!';
    discountBanner.style.background = 'rgba(255, 255, 255, 0.15)';
  } else if (quantity >= 150) {
    discountBanner.innerHTML = '<i class="fa-solid fa-tag"></i> Silver Tier: 20% off base card stock applied!';
    discountBanner.style.background = 'rgba(255, 255, 255, 0.12)';
  } else {
    discountBanner.innerHTML = '<i class="fa-solid fa-circle-info"></i> Order 150+ cards to unlock discount tiers!';
    discountBanner.style.background = 'rgba(255, 255, 255, 0.1)';
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
