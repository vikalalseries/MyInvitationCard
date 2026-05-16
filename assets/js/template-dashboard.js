let templates = [];
let currentTheme = "groom";
let currentEvent = "all";
let selectedTemplate = null;

/* ELEMENTS */
const templateGrid = document.getElementById("templateGrid");
const searchInput = document.getElementById("searchInput");

const quickCategory = document.getElementById("quickCategory");
const quickState = document.getElementById("quickState");
const quickStyle = document.getElementById("quickStyle");
const quickLanguage = document.getElementById("quickLanguage");

const themeButtons = document.querySelectorAll(".theme-btn");
const eventButtons = document.querySelectorAll(".event-btn");

const templateModal = document.getElementById("templateModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");
const suggestionGrid = document.getElementById("suggestionGrid");

const closeModal = document.getElementById("closeModal");
const backBtn = document.getElementById("backBtn");
const useTemplateBtn = document.getElementById("useTemplateBtn");

const importJson = document.getElementById("importJson");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");
const mobileOverlay = document.getElementById("mobileOverlay");

/* LOAD TEMPLATES */
async function loadTemplates() {
  try {
    const response = await fetch("data/templates.json");
    templates = await response.json();
    renderTemplates();
  } catch (error) {
    console.error(error);
    templateGrid.innerHTML = `
      <p style="padding:40px;">Failed to load templates.</p>
    `;
  }
}

function getTemplateDescription(template) {
  if (template.event === "wedding") {
    return "Elegant Indian Wedding Template";
  }

  if (template.event === "engagement") {
    return "Beautiful Engagement Invitation";
  }

  if (template.event === "birthday") {
    return "Modern Birthday Invitation";
  }

  if (template.event === "anniversary") {
    return "Premium Anniversary Card";
  }

  return "Beautiful Invitation Template";
}

/* RENDER */
function renderTemplates() {
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = templates.filter((template) => {
    const matchesTheme = template.type === currentTheme;

    const matchesEvent =
      currentEvent === "all" || template.event === currentEvent;

    const matchesCategory =
      quickCategory.value === "all" ||
      template.religion === quickCategory.value;

    const matchesState =
      quickState.value === "" ||
      template.state === quickState.value;

    const matchesStyle =
      quickStyle.value === "all" ||
      template.style === quickStyle.value;

    const matchesLanguage =
      quickLanguage.value === "all" ||
      template.language === quickLanguage.value;

    const searchableText = `
      ${template.title}
      ${template.religion}
      ${template.state}
      ${template.style}
      ${template.language}
      ${template.event}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return (
      matchesTheme &&
      matchesEvent &&
      matchesCategory &&
      matchesState &&
      matchesStyle &&
      matchesLanguage &&
      matchesSearch
    );
  });

  if (!filtered.length) {
    templateGrid.innerHTML = `
      <div style="padding:40px;font-size:18px;">
        No templates found.
      </div>
    `;
    return;
  }

  templateGrid.innerHTML = filtered
    .map(
      (template) => `
        <div class="template-card ${template.size}" data-id="${template.id}">
        
          <div class="template-image">
            <img 
              src="${template.thumbnail}" 
              alt="${template.title}"
              onerror="this.src='assets/templates/default-template.jpg'"
            >
          </div>

          <div class="template-content">
            <h3>${template.title}</h3>

            <p class="template-desc">
              ${getTemplateDescription(template)}
            </p>

            <button class="card-use-btn" data-id="${template.id}">
              Use Template
            </button>
          </div>

        </div>
      `
    )
    .join("");


/* WHOLE CARD CLICK */
  document.querySelectorAll(".template-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const template = templates.find((t) => t.id === id);

      openTemplateModal(template);
    });
  });

/* BUTTON CLICK */
  document.querySelectorAll(".card-use-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const id = Number(btn.dataset.id);
      const template = templates.find((t) => t.id === id);

      openTemplateModal(template);
    });
  });
}

/* MODAL */
function openTemplateModal(template) {
  selectedTemplate = template;

  modalImage.src = template.thumbnail;
  modalTitle.textContent = template.title;

  modalMeta.textContent = `
    ${template.event} •
    ${template.religion} •
    ${template.state.replace(/-/g, " ")} •
    ${template.style} •
    ${template.language}
  `;

  renderSuggestions(template);

  templateModal.classList.remove("hidden");
}

function closeTemplateModal() {
  templateModal.classList.add("hidden");
}

/* SUGGESTIONS */
function renderSuggestions(template) {
  const suggestions = templates
    .filter((t) => {
      if (t.id === template.id) return false;

      return (
        t.type === currentTheme &&
        (
          t.event === template.event ||
          t.religion === template.religion ||
          t.state === template.state ||
          t.style === template.style ||
          t.language === template.language
        )
      );
    })
    .slice(0, 4);

  suggestionGrid.innerHTML = suggestions
    .map(
      (template) => `
        <div class="suggestion-card" data-id="${template.id}">
          <img src="${template.thumbnail}" alt="${template.title}">
          <h4>${template.title}</h4>
        </div>
      `
    )
    .join("");

  document.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const template = templates.find((t) => t.id === id);
      openTemplateModal(template);
    });
  });
}

/* THEME */
function switchTheme(theme) {
  currentTheme = theme;

  document.body.classList.remove("groom-theme", "bride-theme");
  document.body.classList.add(`${theme}-theme`);

  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });

  renderTemplates();
}

/* EVENT */
function switchEvent(eventName) {
  currentEvent = eventName;

  eventButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.event === eventName);
  });

  renderTemplates();
}

/* IMPORT JSON */
function handleImportJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const jsonData = JSON.parse(e.target.result);

      localStorage.setItem(
        "savedCardDesign",
        JSON.stringify(jsonData)
      );

      window.location.href = "builder.html";
    } catch {
      alert("Invalid JSON file.");
    }
  };

  reader.readAsText(file);
}

/* MOBILE */
function openSidebar() {
  sidebar.classList.add("show");
  mobileOverlay.classList.add("show");
}

function closePanels() {
  sidebar.classList.remove("show");
  mobileOverlay.classList.remove("show");
}

/* EVENTS */
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTheme(btn.dataset.theme);
  });
});

eventButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchEvent(btn.dataset.event);
  });
});

searchInput.addEventListener("input", renderTemplates);
quickCategory.addEventListener("change", renderTemplates);
quickState.addEventListener("change", renderTemplates);
quickStyle.addEventListener("change", renderTemplates);
quickLanguage.addEventListener("change", renderTemplates);

if (closeModal) {
  closeModal.addEventListener("click", closeTemplateModal);
}

if (backBtn) {
  backBtn.addEventListener("click", closeTemplateModal);
}

if (templateModal) {
  templateModal.addEventListener("click", (e) => {
    if (e.target === templateModal) {
      closeTemplateModal();
    }
  });
}

if (useTemplateBtn) {
  useTemplateBtn.addEventListener("click", () => {
    if (!selectedTemplate) return;

    localStorage.setItem(
      "selectedTemplate",
      JSON.stringify(selectedTemplate)
    );

    window.location.href = "builder.html";
  });
}

if (importJson) {
  importJson.addEventListener("change", handleImportJSON);
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", openSidebar);
}

if (mobileOverlay) {
  mobileOverlay.addEventListener("click", closePanels);
}

/* INIT */
loadTemplates();