// ── UNIVERSAL TEMPLATE EDITOR CORE (PREMIUM UX & NAV ALIGNMENT) ──

const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://myinvitationcard.onrender.com";

// Parse templateId from URL parameter on load
const urlParams = new URLSearchParams(window.location.search);
let templateParam = urlParams.get('templateId') || urlParams.get('template') || 'card1';
if (templateParam === '1' || templateParam === '37' || templateParam === '38') {
  templateParam = 'card1';
}
let activeTemplateId = templateParam;
let activeProjectId = urlParams.get('projectId') || null;

let config = null;
let currentData = {
  fields: {},
  events: {},
  styles: {}
};

// ── Firebase Modules ──
let firebaseAuth = null;
let firebaseConfig = null;

Promise.all([
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
  import("../assets/js/firebase-config.js")
]).then(([authMod, configMod]) => {
  firebaseAuth = authMod;
  firebaseConfig = configMod;

  // Initialize Firebase Auth state listener
  firebaseAuth.onAuthStateChanged(firebaseConfig.auth, (user) => {
    if (user) {
      const displayName = user.displayName?.trim() || localStorage.getItem("signupFullName")?.trim() || user.email.split('@')[0];
      currentUser = {
        uid: user.uid,
        name: displayName,
        email: user.email,
        photoURL: user.photoURL
      };
      userLoggedIn = true;
      // Auto save the project under the logged-in user so it shows up in their profile drafts!
      setTimeout(() => {
        autoSaveUserProject();
      }, 1000);
    } else {
      currentUser = null;
      userLoggedIn = false;
    }
    checkAuthState();
    updateHeaderProfileUI(user);
  });
}).catch(err => {
  console.error("Failed to load Firebase modules:", err);
});

// Map of categories to group flat fields together
const FIELD_CATEGORIES = [
  "Mantra & Shloka",
  "Bride Details",
  "Groom Details",
  "Invitation Details",
  "Family Details",
  "Bal Aagrah"
];

const $ = id => document.getElementById(id);
const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';

const DEFAULT_STYLE = {
  cardBg: '#f9f1d0',
  bodyBg: '#c8829a',
  accentColor: '#8b0040',
  textColor: '#6e0035',
  headingColor: '#6e0035',
  fontFamily: 'Noto Serif Devanagari',
  shlokaSize: 100,
  headingSize: 100,
  namesSize: 100,
  eventSize: 100,
  footerSize: 100,
  showGanesh: true,
  ganeshSize: 100,
  ganeshOffsetX: 0,
  ganeshOffsetY: 0,
  showOm: true,
  omSize: 100,
  omOffsetX: 0,
  omOffsetY: 0,
  showChains: true,
  chainsSize: 100,
  chainLeftOffsetX: 0,
  chainLeftOffsetY: 0,
  chainRightOffsetX: 0,
  chainRightOffsetY: 0,
  showCouple: true,
  coupleSize: 100,
  couple1OffsetX: 0,
  couple1OffsetY: 0,
  couple2OffsetX: 0,
  couple2OffsetY: 0,
  topIconOffsetX: 0,
  topIconOffsetY: 0,
  top1IconOffsetX: 0,
  top1IconOffsetY: 0,
  bottomIconOffsetX: 0,
  bottomIconOffsetY: 0,
  midIconOffsetX: 0,
  midIconOffsetY: 0,
  cornerTlOffsetX: 0,
  cornerTlOffsetY: 0,
  cornerTrOffsetX: 0,
  cornerTrOffsetY: 0,
  cornerBlOffsetX: 0,
  cornerBlOffsetY: 0,
  cornerBrOffsetX: 0,
  cornerBrOffsetY: 0,
  showCorners: true,
  cornerSymbol: '✿',
  cornerSize: 100,
  cardPadding: 1.0,
  sectionGap: 0.3,
  showBorder: true,
  curveLevel: 0,
  borderPreset: 'classic',
  borderColor: '#8b0040',
  iconColors: {},
  iconReplacements: {}
};

const PRESETS = [
  {
    name: 'Classic Pink',
    cardBg: '#f2aec8',
    bodyBg: '#c8829a',
    accent: '#8b0040',
    text: '#6e0035',
    heading: '#6e0035',
    iconReplacements: {
      ganesh: '../builder1/assets/icons/ganesh.png',
      om: '../builder1/assets/icons/om.png',
      chainLeft: '../builder1/assets/icons/side.png',
      chainRight: '../builder1/assets/icons/side.png',
      topIcon: '../builder1/assets/icons/top.png',
      top1Icon: '../builder1/assets/icons/t1.png',
      bottomIcon: '../builder1/assets/icons/top2.png',
      midIcon: '../builder1/assets/icons/mid.png',
      couple1: '../builder1/assets/icons/weds.png',
      couple2: '../builder1/assets/icons/weds.png'
    }
  },
  {
    name: 'Royal Crimson',
    cardBg: '#fffcf0',
    bodyBg: '#800000',
    accent: '#d4af37',
    text: '#5c000a',
    heading: '#5c000a',
    iconReplacements: {
      ganesh: '../builder1/assets/icons/ganesh.png',
      om: '../builder1/assets/icons/om.png',
      chainLeft: '../builder1/assets/icons/side.png',
      chainRight: '../builder1/assets/icons/side.png',
      topIcon: '../builder1/assets/icons/top2.png',
      top1Icon: '../builder1/assets/icons/t1.png',
      bottomIcon: '../builder1/assets/icons/top.png',
      midIcon: '../builder1/assets/icons/mid.png',
      couple1: '../builder1/assets/icons/weds.png',
      couple2: '../builder1/assets/icons/weds.png'
    }
  },
  {
    name: 'Vibrant Saffron',
    cardBg: '#fff7eb',
    bodyBg: '#e05e00',
    accent: '#b80000',
    text: '#6b0000',
    heading: '#6b0000',
    iconReplacements: {
      ganesh: '../builder1/assets/icons/ganesh.png',
      om: '../builder1/assets/icons/om.png',
      chainLeft: '../builder1/assets/icons/side.png',
      chainRight: '../builder1/assets/icons/side.png',
      topIcon: '../builder1/assets/icons/top.png',
      top1Icon: '../builder1/assets/icons/t2.png',
      bottomIcon: '../builder1/assets/icons/top2.png',
      midIcon: '../builder1/assets/icons/mid.png',
      couple1: '../builder1/assets/icons/weds.png',
      couple2: '../builder1/assets/icons/weds.png'
    }
  },
  {
    name: 'Peacock & Gold',
    cardBg: '#f0f8ff',
    bodyBg: '#093a5c',
    accent: '#d4af37',
    text: '#052238',
    heading: '#052238',
    iconReplacements: {
      ganesh: '../builder1/assets/icons/ganesh.png',
      om: '../builder1/assets/icons/om.png',
      chainLeft: '../builder1/assets/icons/side.png',
      chainRight: '../builder1/assets/icons/side.png',
      topIcon: '../builder1/assets/icons/t1.png',
      top1Icon: '../builder1/assets/icons/top.png',
      bottomIcon: '../builder1/assets/icons/t2.png',
      midIcon: '../builder1/assets/icons/mid.png',
      couple1: '../builder1/assets/icons/weds.png',
      couple2: '../builder1/assets/icons/weds.png'
    }
  },
  {
    name: 'Royal Purple',
    cardBg: '#faf0ff',
    bodyBg: '#3c0c5c',
    accent: '#c71585',
    text: '#28003d',
    heading: '#28003d',
    iconReplacements: {
      ganesh: '../builder1/assets/icons/ganesh.png',
      om: '../builder1/assets/icons/om.png',
      chainLeft: '../builder1/assets/icons/side.png',
      chainRight: '../builder1/assets/icons/side.png',
      topIcon: '../builder1/assets/icons/top2.png',
      top1Icon: '../builder1/assets/icons/t2.png',
      bottomIcon: '../builder1/assets/icons/t1.png',
      midIcon: '../builder1/assets/icons/mid.png',
      couple1: '../builder1/assets/icons/weds.png',
      couple2: '../builder1/assets/icons/weds.png'
    }
  },
  {
    name: 'Golden Ivory',
    cardBg: '#faf6eb',
    bodyBg: '#2b211a',
    accent: '#c9784c',
    text: '#403026',
    heading: '#403026',
    iconReplacements: {
      ganesh: '../builder1/assets/icons/ganesh.png',
      om: '../builder1/assets/icons/om.png',
      chainLeft: '../builder1/assets/icons/side.png',
      chainRight: '../builder1/assets/icons/side.png',
      topIcon: '../builder1/assets/icons/top.png',
      top1Icon: '../builder1/assets/icons/t1.png',
      bottomIcon: '../builder1/assets/icons/top2.png',
      midIcon: '../builder1/assets/icons/mid.png',
      couple1: '../builder1/assets/icons/weds.png',
      couple2: '../builder1/assets/icons/weds.png'
    }
  }
];

const ICON_NUDGE_CONFIG = [
  { key: 'ganesh', title: 'Ganesha Motif' },
  { key: 'om', title: 'Om / Sun Motif' },
  { key: 'chainLeft', title: 'Left Hanging Ornament' },
  { key: 'chainRight', title: 'Right Hanging Ornament' },
  { key: 'topIcon', title: 'Hanging Accent (Center-Left)' },
  { key: 'midIcon', title: 'Hanging Accent (Center-Right)' },
  { key: 'bottomIcon', title: 'Hanging Accent (Left)' },
  { key: 'top1Icon', title: 'Hanging Accent (Right)' },
  { key: 'couple1', title: 'Weds Motif (Top)' },
  { key: 'couple2', title: 'Weds Motif (Bottom)' }
];

const ICON_COLOR_CONFIG = ICON_NUDGE_CONFIG;

const CORNER_NUDGE_CONFIG = [
  { key: 'cornerTl', title: 'Top Left Corner Accent' },
  { key: 'cornerTr', title: 'Top Right Corner Accent' },
  { key: 'cornerBl', title: 'Bottom Left Corner Accent' },
  { key: 'cornerBr', title: 'Bottom Right Corner Accent' }
];

let ICON_LIBRARY = [];
let ICON_CATEGORIES = [];
let ICON_LIBRARY_FILTER = {
  query: '',
  category: 'all'
};
let ICON_ACCORDION_STATE = {
  library: false,
  core: false,
  advanced: false
};

let ICON_REPLACE_TARGET = 'ganesh';

const STATIC_ICON_LIBRARY = [
  {
    id: 'ganesh-classic-001',
    name: 'Ganesh Classic',
    category: 'core',
    subcategory: 'ganesh',
    keywords: ['ganesh', 'ganesha', 'lord ganesha', 'hindu', 'wedding', 'invitation'],
    file: '../builder1/assets/icons/ganesh.png'
  },
  {
    id: 'om-sun-001',
    name: 'Om Sun',
    category: 'core',
    subcategory: 'om',
    keywords: ['om', 'aum', 'sun', 'spiritual', 'hindu'],
    file: '../builder1/assets/icons/om.png'
  },
  {
    id: 'border-side-001',
    name: 'Side Border',
    category: 'borders',
    subcategory: 'traditional',
    keywords: ['border', 'side', 'chain', 'ornament'],
    file: '../builder1/assets/icons/side.png'
  },
  {
    id: 'border-top-001',
    name: 'Top Border',
    category: 'borders',
    subcategory: 'modern',
    keywords: ['border', 'top', 'ornament'],
    file: '../builder1/assets/icons/top.png'
  },
  {
    id: 'border-top-002',
    name: 'Top Border Alt',
    category: 'borders',
    subcategory: 'traditional',
    keywords: ['border', 'top', 'ornament'],
    file: '../builder1/assets/icons/top2.png'
  },
  {
    id: 'decor-t1-001',
    name: 'Decorative T1',
    category: 'decorative',
    subcategory: 'ornaments',
    keywords: ['ornament', 'ribbon', 'decorative'],
    file: '../builder1/assets/icons/t1.png'
  },
  {
    id: 'decor-t2-001',
    name: 'Decorative T2',
    category: 'decorative',
    subcategory: 'ornaments',
    keywords: ['ornament', 'ribbon', 'decorative'],
    file: '../builder1/assets/icons/t2.png'
  },
  {
    id: 'decor-mid-001',
    name: 'Center Motif',
    category: 'decorative',
    subcategory: 'mandala',
    keywords: ['mid', 'center', 'motif', 'mandala'],
    file: '../builder1/assets/icons/mid.png'
  },
  {
    id: 'wedding-couple-001',
    name: 'Wedding Couple',
    category: 'wedding',
    subcategory: 'bride-groom',
    keywords: ['wedding', 'couple', 'bride', 'groom'],
    file: '../builder1/assets/icons/weds.png'
  }
];

const ICON_REPLACE_TARGETS = [
  { key: 'ganesh', label: 'Primary Ganesh' },
  { key: 'om', label: 'Primary Om / Sun' },
  { key: 'chainLeft', label: 'Left Border Chain' },
  { key: 'chainRight', label: 'Right Border Chain' },
  { key: 'topIcon', label: 'Top Frame Accent' },
  { key: 'top1Icon', label: 'Top Secondary Accent' },
  { key: 'bottomIcon', label: 'Bottom Frame Accent' },
  { key: 'midIcon', label: 'Center Motif' },
  { key: 'couple2', label: 'Couple Emblem - Section 2' }
];


// Zoom scaling variables matching builder1
let zoomScale = 0.75; // Default 75% zoom
const cardWidth = 893;
const cardHeight = 760;

// Authentication state
let userLoggedIn = false;
let currentUser = null;

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  // Load default template
  loadTemplate(activeTemplateId);
  
  // Set up auth state
  checkAuthState();
  
  // Document title change listener
  const titleInput = document.getElementById('doc-title-input');
  if (titleInput) {
    titleInput.addEventListener('change', (e) => {
      triggerSaving();
      toast('Draft renamed to: ' + e.target.value, 's');
    });
  }

  // Toggle profile popup dropdown
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

  // Global click listener to close dropdown menu
  document.addEventListener('click', () => {
    document.getElementById('dl-wrap').classList.remove('open');
    const popup = document.getElementById('builderUserPopup');
    if (popup) popup.classList.remove('show');
  });

  // Log out action from profile popup dropdown
  const logoutBtn = document.getElementById('builderLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLogoutConfirm();
    });
  }

  // Resize listener for auto-fitting live preview
  window.addEventListener('resize', () => {
    autoFit();
  });

  // Bind zoom buttons
  const zIn = document.getElementById('z-in');
  const zOut = document.getElementById('z-out');
  const zFit = document.getElementById('z-fit');
  if (zIn) zIn.onclick = () => setZoom(currentZoom + 5);
  if (zOut) zOut.onclick = () => setZoom(currentZoom - 5);
  if (zFit) zFit.onclick = autoFit;

  // Initialize customizer elements
  renderColorPresets();
  loadIconLibrary();
  renderIconColorControls();
  renderIconNudgeControls();
  renderCornerNudgeControls();

  // Initialize transliteration state
  initTransliterationState();
});

// Load template configuration
async function loadTemplate(templateId) {
  activeTemplateId = templateId;
  
  try {
    const response = await fetch(`templates/${templateId}/config.json`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    config = await response.json();
    
    // Initialize data state from config defaults
    initializeDataState();
    
    // Fetch dynamic template settings from backend DB
    try {
      const dbRes = await fetch(`${BACKEND_URL}/api/templates/${templateId}`);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.success && dbData.template) {
          window._templateDbConfig = dbData.template;
          // Filter card stock dropdown based on allowed colors
          filterCardStockDropdown(dbData.template);
        }
      }
    } catch (dbErr) {
      console.warn("Could not load template settings from backend:", dbErr.message);
    }
    
    // Check if there is imported VLS data in localStorage
    const savedVlsStr = localStorage.getItem("savedVlsData");
    if (savedVlsStr) {
      try {
        const vlsData = JSON.parse(savedVlsStr);
        if (vlsData && vlsData.data) {
          currentData = vlsData.data;
          
          // Ensure all events are active and null values are preserved/set
          if (currentData.events) {
            Object.keys(currentData.events).forEach(key => {
              currentData.events[key].active = true;
              if (currentData.events[key].name === undefined) currentData.events[key].name = null;
              if (currentData.events[key].date === undefined) currentData.events[key].date = null;
            });
          }
          
          // Ensure styles exist
          if (!currentData.styles) {
            currentData.styles = JSON.parse(JSON.stringify(DEFAULT_STYLE));
          }
          
          // Restore document title
          if (vlsData.documentTitle) {
            const titleInput = document.getElementById('doc-title-input');
            if (titleInput) titleInput.value = vlsData.documentTitle;
          }
          
          toast('Project loaded from .vls file successfully!', 's');
        }
      } catch (err) {
        console.error("Error parsing savedVlsData from localStorage:", err);
      } finally {
        localStorage.removeItem("savedVlsData");
      }
    }
    
    // Generate Editor forms dynamically
    generateContentForm();
    generateCeremoniesForm();
    generateStylesForm();
    
    // Set preview iframe template path directly
    const previewIframe = document.getElementById('card1-iframe');
    if (previewIframe) {
      previewIframe.src = `templates/${templateId}/template.html`;
      
      // Clear previous load listeners and bind direct update trigger
      previewIframe.onload = () => {
        sendUpdate();
        autoFit();
        // Sync project state to user drafts once fully loaded
        if (userLoggedIn) {
          autoSaveUserProject();
        }
      };
    }
  } catch (error) {
    console.error("Failed to load template configuration:", error);
    toast(`Error loading template configuration.`, 'e');
  }
}

// Filter the card stock color dropdown based on backend template settings
function filterCardStockDropdown(templateSettings) {
  const stockSelect = document.getElementById('card-stock-select');
  if (!stockSelect) return;

  const allowed = templateSettings.allowedCardStocks || [];
  const premium = templateSettings.premiumCardStocks || [];

  // If no allowed stocks configured, show all options (default behavior)
  if (allowed.length === 0) return;

  const allOptions = stockSelect.querySelectorAll('option');
  allOptions.forEach(opt => {
    const hex = opt.value.toLowerCase();
    if (!allowed.map(c => c.toLowerCase()).includes(hex)) {
      opt.style.display = 'none';
      opt.disabled = true;
    } else {
      opt.style.display = '';
      opt.disabled = false;
      // Mark premium stocks with a label
      if (premium.map(c => c.toLowerCase()).includes(hex)) {
        if (!opt.textContent.includes('(Premium')) {
          opt.textContent = opt.textContent + ' (Premium +₹3.00)';
        }
      }
    }
  });

  // If the currently selected option is hidden, select the first visible one
  if (stockSelect.selectedOptions[0] && stockSelect.selectedOptions[0].disabled) {
    const firstVisible = [...allOptions].find(o => !o.disabled);
    if (firstVisible) {
      stockSelect.value = firstVisible.value;
      handleCardStockChange(stockSelect);
    }
  }
}

// Initialize data state from config defaults
function initializeDataState() {
  currentData = {
    fields: {},
    events: {},
    styles: JSON.parse(JSON.stringify(DEFAULT_STYLE))
  };
  
  if (!config) return;
  
  if (config.fields) {
    config.fields.forEach(f => {
      // Set to null to indicate it is not customized yet (shows default in preview, placeholder in editor)
      currentData.fields[f.id] = null;
    });
  }
  
  if (config.events) {
    config.events.forEach(e => {
      currentData.events[e.id] = {
        name: null,
        date: null,
        time: '',
        venue: '',
        active: true
      };
    });
  }
}

// Accordion Expand/Collapse
function toggleAccordion(head) {
  const sc = head.closest('.sc');
  sc.classList.toggle('open');
}

// Auto-grow textarea to content height
function autoGrowTextarea(element) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = element.scrollHeight + 'px';
}

// Update empty-disabled state of the parent accordion card
function updateAccordionEmptyState(sc, fields) {
  const allEmpty = fields.every(field => {
    const val = currentData.fields[field.id];
    // A field is considered empty/hidden only if it is explicitly set to an empty string
    return val !== null && val !== undefined && val.trim() === '';
  });
  
  const title = sc.querySelector('.sc-title');
  if (allEmpty) {
    sc.classList.add('empty-disabled');
    if (title && !title.querySelector('.hidden-badge')) {
      const badge = document.createElement('span');
      badge.className = 'hidden-badge';
      badge.textContent = ' (Hidden)';
      badge.style.fontSize = '0.75rem';
      badge.style.color = 'var(--g400)';
      badge.style.fontWeight = '500';
      badge.style.marginLeft = '6px';
      title.appendChild(badge);
    }
  } else {
    sc.classList.remove('empty-disabled');
    const badge = title ? title.querySelector('.hidden-badge') : null;
    if (badge) badge.remove();
  }
}

// Generate Content Form accordion panels
function generateContentForm() {
  const container = document.getElementById('dynamic-content-fields');
  container.innerHTML = '';
  
  if (!config || !config.fields) return;
  
  // Group fields by category
  const categorized = {};
  FIELD_CATEGORIES.forEach(cat => categorized[cat] = []);
  
  config.fields.forEach(f => {
    const cat = f.category || "Invitation Details";
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(f);
  });
  
  // Render each category as a collapsible card (.sc)
  FIELD_CATEGORIES.forEach((categoryName, index) => {
    const fields = categorized[categoryName];
    if (fields.length === 0) return;
    
    const sc = document.createElement('div');
    sc.className = 'sc';
    if (index === 0 || index === 1 || index === 2) {
      sc.classList.add('open'); // Open Mantra, Bride, and Groom panels by default
    }
    
    const head = document.createElement('div');
    head.className = 'sc-head';
    head.setAttribute('onclick', 'toggleAccordion(this)');
    
    const left = document.createElement('div');
    left.className = 'sc-left';
    
    const title = document.createElement('span');
    title.className = 'sc-title';
    title.textContent = categoryName;
    
    left.appendChild(title);
    head.appendChild(left);
    
    const chev = document.createElement('i');
    chev.className = 'fa-solid fa-chevron-down sc-chev';
    head.appendChild(chev);
    sc.appendChild(head);
    
    const body = document.createElement('div');
    body.className = 'sc-body';
    
    const inner = document.createElement('div');
    inner.className = 'sc-inner';
    
    fields.forEach(field => {
      const group = document.createElement('div');
      group.className = 'form-group';
      
      const label = document.createElement('label');
      label.textContent = field.label;
      group.appendChild(label);
      
      const input = document.createElement('textarea');
      input.className = 'form-input form-textarea';
      input.value = (currentData.fields[field.id] === null || currentData.fields[field.id] === undefined) ? '' : currentData.fields[field.id];
      input.placeholder = field.default || '';
      input.addEventListener('input', (e) => {
        currentData.fields[field.id] = e.target.value;
        triggerSaving();
        sendUpdate();
        updateAccordionEmptyState(sc, fields);
        autoGrowTextarea(e.target);
      });
      input.addEventListener('keydown', handleTranslitKeydown);
      
      group.appendChild(input);
      inner.appendChild(group);
      
      // Auto-grow on render
      setTimeout(() => autoGrowTextarea(input), 0);
    });
    
    // Set initial empty state class
    updateAccordionEmptyState(sc, fields);
    
    body.appendChild(inner);
    sc.appendChild(body);
    container.appendChild(sc);
  });
}

// Generate Ceremonies / Events Form accordion panels
function generateCeremoniesForm() {
  const container = document.getElementById('dynamic-ceremonies-fields');
  container.innerHTML = '';
  
  if (!config || !config.events) return;
  
  config.events.forEach((e, index) => {
    const sc = document.createElement('div');
    sc.className = 'sc';
    sc.id = `event-card-${e.id}`;
    if (index === 0) sc.classList.add('open'); // Open first ceremony by default
    
    // Custom header for event cards
    const head = document.createElement('div');
    head.className = 'sc-head';
    head.setAttribute('onclick', 'toggleAccordion(this)');
    
    const left = document.createElement('div');
    left.className = 'sc-left';
    const title = document.createElement('span');
    title.className = 'sc-title';
    title.textContent = e.label || e.id;
    left.appendChild(title);
    head.appendChild(left);
    
    const chev = document.createElement('i');
    chev.className = 'fa-solid fa-chevron-down sc-chev';
    head.appendChild(chev);
    sc.appendChild(head);
    
    const body = document.createElement('div');
    body.className = 'sc-body';
    
    const inner = document.createElement('div');
    inner.className = 'sc-inner';
    
    // 1. Name input
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = "Ceremony Title";
    nameGroup.appendChild(nameLabel);
    
    const nameInput = document.createElement('textarea');
    nameInput.className = 'form-input form-textarea';
    nameInput.value = (currentData.events[e.id].name === null || currentData.events[e.id].name === undefined) ? '' : currentData.events[e.id].name;
    nameInput.placeholder = e.defaultName || '';
    nameInput.addEventListener('input', (evt) => {
      currentData.events[e.id].name = evt.target.value;
      triggerSaving();
      sendUpdate();
      autoGrowTextarea(evt.target);
    });
    nameInput.addEventListener('keydown', handleTranslitKeydown);
    nameGroup.appendChild(nameInput);
    inner.appendChild(nameGroup);
    setTimeout(() => autoGrowTextarea(nameInput), 0);
    
    // 2. Date input
    if (e.defaultDate !== undefined) {
      const dateGroup = document.createElement('div');
      dateGroup.className = 'form-group';
      const dateLabel = document.createElement('label');
      dateLabel.textContent = "Date";
      dateGroup.appendChild(dateLabel);
      
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.className = 'form-input';
      dateInput.value = (currentData.events[e.id].date === null || currentData.events[e.id].date === undefined) ? '' : currentData.events[e.id].date;
      dateInput.addEventListener('change', (evt) => {
        currentData.events[e.id].date = evt.target.value;
        triggerSaving();
        sendUpdate();
      });
      dateGroup.appendChild(dateInput);
      inner.appendChild(dateGroup);
    }
    
    // 3. Time input
    if (e.defaultTime !== undefined) {
      const timeGroup = document.createElement('div');
      timeGroup.className = 'form-group';
      const timeLabel = document.createElement('label');
      timeLabel.textContent = "Time";
      timeGroup.appendChild(timeLabel);
      
      const timeInput = document.createElement('input');
      timeInput.type = 'time';
      timeInput.className = 'form-input';
      timeInput.value = currentData.events[e.id].time;
      timeInput.addEventListener('change', (evt) => {
        currentData.events[e.id].time = evt.target.value;
        triggerSaving();
        sendUpdate();
      });
      timeGroup.appendChild(timeInput);
      inner.appendChild(timeGroup);
    }
    
    // 4. Venue input
    if (e.defaultVenue !== undefined) {
      const venueGroup = document.createElement('div');
      venueGroup.className = 'form-group';
      const venueLabel = document.createElement('label');
      venueLabel.textContent = "Venue Details";
      venueGroup.appendChild(venueLabel);
      
      const venueInput = document.createElement('textarea');
      venueInput.className = 'form-input form-textarea';
      venueInput.value = currentData.events[e.id].venue || '';
      venueInput.addEventListener('input', (evt) => {
        currentData.events[e.id].venue = evt.target.value;
        triggerSaving();
        sendUpdate();
        autoGrowTextarea(evt.target);
      });
      venueInput.addEventListener('keydown', handleTranslitKeydown);
      venueGroup.appendChild(venueInput);
      inner.appendChild(venueGroup);
      setTimeout(() => autoGrowTextarea(venueInput), 0);
    }
    
    body.appendChild(inner);
    sc.appendChild(body);
    
    // Set initial active status
    currentData.events[e.id].active = true;
    
    container.appendChild(sc);
  });
}

// ── CUSTOMIZER PORT FROM BUILDER1 ──



function ensureCardStyle() {
  if (!currentData.styles) currentData.styles = {};
  currentData.styles = Object.assign({}, DEFAULT_STYLE, currentData.styles);
  return currentData.styles;
}

function setField(path, val) {
  const keys = path.split('.');
  let obj = currentData;
  if (keys[0] === 'styles') ensureCardStyle();
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof obj[keys[i]] !== 'object' || obj[keys[i]] === null) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = val;
  triggerSaving();
  sendUpdate();
}



function iconOffsetKeys(key) {
  return { x: key + 'OffsetX', y: key + 'OffsetY' };
}

function offsetValueKeys(key) {
  return { x: key + 'OffsetX', y: key + 'OffsetY' };
}

function fmtCmOffset(val) {
  const n = Number(val || 0);
  return (Math.round(n * 100) / 100).toFixed(2) + 'cm';
}

function renderIconNudgeControls() {
  const host = $('icon-nudge-controls');
  if (!host) return;
  host.innerHTML = `
    <div class="customizer-card">
      <div class="customizer-card-title">Icon Position Nudges</div>
      <div class="customizer-group-desc" style="margin-bottom:12px;">Use small buttons to move icons slightly up, down, left, or right without affecting content blocks.</div>
      <div class="nudge-grid">
        ${ICON_NUDGE_CONFIG.map(icon => `
          <div class="nudge-card">
            <div class="nudge-card-title">${icon.title}</div>
            <div class="nudge-pad">
              <span></span>
              <button class="nudge-btn" type="button" onclick="adjustIconOffset('${icon.key}', 0, -0.05)" title="Move up">▲</button>
              <span></span>
              <button class="nudge-btn" type="button" onclick="adjustIconOffset('${icon.key}', -0.05, 0)" title="Move left">◀</button>
              <button class="nudge-btn center" type="button" onclick="resetIconOffset('${icon.key}')" title="Reset">0</button>
              <button class="nudge-btn" type="button" onclick="adjustIconOffset('${icon.key}', 0.05, 0)" title="Move right">▶</button>
              <span></span>
              <button class="nudge-btn" type="button" onclick="adjustIconOffset('${icon.key}', 0, 0.05)" title="Move down">▼</button>
              <span></span>
            </div>
            <div class="nudge-meta">
              <span>X <code id="nudge-${icon.key}-x">0.00cm</code></span>
              <span>Y <code id="nudge-${icon.key}-y">0.00cm</code></span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderIconColorControls() {
  const host = $('icon-color-controls');
  if (!host) return;
  host.innerHTML = `
    <div class="customizer-card">
      <div class="icon-color-header">
        <div>
          <div class="customizer-card-title">Icon Colors</div>
          <div class="customizer-group-desc" style="margin-bottom:0;">Set each icon slot tint independently. Leave a picker unset to keep the default art appearance.</div>
        </div>
        <button type="button" class="reset-icon-colors-btn" onclick="resetAllIconColors()">Reset all</button>
      </div>
      <div class="icon-color-grid">
        ${ICON_COLOR_CONFIG.map(icon => `
          <div class="icon-color-card">
            <div class="icon-color-title">${icon.title}</div>
            <div class="icon-color-meta">
              <span class="color-value-text" id="val-iconColor-${icon.key}">default</span>
              <div class="color-input-preview" data-icon-preview="${icon.key}" aria-label="${icon.title} color picker">
                <input type="color" data-icon-key="${icon.key}" title="Select color for ${icon.title}" aria-label="Select color for ${icon.title}" oninput="handleIconColorPickerInput(this)">
              </div>
            </div>
            <div class="icon-color-helper">Use the swatch to choose a stronger, higher-contrast icon tint.</div>
            <button type="button" class="reset-icon-colors-btn" onclick="resetIconColor('${icon.key}')">Reset</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderCornerNudgeControls() {
  const host = $('corner-nudge-controls');
  if (!host) return;
  host.innerHTML = `
    <div class="customizer-card">
      <div class="customizer-card-title">Corner Flower Nudges</div>
      <div class="customizer-group-desc" style="margin-bottom:12px;">Move each corner flower a little without changing the card frame.</div>
      <div class="nudge-grid">
        ${CORNER_NUDGE_CONFIG.map(corner => `
          <div class="nudge-card">
            <div class="nudge-card-title">${corner.title}</div>
            <div class="nudge-pad">
              <span></span>
              <button class="nudge-btn" type="button" onclick="adjustCornerOffset('${corner.key}', 0, -0.05)" title="Move up">▲</button>
              <span></span>
              <button class="nudge-btn" type="button" onclick="adjustCornerOffset('${corner.key}', -0.05, 0)" title="Move left">◀</button>
              <button class="nudge-btn center" type="button" onclick="resetCornerOffset('${corner.key}')" title="Reset">0</button>
              <button class="nudge-btn" type="button" onclick="adjustCornerOffset('${corner.key}', 0.05, 0)" title="Move right">▶</button>
              <span></span>
              <button class="nudge-btn" type="button" onclick="adjustCornerOffset('${corner.key}', 0, 0.05)" title="Move down">▼</button>
              <span></span>
            </div>
            <div class="nudge-meta">
              <span>X <code id="nudge-${corner.key}-x">0.00cm</code></span>
              <span>Y <code id="nudge-${corner.key}-y">0.00cm</code></span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderColorPresets() {
  const container = $('color-presets-grid');
  if (!container) return;
  container.innerHTML = PRESETS.map((p, index) => `
    <div class="preset-card" 
         data-body-bg="${p.bodyBg}" 
         data-accent-color="${p.accent}" 
         data-text-color="${p.text}" 
         data-heading-color="${p.heading}"
         onclick="applyColorPreset(${index}, this)">
      <div class="preset-name">${p.name}</div>
      <div class="preset-dots">
        <div class="preset-dot" style="background: ${p.bodyBg};"></div>
        <div class="preset-dot" style="background: ${p.accent};"></div>
        <div class="preset-dot" style="background: ${p.text};"></div>
        <div class="preset-dot" style="background: ${p.heading};"></div>
      </div>
    </div>
  `).join('');
  updatePresetCardsActiveState();
}

function renderIconCategoryChips() {
  const host = $('icon-category-chips');
  if (!host) return;

  const categories = ICON_CATEGORIES.length ? ICON_CATEGORIES : ICON_LIBRARY.map(icon => ({
    id: icon.category,
    label: icon.category.charAt(0).toUpperCase() + icon.category.slice(1)
  }));
  host.innerHTML = [
    `<button type="button" class="icon-category-chip ${ICON_LIBRARY_FILTER.category === 'all' ? 'active' : ''}" onclick="setIconLibraryCategory('all')">All</button>`,
    ...Array.from(new Map(categories.map(cat => [cat.id, cat])).values()).map(cat => `
      <button type="button" class="icon-category-chip ${ICON_LIBRARY_FILTER.category === cat.id ? 'active' : ''}" onclick="setIconLibraryCategory('${cat.id}')">${cat.label}</button>
    `)
  ].join('');
}

function matchesIconSearch(icon, query) {
  if (!query) return true;
  const haystack = [
    icon.id,
    icon.name,
    icon.category,
    icon.subcategory,
    ...(Array.isArray(icon.keywords) ? icon.keywords : [])
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function renderIconLibrary() {
  const grid = $('icon-library-grid');
  const meta = $('icon-library-meta');
  if (!grid || !meta) return;

  const query = ICON_LIBRARY_FILTER.query.trim().toLowerCase();
  const filtered = ICON_LIBRARY.filter(icon => {
    const categoryOk = ICON_LIBRARY_FILTER.category === 'all' || icon.category === ICON_LIBRARY_FILTER.category;
    return categoryOk && matchesIconSearch(icon, query);
  });

  meta.textContent = `${filtered.length} icon${filtered.length === 1 ? '' : 's'} shown`;
  const activeTarget = getIconReplaceTarget();
  const replacements = (currentData.styles && currentData.styles.iconReplacements) || {};
  const activeReplacement = replacements[activeTarget];
  const activeReplacementId = activeReplacement && typeof activeReplacement === 'object' ? activeReplacement.id : null;
  const activeReplacementFile = typeof activeReplacement === 'string'
    ? activeReplacement
    : activeReplacement && activeReplacement.file
      ? activeReplacement.file
      : null;
  grid.innerHTML = filtered.length ? filtered.map(icon => `
    <button
      type="button"
      class="icon-library-item"
      data-icon-id="${esc(icon.id)}"
      data-icon-file="${esc(icon.file)}"
      onclick="useLibraryIcon('${esc(icon.id)}')"
      title="${esc(icon.name)}"
    >
      <div class="icon-library-preview">
        <img src="${esc(icon.file)}" alt="${esc(icon.name)}">
      </div>
      <div class="icon-library-name">${esc(icon.name)}</div>
      <div class="icon-library-tag">${esc(icon.category)} / ${esc(icon.subcategory)}</div>
    </button>
  `).join('') : '<div class="icon-library-empty">No icons match this search.</div>';

  if (activeReplacementId || activeReplacementFile) {
    const activeItem = activeReplacementId
      ? grid.querySelector(`[data-icon-id="${activeReplacementId.replace(/"/g, '\\"')}"]`)
      : grid.querySelector(`[data-icon-file="${activeReplacementFile.replace(/"/g, '\\"')}"]`);
    if (activeItem) activeItem.classList.add('active');
  }
}

function applyIconAccordionState() {
  Object.keys(ICON_ACCORDION_STATE).forEach(key => {
    const box = $('icon-box-' + key);
    if (box) {
      if (ICON_ACCORDION_STATE[key]) {
        box.classList.add('open');
      } else {
        box.classList.remove('open');
      }
    }
  });
}

function saveIconAccordionState() {
  try {
    localStorage.setItem('mic_icon_accordion_state', JSON.stringify(ICON_ACCORDION_STATE));
  } catch (e) {}
}

function getIconReplaceTarget() {
  try {
    const saved = localStorage.getItem('mic_icon_replace_target');
    if (saved) ICON_REPLACE_TARGET = saved === 'couple1' ? 'couple2' : saved;
  } catch (e) {}
  if (!ICON_REPLACE_TARGETS.some(item => item.key === ICON_REPLACE_TARGET)) {
    ICON_REPLACE_TARGET = 'ganesh';
  }
  return ICON_REPLACE_TARGET || 'ganesh';
}

function getIconReplacementLabel(targetKey) {
  const item = ICON_REPLACE_TARGETS.find(t => t.key === targetKey);
  return item ? item.label : targetKey;
}

function getActiveIconReplacement(targetKey) {
  const style = ensureCardStyle();
  const replacements = style.iconReplacements || {};
  return replacements[targetKey] || null;
}

function getIconReplacementSummary(targetKey) {
  const value = getActiveIconReplacement(targetKey);
  if (!value) return 'No custom icon set for this slot.';
  if (typeof value === 'string') return 'Custom icon applied for this slot.';
  return value.name ? 'Selected: ' + value.name : 'Custom icon applied for this slot.';
}

function refreshIconReplacementStatus() {
  const target = getIconReplaceTarget();
  const select = $('icon-replace-target-select');
  if (select && select.value !== target) select.value = target;
  const host = $('icon-replace-current');
  if (host) host.textContent = getIconReplacementLabel(target) + ': ' + getIconReplacementSummary(target);
}

window.toggleIconAccordion = function(key) {
  ICON_ACCORDION_STATE[key] = !ICON_ACCORDION_STATE[key];
  applyIconAccordionState();
  saveIconAccordionState();
};

async function loadIconLibrary() {
  const meta = $('icon-library-meta');
  try {
    const [iconsRes, categoriesRes] = await Promise.all([
      fetch('../assets/metadata/icons.json'),
      fetch('../assets/metadata/categories.json')
    ]);
    if (!iconsRes.ok) throw new Error('Failed to load icon metadata');
    const data = await iconsRes.json();
    if (categoriesRes.ok) {
      const categoriesData = await categoriesRes.json();
      ICON_CATEGORIES = Array.isArray(categoriesData.iconCategories) ? categoriesData.iconCategories : [];
    }
    ICON_LIBRARY = Array.isArray(data.icons) ? data.icons : [];
    if (!ICON_LIBRARY.length) {
      ICON_LIBRARY = STATIC_ICON_LIBRARY.slice();
      ICON_CATEGORIES = [
        { id: 'core', label: 'Core' },
        { id: 'borders', label: 'Borders' },
        { id: 'decorative', label: 'Decorative' },
        { id: 'wedding', label: 'Wedding' }
      ];
    }
    renderIconCategoryChips();
    renderIconLibrary();
    refreshIconReplacementStatus();
    applyIconAccordionState();
    if (meta) meta.textContent = `${ICON_LIBRARY.length} icons available`;
  } catch (err) {
    ICON_LIBRARY = STATIC_ICON_LIBRARY.slice();
    ICON_CATEGORIES = [
      { id: 'core', label: 'Core' },
      { id: 'borders', label: 'Borders' },
      { id: 'decorative', label: 'Decorative' },
      { id: 'wedding', label: 'Wedding' }
    ];
    renderIconCategoryChips();
    renderIconLibrary();
    refreshIconReplacementStatus();
    applyIconAccordionState();
    if (meta) meta.textContent = `${ICON_LIBRARY.length} icons available`;
  }
}

window.handleIconLibrarySearch = function(el) {
  ICON_LIBRARY_FILTER.query = el.value || '';
  renderIconLibrary();
};

window.setIconLibraryCategory = function(category) {
  ICON_LIBRARY_FILTER.category = category;
  renderIconCategoryChips();
  renderIconLibrary();
};

window.setIconReplaceTarget = function(targetKey) {
  ICON_REPLACE_TARGET = targetKey || 'ganesh';
  try {
    localStorage.setItem('mic_icon_replace_target', ICON_REPLACE_TARGET);
  } catch (e) {}
  refreshIconReplacementStatus();
  renderIconLibrary();
};

window.clearIconReplacement = function() {
  const target = getIconReplaceTarget();
  const style = ensureCardStyle();
  const next = Object.assign({}, style.iconReplacements || {});
  delete next[target];
  setField('styles.iconReplacements', next);
  refreshIconReplacementStatus();
  renderIconLibrary();
  toast(`Removed icon from ${getIconReplacementLabel(target)}`, 's');
};

window.useLibraryIcon = function(iconId) {
  const icon = ICON_LIBRARY.find(item => item.id === iconId);
  if (!icon) return;
  try {
    localStorage.setItem('mic_selected_icon', JSON.stringify(icon));
  } catch (e) {}
  const target = getIconReplaceTarget();
  const style = ensureCardStyle();
  const next = Object.assign({}, style.iconReplacements || {});
  next[target] = icon;
  setField('styles.iconReplacements', next);
  try {
    localStorage.setItem('mic_selected_icon_id', icon.id);
  } catch (e) {}
  refreshIconReplacementStatus();
  renderIconLibrary();
  toast(`Replaced ${getIconReplacementLabel(target)} with ${icon.name}`, 's');
};

window.applyColorPreset = function(presetIndex, element) {
  const preset = PRESETS[presetIndex];
  if (!preset) return;

  setField('styles.bodyBg', preset.bodyBg);
  setField('styles.accentColor', preset.accent);
  setField('styles.borderColor', preset.accent);
  setField('styles.textColor', preset.text);
  setField('styles.headingColor', preset.heading);
  if (preset.iconReplacements) {
    setField('styles.iconReplacements', preset.iconReplacements);
  }

  // Sync visual inputs
  syncCustomizerInputs();
  
  if (element) {
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
  }
  
  toast('Applied color palette theme!', 's');
};

window.handleBorderPresetChange = function(el) {
  setField('styles.borderPreset', el.value);
};

window.handleColorPickerInput = function(el) {
  const key = el.dataset.styleKey;
  const val = el.value;
  setField('styles.' + key, val);
  
  // Sync the labels
  const label = $('val-' + key);
  if (label) label.textContent = val;
  updatePresetCardsActiveState();
};

window.handleCardStockChange = function(el) {
  setField('styles.cardBg', el.value);
  setField('styles.bodyBg', el.value);
};

window.handleSliderInput = function(el) {
  const key = el.dataset.styleKey;
  const val = parseInt(el.value, 10);
  setField('styles.' + key, val);
  
  // Sync label
  const label = $('val-' + key);
  if (label) {
    if (key === 'curveLevel') {
      const labels = ['None', 'Low', 'Medium', 'High', 'Max'];
      label.textContent = labels[val] || val;
    } else {
      label.textContent = val + '%';
    }
  }
};

window.handleSpacingInput = function(el) {
  const key = el.dataset.styleKey;
  const val = parseFloat((parseInt(el.value, 10) / 100).toFixed(1));
  setField('styles.' + key, val);
  
  // Sync label
  const label = $('val-' + key);
  if (label) label.textContent = val.toFixed(1) + 'cm';
};

window.handleCheckboxChange = function(el) {
  const key = el.dataset.styleKey;
  const val = el.checked;
  setField('styles.' + key, val);
};

window.handleIconColorPickerInput = function(el) {
  const key = el.dataset.iconKey;
  if (!key) return;
  const color = el.value;
  const style = ensureCardStyle();
  const next = Object.assign({}, style.iconColors || {});
  next[key] = color;
  setField('styles.iconColors', next);
  const label = $('val-iconColor-' + key);
  if (label) label.textContent = color;
  const preview = el.closest('.color-input-preview');
  if (preview) {
    preview.style.backgroundColor = color;
    preview.classList.add('active');
  }
};

window.resetIconColor = function(iconKey) {
  const style = ensureCardStyle();
  const next = Object.assign({}, style.iconColors || {});
  delete next[iconKey];
  setField('styles.iconColors', next);
  const input = document.querySelector(`input[data-icon-key="${iconKey}"]`);
  if (input) {
    input.value = style.accentColor || '#8b0040';
    const preview = input.closest('.color-input-preview');
    if (preview) {
      preview.style.backgroundColor = 'transparent';
      preview.classList.remove('active');
    }
  }
  const label = $('val-iconColor-' + iconKey);
  if (label) label.textContent = 'default';
};

window.resetAllIconColors = function() {
  const style = ensureCardStyle();
  setField('styles.iconColors', {});
  syncCustomizerInputs();
  document.querySelectorAll('.color-input-preview').forEach(preview => {
    preview.style.backgroundColor = 'transparent';
    preview.classList.remove('active');
  });
  toast('Reset all icon color overrides', 's');
};

window.handleFontFamilyChange = function(el) {
  setField('styles.fontFamily', el.value);
  el.style.fontFamily = el.value;
};

window.handleCornerSymbolChange = function(el) {
  setField('styles.cornerSymbol', el.value);
};

window.adjustIconOffset = function(iconKey, dx, dy) {
  const st = ensureCardStyle();
  const keys = iconOffsetKeys(iconKey);
  const nextX = Math.max(-2, Math.min(2, Number(st[keys.x] || 0) + dx));
  const nextY = Math.max(-2, Math.min(2, Number(st[keys.y] || 0) + dy));
  setField('styles.' + keys.x, Math.round(nextX * 100) / 100);
  setField('styles.' + keys.y, Math.round(nextY * 100) / 100);
  syncCustomizerInputs();
};

window.resetIconOffset = function(iconKey) {
  const keys = iconOffsetKeys(iconKey);
  setField('styles.' + keys.x, 0);
  setField('styles.' + keys.y, 0);
  syncCustomizerInputs();
};

window.adjustCornerOffset = function(cornerKey, dx, dy) {
  const st = ensureCardStyle();
  const keys = offsetValueKeys(cornerKey);
  const nextX = Math.max(-1, Math.min(1, Number(st[keys.x] || 0) + dx));
  const nextY = Math.max(-1, Math.min(1, Number(st[keys.y] || 0) + dy));
  setField('styles.' + keys.x, Math.round(nextX * 100) / 100);
  setField('styles.' + keys.y, Math.round(nextY * 100) / 100);
  syncCustomizerInputs();
};

window.resetCornerOffset = function(cornerKey) {
  const keys = offsetValueKeys(cornerKey);
  setField('styles.' + keys.x, 0);
  setField('styles.' + keys.y, 0);
  syncCustomizerInputs();
};

function updatePresetCardsActiveState() {
  const st = currentData.styles;
  if (!st) return;
  document.querySelectorAll('.preset-card').forEach(card => {
    const matches = card.dataset.bodyBg === st.bodyBg &&
                    card.dataset.accentColor === st.accentColor &&
                    card.dataset.textColor === st.textColor &&
                    card.dataset.headingColor === st.headingColor;
    if (matches) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function syncCustomizerInputs() {
  const st = ensureCardStyle();

  // Sync color inputs and labels
  const colors = ['cardBg', 'bodyBg', 'accentColor', 'borderColor', 'textColor', 'headingColor'];
  colors.forEach(key => {
    const val = st[key];
    const previewInput = document.querySelector(`.color-input-preview input[data-style-key="${key}"]`);
    if (previewInput) previewInput.value = val;
    const valLabel = $('val-' + key);
    if (valLabel) valLabel.textContent = val;
  });

  // Sync sliders
  const sliders = ['shlokaSize', 'headingSize', 'namesSize', 'eventSize', 'footerSize', 'ganeshSize', 'omSize', 'chainsSize', 'coupleSize', 'cornerSize', 'curveLevel'];
  sliders.forEach(key => {
    const val = st[key] !== undefined ? st[key] : 100;
    const slider = document.querySelector(`.range-slider[data-style-key="${key}"]`);
    if (slider) slider.value = val;
    const valLabel = $('val-' + key);
    if (valLabel) {
      if (key === 'curveLevel') {
        const labels = ['None', 'Low', 'Medium', 'High', 'Max'];
        valLabel.textContent = labels[val] || val;
      } else {
        valLabel.textContent = val + '%';
      }
    }
  });

  // Sync checkboxes
  const checkboxes = ['showGanesh', 'showOm', 'showChains', 'showCouple', 'showCorners', 'showBorder'];
  checkboxes.forEach(key => {
    const val = st[key] !== false;
    const chk = $('chk-' + key);
    if (chk) chk.checked = val;
  });

  const borderPresetSelect = $('border-preset-select');
  if (borderPresetSelect && st.borderPreset) borderPresetSelect.value = st.borderPreset;

  const targetSelect = $('icon-replace-target-select');
  if (targetSelect) targetSelect.value = getIconReplaceTarget();
  refreshIconReplacementStatus();

  const iconColorKeys = ICON_COLOR_CONFIG.map(item => item.key);
  iconColorKeys.forEach(key => {
    const input = document.querySelector(`input[data-icon-key="${key}"]`);
    const preview = document.querySelector(`.color-input-preview[data-icon-preview="${key}"]`);
    const color = st.iconColors && st.iconColors[key];
    if (input) input.value = color || (st.accentColor || '#8b0040');
    if (preview) {
      preview.style.backgroundColor = color || 'transparent';
      preview.classList.toggle('active', Boolean(color));
    }
    const label = $('val-iconColor-' + key);
    if (label) label.textContent = color || 'default';
  });

  // Sync selectors
  const ffSelect = $('font-family-select');
  if (ffSelect && st.fontFamily) {
    ffSelect.value = st.fontFamily;
    ffSelect.style.fontFamily = st.fontFamily;
  }

  const stockSelect = $('card-stock-select');
  if (stockSelect && st.cardBg) stockSelect.value = st.cardBg;

  const csSelect = $('corner-symbol-select');
  if (csSelect && st.cornerSymbol) csSelect.value = st.cornerSymbol;

  // Sync icon nudges
  ICON_NUDGE_CONFIG.forEach(icon => {
    const keys = iconOffsetKeys(icon.key);
    const x = Number(st[keys.x] || 0);
    const y = Number(st[keys.y] || 0);
    const xLabel = $('nudge-' + icon.key + '-x');
    const yLabel = $('nudge-' + icon.key + '-y');
    if (xLabel) xLabel.textContent = fmtCmOffset(x);
    if (yLabel) yLabel.textContent = fmtCmOffset(y);
  });

  CORNER_NUDGE_CONFIG.forEach(corner => {
    const keys = offsetValueKeys(corner.key);
    const x = Number(st[keys.x] || 0);
    const y = Number(st[keys.y] || 0);
    const xLabel = $('nudge-' + corner.key + '-x');
    const yLabel = $('nudge-' + corner.key + '-y');
    if (xLabel) xLabel.textContent = fmtCmOffset(x);
    if (yLabel) yLabel.textContent = fmtCmOffset(y);
  });

  // Sync spacing sliders
  const cardPaddingSlider = document.querySelector(`.range-slider[data-style-key="cardPadding"]`);
  if (cardPaddingSlider) {
    const val = st.cardPadding !== undefined ? st.cardPadding : 1.0;
    cardPaddingSlider.value = val * 100;
    $('val-cardPadding').textContent = val.toFixed(1) + 'cm';
  }

  const sectionGapSlider = document.querySelector(`.range-slider[data-style-key="sectionGap"]`);
  if (sectionGapSlider) {
    const val = st.sectionGap !== undefined ? st.sectionGap : 0.3;
    sectionGapSlider.value = val * 100;
    $('val-sectionGap').textContent = val.toFixed(1) + 'cm';
  }

  // Update preset cards active state
  updatePresetCardsActiveState();
}

function generateStylesForm() {
  syncCustomizerInputs();
}

// ── NAV TABS SWITCHER (TOPBAR LEVEL) ──
function switchBuilderTab(tabId) {
  // Reset navbar active tab classes
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set active class on active button
  document.getElementById(`tab-${tabId}`).classList.add('active');
  
  // Toggle sidebar main panel views
  document.querySelectorAll('.sidebar-view-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  document.getElementById(`${tabId}-view`).style.display = 'flex';
}

// ── NAV SUB-TABS SWITCHER (CONTENT SIDEBAR LEVEL) ──
function switchContentSubTab(subTabId) {
  // Reset sub-tab buttons active state
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(`sub-tab-${subTabId}`).classList.add('active');
  
  // Toggle sub-tab panels inside Content tab
  document.querySelectorAll('.sub-tab-pane').forEach(pane => {
    pane.style.display = 'none';
  });
  
  if (subTabId === 'text') {
    document.getElementById('dynamic-content-fields').style.display = 'flex';
  } else {
    document.getElementById('dynamic-ceremonies-fields').style.display = 'flex';
  }
}

// ── CUSTOMIZER SUB-SIDEBAR SWITCHER (CUSTOMIZE SIDEBAR LEVEL) ──
function switchCustomizerSection(sectionId) {
  // Reset customizer sub-sidebar nav buttons
  document.querySelectorAll('.customizer-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(`c-nav-${sectionId}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Toggle customization panels
  document.querySelectorAll('.customizer-section-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  
  const activePanel = document.getElementById(`c-sec-${sectionId}`);
  if (activePanel) activePanel.style.display = 'block';
}

// Send updates directly to preview frame
function sendUpdate() {
  const iframe = document.getElementById('card1-iframe');
  if (iframe && iframe.contentWindow) {
    const resolvedData = {
      fields: {},
      events: {},
      styles: currentData.styles
    };
    
    if (config) {
      if (config.fields) {
        config.fields.forEach(f => {
          const val = currentData.fields[f.id];
          resolvedData.fields[f.id] = (val === null || val === undefined) ? (f.default || '') : val;
        });
      }
      if (config.events) {
        config.events.forEach(e => {
          const currentEv = currentData.events[e.id] || {};
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
    }
    
    iframe.contentWindow.postMessage({
      type: 'UPDATE_TEMPLATE_DATA',
      data: resolvedData
    }, '*');
  }
}

// Reset values to defaults
function resetToDefaults() {
  if (!confirm("Are you sure you want to restore defaults? All edits will be discarded.")) return;
  
  initializeDataState();
  
  // Re-render
  generateContentForm();
  generateCeremoniesForm();
  generateStylesForm();
  
  // Trigger UI effects
  triggerSaving();
  sendUpdate();
  toast('Template defaults restored!', 's');
}

// Export custom configuration state as a JSON file
function exportData() {
  const jsonString = JSON.stringify(currentData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const docName = document.getElementById('doc-title-input').value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  link.download = `${activeTemplateId}_${docName}_backup.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast('Draft backed up successfully!', 's');
}

// ── TOAST NOTIFICATIONS ──
function toast(msg, type = 's') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  
  const t = document.createElement('div');
  t.className = `toast t-${type}`;
  
  const icon = document.createElement('span');
  icon.className = 't-ico';
  icon.innerHTML = type === 's' ? '✓' : type === 'e' ? '✗' : type === 'i' ? 'i' : '!';
  
  const txt = document.createElement('span');
  txt.textContent = msg;
  
  t.appendChild(icon);
  t.appendChild(txt);
  wrap.appendChild(t);
  
  // Add animation class
  setTimeout(() => t.classList.add('show'), 10);
  
  // Clean up
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, 3000);
}

// ── BLINKING SAVE STATUS EFFECT ──
let saveTimeout = null;
function autoSaveUserProject() {
  if (!userLoggedIn || !currentUser || !currentUser.uid) return;
  if (!config) return; // Prevent saving if config isn't loaded yet
  
  const docTitle = document.getElementById('doc-title-input')?.value.trim() || 'Untitled Invitation';
  
  const projectKey = `mic_user_projects_${currentUser.uid}`;
  let userProjects = [];
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) userProjects = JSON.parse(raw);
  } catch (e) {
    console.error("Error reading saved projects:", e);
  }
  
  if (!activeProjectId) {
    const sameTemplateProject = userProjects.find(p => p.templateId === activeTemplateId);
    if (sameTemplateProject) {
      activeProjectId = sameTemplateProject.id;
    } else {
      activeProjectId = 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?templateId=' + activeTemplateId + '&projectId=' + activeProjectId;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }
  
  const existingIndex = userProjects.findIndex(p => p.id === activeProjectId);
  const projectData = {
    id: activeProjectId,
    templateId: activeTemplateId,
    documentTitle: docTitle,
    lastSaved: new Date().toISOString(),
    thumbnail: `templates/${activeTemplateId}/thumbnail.jpg`,
    data: JSON.parse(JSON.stringify(currentData))
  };
  
  if (existingIndex > -1) {
    userProjects[existingIndex] = projectData;
  } else {
    userProjects.push(projectData);
  }
  
  localStorage.setItem(projectKey, JSON.stringify(userProjects));
}

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
    
    // Auto save to user's drafts list
    autoSaveUserProject();
  }, 1000);
}

// ── DOWNLOAD MENU TOGGLE ──
function toggleDownloadMenu(e) {
  e.stopPropagation();
  const wrap = document.getElementById('dl-wrap');
  wrap.classList.toggle('open');
}

// ── PRINT ACTION (DIRECT IFRAME STREAM) ──
function printCard() {
  const iframe = document.getElementById('card1-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }
}

// ── REDIRECT TO PROFESSIONAL PRINT CUSTOMIZATION ──
function goToPrintPage() {
  const docName = document.getElementById('doc-title-input')?.value.trim() || 'wedding-card';
  const projectData = {
    format: 'VLS',
    version: '1.0',
    templateId: activeTemplateId || 'card1',
    documentTitle: docName,
    data: JSON.parse(JSON.stringify(currentData))
  };
  localStorage.setItem("mic_print_project_data", JSON.stringify(projectData));
  localStorage.setItem("savedVlsData", JSON.stringify(projectData));
  window.location.href = `print.html?templateId=${activeTemplateId || 'card1'}`;
}

// ── DOWNLOAD PROGRESS OVERLAY ──
function showDownloadProgress(title, subtitle) {
  const overlay = document.getElementById('dl-progress-overlay');
  document.getElementById('dl-progress-title').textContent = title || 'Generating...';
  document.getElementById('dl-progress-subtitle').textContent = subtitle || 'Please wait while we capture your card';
  overlay.classList.add('active');
}

function hideDownloadProgress() {
  const overlay = document.getElementById('dl-progress-overlay');
  overlay.classList.remove('active');
}

// ── CAPTURE CARD FROM IFRAME AS CANVAS ──
async function captureCardCanvas() {
  const iframe = document.getElementById('card1-iframe');
  if (!iframe || !iframe.contentDocument) {
    throw new Error('Preview iframe not available');
  }

  const cardEl = iframe.contentDocument.querySelector('.card');
  if (!cardEl) {
    throw new Error('Card element not found in preview');
  }

  // Use html2canvas to capture the card at 2x resolution for high quality
  const canvas = await html2canvas(cardEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    width: cardEl.scrollWidth,
    height: cardEl.scrollHeight
  });

  return canvas;
}

// ── DOWNLOAD TRIGGER (REAL IMAGE/PDF CAPTURE) ──
function handleDownload(format) {
  document.getElementById('dl-wrap').classList.remove('open');
  
  // Access control check for export formats
  if (!userLoggedIn) {
    showLoginPopup();
    toast('Please log in to download your card.', 'e');
    return;
  }
  
  const docName = document.getElementById('doc-title-input').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'invitation_card';
  
  showDownloadProgress(
    `Generating ${format.toUpperCase()}...`,
    'Capturing your card at high resolution'
  );
  
  // Small delay to let the overlay render
  setTimeout(async () => {
    try {
      const canvas = await captureCardCanvas();
      
      if (format === 'pdf') {
        // Card dimensions: 23.5cm × 19cm
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'cm',
          format: [19, 23.5]
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 23.5, 19);
        pdf.save(`${docName}.pdf`);
        
        toast('PDF downloaded successfully!', 's');
      } else if (format === 'png') {
        const dataUrl = canvas.toDataURL('image/png');
        triggerBlobDownload(dataUrl, `${docName}.png`);
        toast('PNG downloaded successfully!', 's');
      } else if (format === 'jpg') {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        triggerBlobDownload(dataUrl, `${docName}.jpg`);
        toast('JPG downloaded successfully!', 's');
      }
    } catch (err) {
      console.error('Download capture error:', err);
      toast('Download failed. Please try again.', 'e');
    } finally {
      hideDownloadProgress();
    }
  }, 300);
}

// Helper: trigger download from a dataURL
function triggerBlobDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── VLS FILE FORMAT (Save / Load Project) ──

// Save current editing state as a .vls file (free for all users)
function handleDownloadVLS() {
  document.getElementById('dl-wrap').classList.remove('open');
  
  const docTitle = document.getElementById('doc-title-input').value.trim() || 'Wedding Card';
  const docName = docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'invitation_card';
  
  const vlsData = {
    format: 'VLS',
    version: '1.0',
    generator: 'MyInvitationCard',
    templateId: activeTemplateId,
    documentTitle: docTitle,
    createdAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(currentData))
  };
  
  const jsonString = JSON.stringify(vlsData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/vls+json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${docName}.vls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast('Project saved as .vls file!', 's');
}



// ── AUTHENTICATION CONTROL ──
function checkAuthState() {
  if (userLoggedIn && currentUser) {
    // Enable Download options
    document.getElementById('dl-pdf').classList.remove('disabled');
    document.getElementById('dl-png').classList.remove('disabled');
    document.getElementById('dl-jpg').classList.remove('disabled');
    
    // Hide download login button gate
    document.getElementById('dl-login-gate-btn').style.display = 'none';
    document.getElementById('dl-menu-sep').style.display = 'none';
  } else {
    // Disable Download options
    document.getElementById('dl-pdf').classList.add('disabled');
    document.getElementById('dl-png').classList.add('disabled');
    document.getElementById('dl-jpg').classList.add('disabled');
    
    // Show download login button gate
    document.getElementById('dl-login-gate-btn').style.display = 'flex';
    document.getElementById('dl-menu-sep').style.display = 'block';
  }
}

// ── Update profile avatar & button in header ──
async function updateHeaderProfileUI(user) {
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

    let localAvatar = "";
    try {
      const metaRaw = localStorage.getItem(`mic_user_profile_${user.uid}`);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        localAvatar = meta.customAvatar || meta.avatar || "";
      }
    } catch (e) {}

    // Async fetch from MongoDB
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.uid}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data && json.data.profileImage) {
          localAvatar = json.data.profileImage;
        }
      }
    } catch (err) {
      console.error("Failed to fetch user avatar from MongoDB:", err);
    }

    let avatarUrl = localAvatar || user.photoURL;

    // Fix relative path if subdirectory
    if (avatarUrl) {
      if (avatarUrl.startsWith("assets/")) {
        avatarUrl = "../" + avatarUrl;
      } else if (avatarUrl.startsWith("/assets/")) {
        avatarUrl = ".." + avatarUrl;
      }
    }

    if (avatarUrl) {
      const imgHTML = `<img src="${avatarUrl}" alt="avatar">`;
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

// Consistent hashing function for random matching background color
function getAvatarBgColor(name) {
  const colors = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

window.handleAuthAction = function() {
  if (userLoggedIn) {
    showLogoutConfirm();
  } else {
    showLoginPopup();
  }
};

window.showLogoutConfirm = function() {
  const popup = document.getElementById('builderUserPopup');
  if (popup) popup.classList.remove('show');
  document.getElementById('login-overlay').classList.add('show');
  document.getElementById('logout-confirm-popup').classList.add('show');
};

window.closeLogoutConfirm = function() {
  document.getElementById('login-overlay').classList.remove('show');
  document.getElementById('logout-confirm-popup').classList.remove('show');
};

window.executeLogout = async function() {
  if (!firebaseAuth || !firebaseConfig) {
    toast("Auth system is loading. Please try again.", "e");
    return;
  }
  try {
    await firebaseAuth.signOut(firebaseConfig.auth);
    localStorage.removeItem('mic_active_template');
    
    checkAuthState();
    closeLogoutConfirm();
    toast('Signed out successfully!', 's');
  } catch (error) {
    console.error("Logout error:", error);
    toast("Sign out failed.", "e");
  }
};

// ── LIVE PREVIEW SCALING ENGINE (EXACT REPLICA OF BUILDER1) ──
let currentZoom = 75;
let templateWidth = 893;
let templateHeight = 760;

function updateTemplateSize() {
  const iframe = document.getElementById('card1-iframe');
  if (iframe && iframe.contentDocument) {
    const cardEl = iframe.contentDocument.querySelector('.card') || iframe.contentDocument.body.firstElementChild;
    if (cardEl) {
      templateWidth = cardEl.offsetWidth || 893;
      templateHeight = cardEl.offsetHeight || 760;
    }
  }
}

function setZoom(z) {
  z = Math.max(20, Math.min(150, z));
  currentZoom = z;
  const outer = document.getElementById('card1-outer');
  const wrap = document.getElementById('card1-scaler-wrap');
  const scale = z / 100;

  if (outer) {
    outer.style.width = templateWidth + 'px';
    outer.style.height = templateHeight + 'px';
    outer.style.transform = `scale(${scale})`;
  }
  if (wrap) {
    wrap.style.width = (templateWidth * scale) + 'px';
    wrap.style.height = (templateHeight * scale) + 'px';
  }

  const lbl = document.getElementById('z-lvl');
  if (lbl) lbl.textContent = z + '%';
}

function autoFit() {
  const vp = document.getElementById('preview-vp');
  if (!vp) return;
  updateTemplateSize();
  const availableWidth = vp.clientWidth - 48; // 24px padding on left/right
  const z = Math.floor((availableWidth / templateWidth) * 100);
  setZoom(Math.max(20, Math.min(z, 120)));
}

// Custom reset popup functions
window.showResetConfirm = function(e) {
  if (e) e.stopPropagation();
  const dlWrap = document.getElementById('dl-wrap');
  if (dlWrap) dlWrap.classList.remove('open');
  document.getElementById('login-overlay').classList.add('show');
  document.getElementById('reset-confirm-popup').classList.add('show');
};

window.closeResetConfirm = function() {
  document.getElementById('login-overlay').classList.remove('show');
  document.getElementById('reset-confirm-popup').classList.remove('show');
};

window.executeResetCard = function() {
  initializeDataState();
  
  // Re-render
  generateContentForm();
  generateCeremoniesForm();
  generateStylesForm();
  
  // Trigger UI effects
  triggerSaving();
  sendUpdate();
  closeResetConfirm();
  toast('Template defaults restored!', 's');
};

// ── INPUT TRANSLITERATION FUNCTIONALITY ──
function handleTranslitKeydown(e) {
  const toggle = document.getElementById('translit-toggle');
  if (toggle && !toggle.checked) return;

  if (e.key === ' ' || e.code === 'Space') {
    const input = this;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursorPos);
    
    // Match only English alphabet word right before the cursor
    const match = textBeforeCursor.match(/[a-zA-Z]+$/);
    if (match) {
      e.preventDefault(); // Stop space from being inserted
      const word = match[0];
      const start = cursorPos - word.length;
      const end = cursorPos;
      
      // Perform transliteration
      transliterateWord(input, word, start, end);
    }
  }
}

function transliterateWord(input, word, start, end) {
  const langSelect = document.getElementById('translit-language');
  const fullCode = langSelect ? langSelect.value : 'hi-t-i0-und';
  
  const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${encodeURIComponent(fullCode)}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeoutId);
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
        const transliteratedWord = data[1][0][1][0];
        replaceWordInInput(input, word, transliteratedWord + ' ', start, end);
      } else {
        insertSpaceAt(input, end);
      }
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.error('Transliteration error:', err);
      insertSpaceAt(input, end);
    });
}

function insertSpaceAt(input, pos) {
  const val = input.value;
  input.value = val.substring(0, pos) + ' ' + val.substring(pos);
  input.setSelectionRange(pos + 1, pos + 1);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function replaceWordInInput(input, originalWord, newWord, start, end) {
  const currentVal = input.value;
  if (currentVal.substring(start, end) !== originalWord) {
    return;
  }

  const before = currentVal.substring(0, start);
  const after = currentVal.substring(end);
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;

  input.value = before + newWord + after;

  const diff = newWord.length - originalWord.length;
  let newSelStart = selectionStart;
  let newSelEnd = selectionEnd;

  if (selectionStart >= end) {
    newSelStart += diff;
  } else if (selectionStart > start) {
    newSelStart = start + newWord.length;
  }

  if (selectionEnd >= end) {
    newSelEnd += diff;
  } else if (selectionEnd > start) {
    newSelEnd = start + newWord.length;
  }

  input.setSelectionRange(newSelStart, newSelEnd);

  const inputEvent = new Event('input', { bubbles: true });
  input.dispatchEvent(inputEvent);
  const changeEvent = new Event('change', { bubbles: true });
  input.dispatchEvent(changeEvent);
}

function handleTranslitToggleChange(el) {
  const indicator = document.getElementById('translit-indicator');
  const selectorRow = document.getElementById('translit-selector-row');
  
  if (indicator) {
    indicator.style.background = el.checked ? 'var(--success)' : 'var(--g300)';
  }
  
  if (selectorRow) {
    if (el.checked) {
      selectorRow.classList.remove('disabled');
    } else {
      selectorRow.classList.add('disabled');
    }
  }
  
  try {
    localStorage.setItem('mic_translit_enabled', el.checked ? 'true' : 'false');
  } catch(e) {}
}

function handleTranslitLanguageChange(el) {
  const selectedOption = el.options[el.selectedIndex];
  const helpText = selectedOption.dataset.help || 'Type in English, press Space to write';
  const helpEl = document.getElementById('translit-help-text');
  
  if (helpEl) {
    helpEl.textContent = helpText;
  }
  
  document.body.setAttribute('data-translit-lang', el.value);
  
  try {
    localStorage.setItem('mic_translit_lang', el.value);
  } catch(e) {}
}

function initTransliterationState() {
  try {
    const enabled = localStorage.getItem('mic_translit_enabled') !== 'false';
    const lang = localStorage.getItem('mic_translit_lang') || 'hi-t-i0-und';
    
    const toggle = document.getElementById('translit-toggle');
    const langSelect = document.getElementById('translit-language');
    
    if (toggle) {
      toggle.checked = enabled;
      handleTranslitToggleChange(toggle);
    }
    
    if (langSelect) {
      langSelect.value = lang;
      handleTranslitLanguageChange(langSelect);
    }
  } catch(e) {
    console.error('Failed to init transliteration state:', e);
  }
}
