// ── UNIVERSAL TEMPLATE EDITOR CORE ──

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

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  loadTemplate(activeTemplateId);
  
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
    alert(`Error loading template "${templateId}": Configuration file not found or invalid.`);
  }
}

// Reset current data state to match config defaults
function initializeDataState() {
  currentData = {
    fields: {},
    events: {},
    styles: {}
  };
  
  if (!config) return;
  
  // Load standard text/textarea field defaults
  if (config.fields) {
    config.fields.forEach(f => {
      currentData.fields[f.id] = f.default || '';
    });
  }
  
  // Load ceremony events defaults
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
  
  // Load style defaults
  if (config.styles) {
    config.styles.forEach(s => {
      currentData.styles[s.id] = s.default !== undefined ? s.default : '';
    });
  }
}

// Generate Content Form inputs
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
  
  // Render each category
  FIELD_CATEGORIES.forEach(categoryName => {
    const fields = categorized[categoryName];
    if (fields.length === 0) return;
    
    // Add section title
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'form-section-title';
    sectionTitle.textContent = categoryName;
    container.appendChild(sectionTitle);
    
    // Add input elements
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
          sendUpdate();
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.value = currentData.fields[field.id];
        input.addEventListener('input', (e) => {
          currentData.fields[field.id] = e.target.value;
          sendUpdate();
        });
      }
      
      group.appendChild(input);
      container.appendChild(group);
    });
  });
}

// Generate Events / Ceremonies Form inputs
function generateCeremoniesForm() {
  const container = document.getElementById('dynamic-ceremonies-fields');
  container.innerHTML = '';
  
  if (!config || !config.events) return;
  
  config.events.forEach(e => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.id = `event-card-${e.id}`;
    
    // Header row with switch toggle
    const header = document.createElement('div');
    header.className = 'event-card-header';
    
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = e.label || e.id;
    header.appendChild(title);
    
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    
    const switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    switchInput.checked = currentData.events[e.id].active;
    switchInput.addEventListener('change', (evt) => {
      const active = evt.target.checked;
      currentData.events[e.id].active = active;
      if (active) {
        card.classList.remove('inactive');
      } else {
        card.classList.add('inactive');
      }
      sendUpdate();
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(slider);
    header.appendChild(switchLabel);
    card.appendChild(header);
    
    // Body inputs container
    const body = document.createElement('div');
    body.className = 'event-card-body';
    
    // 1. Ceremony name input
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = "Ceremony Name";
    nameGroup.appendChild(nameLabel);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input';
    nameInput.value = currentData.events[e.id].name;
    nameInput.addEventListener('input', (evt) => {
      currentData.events[e.id].name = evt.target.value;
      sendUpdate();
    });
    nameGroup.appendChild(nameInput);
    body.appendChild(nameGroup);
    
    // 2. Ceremony date picker (if default exists)
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
        sendUpdate();
      });
      dateGroup.appendChild(dateInput);
      body.appendChild(dateGroup);
    }
    
    // 3. Ceremony time picker (if default exists)
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
        sendUpdate();
      });
      timeGroup.appendChild(timeInput);
      body.appendChild(timeGroup);
    }
    
    // 4. Ceremony venue (if default exists)
    if (e.defaultVenue !== undefined) {
      const venueGroup = document.createElement('div');
      venueGroup.className = 'form-group';
      const venueLabel = document.createElement('label');
      venueLabel.textContent = "Venue / Address";
      venueGroup.appendChild(venueLabel);
      
      const venueInput = document.createElement('input');
      venueInput.type = 'text';
      venueInput.className = 'form-input';
      venueInput.value = currentData.events[e.id].venue;
      venueInput.addEventListener('input', (evt) => {
        currentData.events[e.id].venue = evt.target.value;
        sendUpdate();
      });
      venueGroup.appendChild(venueInput);
      body.appendChild(venueGroup);
    }
    
    card.appendChild(body);
    
    // Apply initial inactive class if config loading has it unchecked
    if (!currentData.events[e.id].active) {
      card.classList.add('inactive');
    }
    
    container.appendChild(card);
  });
}

// Generate Styling Form inputs
function generateStylesForm() {
  const container = document.getElementById('dynamic-styles-fields');
  container.innerHTML = '';
  
  if (!config || !config.styles) return;
  
  config.styles.forEach(s => {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = s.label || s.id;
    group.appendChild(label);
    
    if (s.type === 'color') {
      // Color input row with picker + text input
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
        sendUpdate();
      });
      
      text.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
          picker.value = val;
        }
        currentData.styles[s.id] = val;
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
        sendUpdate();
      });
      
      group.appendChild(select);
    } else {
      // Standard text input fallback
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.value = currentData.styles[s.id];
      input.addEventListener('input', (e) => {
        currentData.styles[s.id] = e.target.value;
        sendUpdate();
      });
      group.appendChild(input);
    }
    
    container.appendChild(group);
  });
}

// Switch Sidebar tabs
function switchTab(tabId) {
  // Toggle tab buttons state
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Find matching button by its onclick function
  const btnIdx = (tabId === 'content-tab') ? 0 : (tabId === 'ceremonies-tab') ? 1 : 2;
  document.querySelectorAll('.tab-btn')[btnIdx].classList.add('active');
  
  // Toggle tab panes state
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
}

// Send real-time updates to preview frame
function sendUpdate() {
  const iframe = document.getElementById('preview-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'UPDATE_TEMPLATE_DATA',
      data: currentData
    }, '*');
  }
}

// Reset values to configuration defaults
function resetToDefaults() {
  if (!confirm("Are you sure you want to reset all edits to the template defaults?")) return;
  
  initializeDataState();
  
  // Redraw form fields
  generateContentForm();
  generateCeremoniesForm();
  generateStylesForm();
  
  // Send state update
  sendUpdate();
}

// Export custom configuration state as a JSON file
function exportData() {
  const jsonString = JSON.stringify(currentData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activeTemplateId}_config.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
