import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

const stateFilter = document.getElementById("stateFilter");
const religionFilter = document.getElementById("religionFilter");
const styleFilter = document.getElementById("styleFilter");
const languageFilter = document.getElementById("languageFilter");

const themeButtons = document.querySelectorAll(".theme-btn");
const eventButtons = document.querySelectorAll(".event-btn");

const weddingToggle = document.getElementById("weddingToggle");
const weddingThemeSwitch = document.getElementById("weddingThemeSwitch");

const templateModal = document.getElementById("templateModal");
const previewFrame = document.getElementById("previewFrame");

const closeModal = document.getElementById("closeModal");

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



/* RENDER */
function renderTemplates() {
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = templates.filter((template) => {
    const matchesTheme =
      currentEvent === "all"
        ? true
        : currentEvent === "wedding"
        ? template.type === currentTheme
        : true;

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
        <div 
          class="template-card" 
          data-id="${template.id}"
          data-slug="${template.slug}"
        >
          <div class="template-image">
            <img 
              src="${template.thumbnail}" 
              alt="${template.title}"
              onerror="this.src='assets/templates/default-template.jpg'"
            >
          </div>

          <div class="template-content">
            <h3>${template.title}</h3>
          </div>
        </div>
      `
    )
    .join("");


/* WHOLE CARD CLICK */
  document.querySelectorAll(".template-card").forEach((card) => {
    card.addEventListener("click", () => {
      const slug = card.dataset.slug;
      openPreview(slug);
    });
  });
}


function openPreview(templateSlug) {
  if (!previewFrame) return;

  previewFrame.src = `preview.html?template=${templateSlug}`;

  templateModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

function closePreview() {
  templateModal.classList.add("hidden");

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";

  if (previewFrame) {
    previewFrame.src = "";
  }
}


function updateWeddingThemeState() {
  document.body.classList.remove(
    "groom-theme",
    "bride-theme",
    "default-theme"
  );

  const isDarkMode =
    document.documentElement.classList.contains("site-theme-dark");

  if (currentEvent !== "wedding") return;

  if (isDarkMode) return;

  if (currentTheme === "bride") {
    document.body.classList.add("bride-theme");
  } else {
    document.body.classList.add("groom-theme");
  }
}

window.updateWeddingThemeState = updateWeddingThemeState;

/* THEME */
function switchTheme(theme) {
  currentTheme = theme;

  if (currentEvent === "wedding") {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme",
      "default-theme"
    );

    /* ONLY APPLY BRIDE/GROOM COLORS IN LIGHT MODE */
    if (!document.documentElement.classList.contains("site-theme-dark")) {
      document.body.classList.add(`${theme}-theme`);
    }
  }

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

  if (eventName === "wedding") {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme",
      "default-theme"
    );

    document.body.classList.add(`${currentTheme}-theme`);

    stateFilter.style.display = "flex";
    religionFilter.style.display = "flex";
    styleFilter.style.display = "flex";
    languageFilter.style.display = "flex";
  }

  else if (eventName === "birthday") {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme"
    );

    // document.body.classList.add("default-theme");

    stateFilter.style.display = "none";
    religionFilter.style.display = "none";
    styleFilter.style.display = "flex";
    languageFilter.style.display = "flex";
  }

  else {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme"
    );

    // document.body.classList.add("default-theme");

    stateFilter.style.display = "flex";
    religionFilter.style.display = "flex";
    styleFilter.style.display = "flex";
    languageFilter.style.display = "flex";
  }

  renderTemplates();
}

/* IMPORT JSON */
function handleImportJSON(event) {
  if (!requireAuth()) return;

  const file = event.target.files[0];

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
  document.body.style.overflow = "hidden";
}

function closePanels() {
  sidebar.classList.remove("show");
  mobileOverlay.classList.remove("show");
  document.body.style.overflow = "";
}

function requireAuth() {
  if (!auth.currentUser) {
    const loginBtn = document.getElementById("openAccountAuthBtn");

    if (loginBtn) {
      loginBtn.click();
    }

    return false;
  }

  return true;
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

    if (btn.dataset.event === "wedding") {
      weddingThemeSwitch.classList.toggle("show");
    } else {
      weddingThemeSwitch.classList.remove("show");
    }
  });
});

searchInput.addEventListener("input", renderTemplates);
quickCategory.addEventListener("change", renderTemplates);
quickState.addEventListener("change", renderTemplates);
quickStyle.addEventListener("change", renderTemplates);
quickLanguage.addEventListener("change", renderTemplates);





if (templateModal) {
  templateModal.addEventListener("click", (e) => {
    if (e.target === templateModal) {
      closePreview();
    }
  });
}



function closeTemplateModal() {
  templateModal.classList.add("hidden");

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";

  if (menuDropdown) {
    menuDropdown.classList.add("hidden");
  }
}



if (closeModal) {
  closeModal.addEventListener("click", closePreview);
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

document.addEventListener("click", (e) => {
  if (
    menuDropdown &&
    !menuDropdown.contains(e.target) &&
    (!menuBtn || !menuBtn.contains(e.target))
  ) {
    menuDropdown.classList.add("hidden");
  }
});

const sidebarMenuBtn = document.getElementById("sidebarMenuBtn");
const sidebarPopupMenu = document.getElementById("sidebarPopupMenu");

if (sidebarMenuBtn && sidebarPopupMenu) {
  sidebarMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarPopupMenu.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (!sidebarPopupMenu.contains(e.target)) {
      sidebarPopupMenu.classList.remove("show");
    }
  });
}



const loggedOutSection = document.getElementById("loggedOutSection");
const loggedInSection = document.getElementById("loggedInSection");
const sidebarUserName = document.getElementById("sidebarUserName");
const popupUserName = document.getElementById("popupUserName");
const popupUserEmail = document.getElementById("popupUserEmail");
const sidebarAvatar = document.getElementById("sidebarAvatar");
const popupAvatar = document.getElementById("popupAvatar");
const logoutBtn = document.getElementById("logoutBtn");


if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("signupFullName");

      sidebarPopupMenu.classList.remove("show");
    } catch (error) {
      console.error(error);
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loggedOutSection.style.display = "none";
    loggedInSection.style.display = "block";

    const savedSignupName = localStorage.getItem("signupFullName");

    const displayName =
      user.displayName ||
      savedSignupName ||
      user.email.split("@")[0];

    sidebarUserName.textContent = displayName;
    popupUserName.textContent = displayName;
    popupUserEmail.textContent = user.email;

    if (user.photoURL) {
      sidebarAvatar.innerHTML = `<img src="${user.photoURL}">`;
      popupAvatar.innerHTML = `<img src="${user.photoURL}">`;
    }

  } else {
    loggedOutSection.style.display = "block";
    loggedInSection.style.display = "none";
  }
});



loadTemplates().then(() => {
  autoOpenTemplateFromURL();
});



function autoOpenTemplateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const templateSlug = params.get("template");

  if (!templateSlug) return;

  setTimeout(() => {
    openPreview(templateSlug);
  }, 300);
}