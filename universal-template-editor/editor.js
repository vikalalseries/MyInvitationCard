// ── UNIVERSAL TEMPLATE EDITOR CORE (PREMIUM UX) ──

let activeTemplateId = 'card1';
let config = null;
let currentData = {
  fields: {},
  events: {},
  styles: {}
};

// Map of categories to group flat fields together
const FIELD_CATEGORIES = [
  "Mantra & Shloka",
  "Bride Details",
  "Groom Details",
  "Invitation Details",
  "Family Details",
  "Bal Aagrah"
];

// Style categories to group custom design settings
const STYLE_CATEGORIES = {
  "Colors & Backgrounds": ["bodyBg", "cardBg", "accentColor", "textColor", "headingColor", "borderColor"],
  "Typography & Scales": ["fontFamily", "shlokaSize", "headingSize", "namesSize", "eventSize", "footerSize"],
  "Graphics & Borders": [
    "showGanesh", "ganeshSize", "showOm", "omSize", 
    "showChains", "chainsSize", "showCouple", "coupleSize", 
    "showCorners", "cornerSymbol", "cornerSize", "cardPadding", 
    "sectionGap", "showBorder", "curveLevel", "borderPreset"
  ]
};

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

  // Global click listener to close dropdown menu
  document.addEventListener('click', () => {
    document.getElementById('dl-wrap').classList.remove('open');
  });

  // Listen for iframe readiness confirmation
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PREVIEW_READY') {
      sendUpdate();
    }
  });
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
    
    // Generate Editor forms dynamically
    generateContentForm();
    generateCeremoniesForm();
    generateStylesForm();
    
    // Set preview iframe template path
    const previewIframe = document.getElementById('preview-iframe');
    if (previewIframe) {
      previewIframe.src = `preview/preview.html?template=${templateId}`;
    }
  } catch (error) {
    console.error("Failed to load template configuration:", error);
    toast(`Error loading template configuration.`, 'e');
  }
}

// Initialize data state from config defaults
function initializeDataState() {
  currentData = {
    fields: {},
    events: {},
    styles: {}
  };
  
  if (!config) return;
  
  if (config.fields) {
    config.fields.forEach(f => {
      currentData.fields[f.id] = f.default || '';
    });
  }
  
  if (config.events) {
    config.events.forEach(e => {
      currentData.events[e.id] = {
        name: e.defaultName || '',
        date: e.defaultDate || '',
        time: e.defaultTime || '',
        venue: e.defaultVenue || '',
        active: true
      };
    });
  }
  
  if (config.styles) {
    config.styles.forEach(s => {
      currentData.styles[s.id] = s.default !== undefined ? s.default : '';
    });
  }
}

// Accordion Expand/Collapse
function toggleAccordion(head) {
  const sc = head.closest('.sc');
  sc.classList.toggle('open');
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
      
      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'form-input form-textarea';
        input.value = currentData.fields[field.id];
        input.addEventListener('input', (e) => {
          currentData.fields[field.id] = e.target.value;
          triggerSaving();
          sendUpdate();
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.value = currentData.fields[field.id];
        input.addEventListener('input', (e) => {
          currentData.fields[field.id] = e.target.value;
          triggerSaving();
          sendUpdate();
        });
      }
      
      group.appendChild(input);
      inner.appendChild(group);
    });
    
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
    sc.className = 'sc event-card';
    sc.id = `event-card-${e.id}`;
    if (index === 0) sc.classList.add('open'); // Open first ceremony by default
    
    // Custom header for event cards incorporating active state switch
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
    
    // Switch element (does not trigger toggleAccordion on click)
    const switchDiv = document.createElement('div');
    switchDiv.setAttribute('onclick', 'event.stopPropagation()');
    
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    
    const switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    switchInput.checked = currentData.events[e.id].active;
    switchInput.addEventListener('change', (evt) => {
      const active = evt.target.checked;
      currentData.events[e.id].active = active;
      if (active) {
        sc.classList.remove('inactive');
      } else {
        sc.classList.add('inactive');
      }
      triggerSaving();
      sendUpdate();
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(slider);
    switchDiv.appendChild(switchLabel);
    head.appendChild(switchDiv);
    
    const chev = document.createElement('i');
    chev.className = 'fa-solid fa-chevron-down sc-chev';
    chev.style.marginLeft = '12px';
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
    nameLabel.textContent = "Ceremony Program Name";
    nameGroup.appendChild(nameLabel);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input';
    nameInput.value = currentData.events[e.id].name;
    nameInput.addEventListener('input', (evt) => {
      currentData.events[e.id].name = evt.target.value;
      triggerSaving();
      sendUpdate();
    });
    nameGroup.appendChild(nameInput);
    inner.appendChild(nameGroup);
    
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
      dateInput.value = currentData.events[e.id].date;
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
      
      const venueInput = document.createElement('input');
      venueInput.type = 'text';
      venueInput.className = 'form-input';
      venueInput.value = currentData.events[e.id].venue;
      venueInput.addEventListener('input', (evt) => {
        currentData.events[e.id].venue = evt.target.value;
        triggerSaving();
        sendUpdate();
      });
      venueGroup.appendChild(venueInput);
      inner.appendChild(venueGroup);
    }
    
    body.appendChild(inner);
    sc.appendChild(body);
    
    // Set initial active/inactive classes
    if (!currentData.events[e.id].active) {
      sc.classList.add('inactive');
    }
    
    container.appendChild(sc);
  });
}

// Generate Styles Form accordion panels (grouped)
function generateStylesForm() {
  const container = document.getElementById('dynamic-styles-fields');
  container.innerHTML = '';
  
  if (!config || !config.styles) return;
  
  // Group fields into 3 logical design categories
  Object.keys(STYLE_CATEGORIES).forEach((categoryName, index) => {
    const ids = STYLE_CATEGORIES[categoryName];
    const fields = config.styles.filter(s => ids.includes(s.id));
    if (fields.length === 0) return;
    
    const sc = document.createElement('div');
    sc.className = 'sc';
    if (index === 0) sc.classList.add('open'); // Open first design panel by default
    
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
    
    fields.forEach(s => {
      const group = document.createElement('div');
      group.className = 'form-group';
      
      const label = document.createElement('label');
      label.textContent = s.label || s.id;
      group.appendChild(label);
      
      if (s.type === 'color') {
        const row = document.createElement('div');
        row.className = 'color-picker-row';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'color-input-wrapper';
        
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.className = 'color-picker-raw';
        picker.value = currentData.styles[s.id];
        
        const text = document.createElement('input');
        text.type = 'text';
        text.className = 'form-input color-text-input';
        text.value = currentData.styles[s.id];
        
        picker.addEventListener('input', (e) => {
          const val = e.target.value;
          text.value = val;
          currentData.styles[s.id] = val;
          triggerSaving();
          sendUpdate();
        });
        
        text.addEventListener('input', (e) => {
          const val = e.target.value;
          if (/^#[0-9A-F]{6}$/i.test(val)) {
            picker.value = val;
          }
          currentData.styles[s.id] = val;
          triggerSaving();
          sendUpdate();
        });
        
        wrapper.appendChild(picker);
        row.appendChild(wrapper);
        row.appendChild(text);
        group.appendChild(row);
      } else if (s.type === 'select') {
        const select = document.createElement('select');
        select.className = 'dropdown-select';
        
        s.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = isNaN(opt) ? opt : `${opt}%`;
          if (String(opt) === String(currentData.styles[s.id])) {
            o.selected = true;
          }
          select.appendChild(o);
        });
        
        select.addEventListener('change', (e) => {
          currentData.styles[s.id] = e.target.value;
          triggerSaving();
          sendUpdate();
        });
        
        group.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.value = currentData.styles[s.id];
        input.addEventListener('input', (e) => {
          currentData.styles[s.id] = e.target.value;
          triggerSaving();
          sendUpdate();
        });
        group.appendChild(input);
      }
      
      inner.appendChild(group);
    });
    
    body.appendChild(inner);
    sc.appendChild(body);
    container.appendChild(sc);
  });
}

// Switch sidebar tabs
function switchTab(tabId) {
  // Reset tab button states
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set active tab button
  document.getElementById(`btn-${tabId}`).classList.add('active');
  
  // Set active tab panel
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
}

// Send updates to preview frame
function sendUpdate() {
  const iframe = document.getElementById('preview-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'UPDATE_TEMPLATE_DATA',
      data: currentData
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

// ── DOWNLOAD MENU TOGGLE ──
function toggleDownloadMenu(e) {
  e.stopPropagation();
  const wrap = document.getElementById('dl-wrap');
  wrap.classList.toggle('open');
}

// ── PRINT ACTION ──
function printCard() {
  const iframe = document.getElementById('preview-iframe');
  const innerIframe = iframe.contentWindow.document.getElementById('preview-iframe');
  if (innerIframe && innerIframe.contentWindow) {
    innerIframe.contentWindow.focus();
    innerIframe.contentWindow.print();
  } else if (iframe && iframe.contentWindow) {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }
}

// ── DOWNLOAD TRIGGER ──
function handleDownload(format) {
  document.getElementById('dl-wrap').classList.remove('open');
  
  // Access control check
  if (!userLoggedIn) {
    showLoginPopup();
    toast('Access denied. Please log in to download premium formats.', 'e');
    return;
  }
  
  toast(`Generating ${format.toUpperCase()}...`, 'i');
  
  setTimeout(() => {
    if (format === 'pdf') {
      // Trigger print for PDF since native browser handles high-quality print to PDF
      printCard();
      toast('PDF document compiled!', 's');
    } else {
      // Simulated image download
      const docName = document.getElementById('doc-title-input').value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const dummyContent = JSON.stringify(currentData, null, 2);
      const blob = new Blob([dummyContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docName}_card.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast(`${format.toUpperCase()} file saved!`, 's');
    }
  }, 1500);
}

// ── AUTHENTICATION CONTROL ──
function checkAuthState() {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    userLoggedIn = true;
    
    // Update Auth Action Button UI
    document.getElementById('auth-action-text').textContent = currentUser.name || 'Logout';
    
    // Enable Download options
    document.getElementById('dl-pdf').classList.remove('disabled');
    document.getElementById('dl-png').classList.remove('disabled');
    document.getElementById('dl-jpg').classList.remove('disabled');
    
    // Hide download login button gate
    document.getElementById('dl-login-gate-btn').style.display = 'none';
    document.getElementById('dl-menu-sep').style.display = 'none';
  } else {
    currentUser = null;
    userLoggedIn = false;
    
    // Update Auth Action Button UI
    document.getElementById('auth-action-text').textContent = 'Login';
    
    // Disable Download options
    document.getElementById('dl-pdf').classList.add('disabled');
    document.getElementById('dl-png').classList.add('disabled');
    document.getElementById('dl-jpg').classList.add('disabled');
    
    // Show download login button gate
    document.getElementById('dl-login-gate-btn').style.display = 'flex';
    document.getElementById('dl-menu-sep').style.display = 'block';
  }
}

function handleAuthAction() {
  if (userLoggedIn) {
    if (confirm("Are you sure you want to sign out?")) {
      localStorage.removeItem('currentUser');
      checkAuthState();
      toast('Signed out successfully!', 's');
    }
  } else {
    showLoginPopup();
  }
}

function showLoginPopup() {
  document.getElementById('login-overlay').classList.add('show');
  document.getElementById('login-popup').classList.add('show');
  switchPopupView('lp-view-welcome');
}

function hideLoginPopup(e) {
  if (e) e.stopPropagation();
  document.getElementById('login-overlay').classList.remove('show');
  document.getElementById('login-popup').classList.remove('show');
}

function switchPopupView(viewId) {
  document.querySelectorAll('.lp-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');
}

function simulateLogin(emailVal) {
  const username = emailVal.includes('@') ? emailVal.split('@')[0] : emailVal;
  const user = {
    email: emailVal.includes('@') ? emailVal : `${username}@example.com`,
    name: username.charAt(0).toUpperCase() + username.slice(1)
  };
  
  localStorage.setItem('currentUser', JSON.stringify(user));
  checkAuthState();
  hideLoginPopup();
  
  toast(`Welcome back, ${user.name}!`, 's');
}
