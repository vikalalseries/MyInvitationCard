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

  // Remove template parameter from URL
  window.history.replaceState(
    {},
    "",
    "template-dashboard.html"
  );
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

/* IMPORT VLS */
function handleImportJSON(event) {
  if (!requireAuth()) return;

  const file = event.target.files[0];
  if (!file) return;

  // Validate extension
  if (!file.name.toLowerCase().endsWith('.vls')) {
    alert("Invalid file type. Only .vls files are accepted.");
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const vlsData = JSON.parse(e.target.result);

      // Validate VLS format
      if (!vlsData || vlsData.format !== 'VLS') {
        alert("Invalid .vls file. This file is not a valid MyInvitationCard project.");
        return;
      }

      // Validate data structure
      if (!vlsData.data || !vlsData.data.fields || !vlsData.data.events) {
        alert("Corrupted .vls file. Missing required data sections.");
        return;
      }

      localStorage.setItem(
        "savedVlsData",
        JSON.stringify(vlsData)
      );

      const templateId = vlsData.templateId || "card1";
      window.location.href = `universal-template-editor/editor.html?templateId=${templateId}`;
    } catch (err) {
      console.error(err);
      alert("Failed to read .vls file. The file may be corrupted.");
    } finally {
      event.target.value = '';
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

document.addEventListener("click", () => {});





const sidebarMenuBtn = document.getElementById("sidebarMenuBtn");
const sidebarPopupMenu = document.getElementById("sidebarPopupMenu");

if (sidebarMenuBtn && sidebarPopupMenu) {

  sidebarMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarPopupMenu.classList.toggle("show");
  });

  sidebarPopupMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

}

document.addEventListener(
  "click",
  () => {
    if (sidebarPopupMenu) {
      sidebarPopupMenu.classList.remove("show");
    }
  },
  true
);



const loggedOutSection = document.getElementById("loggedOutSection");
const loggedInSection = document.getElementById("loggedInSection");
const sidebarUserName = document.getElementById("sidebarUserName");
const popupUserName = document.getElementById("popupUserName");
const popupUserEmail = document.getElementById("popupUserEmail");
const sidebarAvatar = document.getElementById("sidebarAvatar");
const popupAvatar = document.getElementById("popupAvatar");
const logoutBtn = document.getElementById("logoutBtn");
const logoutConfirmOverlay = document.getElementById("logoutConfirmOverlay");
const logoutConfirmModal = document.getElementById("logoutConfirmModal");
const closeLogoutConfirmModal = document.getElementById("closeLogoutConfirmModal");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");

function showLogoutConfirm() {
  if (sidebarPopupMenu) sidebarPopupMenu.classList.remove("show");
  if (logoutConfirmOverlay) logoutConfirmOverlay.classList.add("show");
  if (logoutConfirmModal) logoutConfirmModal.classList.add("show");
}

function hideLogoutConfirm() {
  if (logoutConfirmOverlay) logoutConfirmOverlay.classList.remove("show");
  if (logoutConfirmModal) logoutConfirmModal.classList.remove("show");
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showLogoutConfirm();
  });
}

if (closeLogoutConfirmModal) {
  closeLogoutConfirmModal.addEventListener("click", hideLogoutConfirm);
}

if (cancelLogoutBtn) {
  cancelLogoutBtn.addEventListener("click", hideLogoutConfirm);
}

if (logoutConfirmOverlay) {
  logoutConfirmOverlay.addEventListener("click", hideLogoutConfirm);
}

if (confirmLogoutBtn) {
  confirmLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("signupFullName");
      hideLogoutConfirm();
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



function autoOpenTemplateFromURL() {
  const params = new URLSearchParams(window.location.search);

  const templateSlug = params.get("template");
  const event = params.get("event");

  if (event) {
    switchEvent(event);

    const targetBtn = document.querySelector(
      `.event-btn[data-event="${event}"]`
    );

    if (targetBtn) {
      eventButtons.forEach(btn =>
        btn.classList.remove("active")
      );

      targetBtn.classList.add("active");
    }

    if (event === "wedding") {
      weddingThemeSwitch.classList.add("show");
    } else {
      weddingThemeSwitch.classList.remove("show");
    }
  }

  if (!templateSlug) return;

  setTimeout(() => {
    openPreview(templateSlug);
  }, 300);
}


loadTemplates().then(() => {
  const savedEvent = localStorage.getItem("selectedEvent");

  if (savedEvent) {
    switchEvent(savedEvent);

    const targetBtn = document.querySelector(
      `.event-btn[data-event="${savedEvent}"]`
    );

    if (targetBtn) {
      targetBtn.classList.add("active");
    }

    if (savedEvent === "wedding") {
      weddingThemeSwitch.classList.add("show");
    } else {
      weddingThemeSwitch.classList.remove("show");
    }

    localStorage.removeItem("selectedEvent");
  }

  autoOpenTemplateFromURL();
});