/* ════════════════════════════════════════════════════════════
   order-success.js - Order Success and Tracking Logic
   ════════════════════════════════════════════════════════════ */

const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://myinvitationcard.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load details from localStorage or use fallback mockup
  const savedDetailsStr = localStorage.getItem("mic_last_order_details");
  let orderDetails = null;
  
  if (savedDetailsStr) {
    try {
      orderDetails = JSON.parse(savedDetailsStr);
    } catch (e) {
      console.error("Error parsing order details:", e);
    }
  }
  
  if (!orderDetails) {
    console.warn("No real order details found. Using fallback mock details for presentation.");
    orderDetails = getFallbackMockupData();
  }
  
  // 2. Populate UI Fields
  populateUI(orderDetails);
  
  // 3. Setup Iframe Preview & Sync Data
  setupIframePreview(orderDetails);
  startLiveOrderSync(orderDetails);
  
  // 4. Setup Star Rating Component Interactivity
  setupStarRating();
});

const templatePreviewConfigCache = new Map();
let liveOrderPollTimer = null;

function resolveTemplateFolder(templateId) {
  if (!templateId) return "card1";
  const id = String(templateId).toLowerCase();
  if (id === "card1" || id === "1" || id === "37" || id === "38" || id.startsWith("card")) {
    return "card1";
  }
  return "card1";
}

async function loadTemplatePreviewConfig(templateId) {
  const folder = resolveTemplateFolder(templateId);
  if (templatePreviewConfigCache.has(folder)) {
    return templatePreviewConfigCache.get(folder);
  }

  try {
    const response = await fetch(`templates/${folder}/config.json`);
    if (response.ok) {
      const config = await response.json();
      templatePreviewConfigCache.set(folder, config);
      return config;
    }
  } catch (err) {
    console.warn("Failed to load success-page preview config:", err);
  }

  templatePreviewConfigCache.set(folder, null);
  return null;
}

function getOrderTemplateData(details) {
  return details?.templateEditData || details?.data || {};
}

function resolveTemplateDataWithDefaults(details, config) {
  const orderData = getOrderTemplateData(details);
  const resolvedData = {
    fields: {},
    events: {},
    styles: orderData.styles || {}
  };

  if (config && Array.isArray(config.fields)) {
    config.fields.forEach((field) => {
      const val = orderData.fields && orderData.fields[field.id];
      resolvedData.fields[field.id] = (val === null || val === undefined) ? (field.default || "") : val;
    });
  } else {
    resolvedData.fields = orderData.fields || {};
  }

  if (config && Array.isArray(config.events)) {
    config.events.forEach((event) => {
      const current = (orderData.events && orderData.events[event.id]) || {};
      resolvedData.events[event.id] = {
        name: current.name ?? event.defaultName ?? "",
        date: current.date ?? event.defaultDate ?? "",
        time: current.time || "",
        venue: current.venue || "",
        active: current.active !== false
      };
    });
  } else {
    resolvedData.events = orderData.events || {};
  }

  return resolvedData;
}

function applySuccessTrackerState(details) {
  const status = details?.status || "Confirmed";
  const statusSteps = ["Confirmed", "Printing", "Dispatched", "Out for Delivery", "Delivered"];
  const progressMap = {
    Pending: 15,
    Confirmed: 25,
    Processing: 45,
    Printing: 45,
    Dispatched: 70,
    "Out for Delivery": 90,
    Delivered: 100,
    Cancelled: 0,
    Returned: 0
  };

  const progress = progressMap[status] ?? 25;
  const bar = document.querySelector(".tracker-line-progress");
  if (bar) {
    bar.style.width = `${progress}%`;
  }

  const stepElements = document.querySelectorAll(".tracker-step");
  stepElements.forEach((stepEl) => {
    stepEl.classList.remove("active");
  });

  const stepOrder = ["Order Confirmed", "Cards Printed", "Shipped", "Delivered"];
  const activeCount = progress >= 100 ? 4 : progress >= 70 ? 3 : progress >= 45 ? 2 : 1;
  stepElements.forEach((stepEl, index) => {
    if (index < activeCount) {
      stepEl.classList.add("active");
    }
  });

  const deliveryText = details?.estimatedDelivery || details?.deliveryDate || "Pending";
  const confirmDateEl = document.getElementById("track-confirm-date");
  const deliveryDateEl = document.getElementById("track-delivery-date");
  const orderPlacedAt = details?.orderDate || details?.createdAt || details?.updatedAt;
  if (confirmDateEl && orderPlacedAt) {
    confirmDateEl.textContent = new Date(orderPlacedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (deliveryDateEl) {
    deliveryDateEl.textContent = `Estimated: ${deliveryText}`;
  }
}

async function renderSuccessPreview(details) {
  const iframe = document.getElementById("iframe-checkout-preview");
  if (!iframe) return;

  const folder = resolveTemplateFolder(details.templateId);
  const config = await loadTemplatePreviewConfig(details.templateId);
  const resolvedData = resolveTemplateDataWithDefaults(details, config);
  const container = iframe.parentElement;

  iframe.src = `templates/${folder}/template.html`;
  iframe.onload = () => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      const existing = doc.getElementById("success-preview-style");
      if (!existing) {
        const style = doc.createElement("style");
        style.id = "success-preview-style";
        style.textContent = `
          body { background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; }
          .card { padding: 0 !important; margin: 0 !important; gap: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; width: 21.5cm !important; height: 8.5cm !important; min-height: 8.5cm !important; overflow: hidden !important; }
          .sec2 { display: none !important; }
          .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; position: absolute !important; }
        `;
        doc.head.appendChild(style);
      }
    }

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: "UPDATE_TEMPLATE_DATA",
        data: resolvedData
      }, "*");
    }

    if (container) {
      const scale = Math.min(container.clientWidth / 888, container.clientHeight / 718);
      iframe.style.transformOrigin = "top left";
      iframe.style.transform = `scale(${scale})`;
    }

    const placeholder = iframe.parentElement?.querySelector(".thumbnail-preview-placeholder");
    if (placeholder) {
      placeholder.style.display = "none";
    }
  };
}

async function refreshOrderFromBackend(orderId, currentSnapshot) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}`);
    if (!res.ok) return currentSnapshot;
    const json = await res.json();
    if (!json.success || !json.order) return currentSnapshot;
    const backendOrder = json.order;
    const merged = {
      ...currentSnapshot,
      ...backendOrder,
      paperStock: backendOrder.paperStock || backendOrder.stockOption || currentSnapshot.paperStock,
      envelopeOption: backendOrder.envelopeOption || currentSnapshot.envelopeOption,
      deliveryDate: backendOrder.estimatedDelivery || backendOrder.deliveryDate || currentSnapshot.deliveryDate,
      grandTotal: backendOrder.grandTotal || backendOrder.pricing?.total || currentSnapshot.grandTotal,
      data: backendOrder.data || backendOrder.templateEditData || currentSnapshot.data,
      orderDate: backendOrder.createdAt || currentSnapshot.orderDate
    };
    localStorage.setItem("mic_last_order_details", JSON.stringify(merged));
    return merged;
  } catch (err) {
    return currentSnapshot;
  }
}

function startLiveOrderSync(initialDetails) {
  if (!initialDetails?.orderId) return;

  const syncNow = async () => {
    const latest = await refreshOrderFromBackend(initialDetails.orderId, initialDetails);
    populateUI(latest);
    applySuccessTrackerState(latest);
  };

  syncNow();
  if (liveOrderPollTimer) clearInterval(liveOrderPollTimer);
  liveOrderPollTimer = setInterval(syncNow, 15000);
}

// Fallback mockup data when page is loaded directly
function getFallbackMockupData() {
  const today = new Date();
  const delivery = new Date();
  delivery.setDate(today.getDate() + 5);
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  
  return {
    orderId: "MIC-48291-2026",
    templateId: "card1",
    documentTitle: "Aditya & Riya's Wedding Card",
    quantity: 100,
    paperStock: "glossy",
    envelopeOption: "crimson",
    basePrice: 8.0,
    cardsTotal: 800.0,
    paperTotal: 200.0,
    envelopeTotal: 0.0,
    subtotal: 1000.0,
    shippingCost: 0.0,
    gstTax: 180.0,
    grandTotal: 1180.0,
    deliveryDate: delivery.toLocaleDateString('en-US', options),
    paymentMode: "UPI (Google Pay)",
    data: {
      fields: {},
      events: {},
      styles: {}
    },
    shippingAddress: {
      fullName: "Aditya Sharma",
      phone: "9876543210",
      emergencyPhone: "9876543211",
      address: "Flat 402, Spring Valley Apts, Sector 45",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122003"
    }
  };
}

// Populate the textual fields in the HTML
function populateUI(details) {
  const paperNames = {
    'matte': 'Matte Finish',
    'glossy': 'Glossy Finish',
    'linen': 'Premium Linen',
    'metallic': 'Metallic Gold Sparkle'
  };
  
  const envelopeNames = {
    'none': 'No Envelope',
    'pink': 'Blush Pink Envelope',
    'crimson': 'Crimson Red Envelope',
    'gold': 'Royal Gold Envelope',
    'velvet': 'Velvet Maroon Envelope'
  };
  
  // Header and tracker
  document.getElementById('summary-order-id').textContent = details.orderId || 'MIC-XXXXX-2026';
  
  const today = new Date();
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const confirmedAt = details.orderDate || details.createdAt || today;
  document.getElementById('track-confirm-date').textContent = new Date(confirmedAt).toLocaleDateString('en-US', options);
  
  const estDeliveryText = details.deliveryDate || 'Pending';
  document.getElementById('track-delivery-date').textContent = `Estimated: ${estDeliveryText}`;
  
  // Order Summary Card
  document.getElementById('summary-doc-title').textContent = details.documentTitle || 'Wedding Card';
  document.getElementById('summary-qty').textContent = details.quantity || 0;
  document.getElementById('summary-paper').textContent = paperNames[details.paperStock] || details.paperStock || 'Standard';
  document.getElementById('summary-envelope').textContent = envelopeNames[details.envelopeOption] || details.envelopeOption || 'No Envelope';
  
  // Shipping Card
  const addr = details.shippingAddress || {};
  document.getElementById('summary-shipping-name').textContent = addr.fullName || 'Valued Customer';
  
  const fullAddressStr = [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
  document.getElementById('summary-shipping-address').textContent = fullAddressStr || 'Address details missing';
  document.getElementById('summary-shipping-phone').textContent = addr.phone || 'N/A';
  
  if (addr.emergencyPhone) {
    document.getElementById('summary-shipping-emergency').textContent = addr.emergencyPhone;
    document.getElementById('summary-emergency-row').style.display = 'block';
  } else {
    document.getElementById('summary-emergency-row').style.display = 'none';
  }
  
  document.getElementById('summary-est-delivery').textContent = estDeliveryText;
  
  // Invoice Details
  const sub = details.subtotal || 0;
  const ship = details.shippingCost || 0;
  const tax = details.gstTax || 0;
  const total = details.grandTotal || 0;
  
  document.getElementById('invoice-subtotal').textContent = `₹${sub.toFixed(2)}`;
  document.getElementById('invoice-shipping').textContent = ship === 0 ? 'FREE' : `₹${ship.toFixed(2)}`;
  document.getElementById('invoice-tax').textContent = `₹${tax.toFixed(2)}`;
  document.getElementById('invoice-total').textContent = `₹${total.toFixed(2)}`;
  document.getElementById('invoice-pay-mode').textContent = details.paymentMode || 'Credit / Debit Card';
}

// Setup preview iframe and synchronize customized template data
async function setupIframePreview(details) {
  await renderSuccessPreview(details);
}

// Interactive Star Rating Component
let selectedRating = 0;

function setupStarRating() {
  const stars = document.querySelectorAll('.star-btn');
  const submitBtn = document.getElementById('btn-submit-feedback');
  
  if (!stars || stars.length === 0) return;
  
  stars.forEach(star => {
    // Hover over a star
    star.addEventListener('mouseenter', () => {
      const hoverValue = parseInt(star.getAttribute('data-value'));
      highlightStars(hoverValue);
    });
    
    // Leave hover
    star.addEventListener('mouseleave', () => {
      highlightStars(selectedRating);
    });
    
    // Select rating click
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.getAttribute('data-value'));
      highlightStars(selectedRating);
      
      if (submitBtn) {
        submitBtn.removeAttribute('disabled');
      }
    });
  });
}

function highlightStars(count) {
  const stars = document.querySelectorAll('.star-btn');
  stars.forEach(star => {
    const val = parseInt(star.getAttribute('data-value'));
    const icon = star.querySelector('i');
    if (val <= count) {
      star.classList.add('active');
      if (icon) {
        icon.className = 'fa-solid fa-star';
      }
    } else {
      star.classList.remove('active');
      if (icon) {
        icon.className = 'fa-regular fa-star';
      }
    }
  });
}

// Handle feedback form submission
function submitFeedback(event) {
  event.preventDefault();
  
  const form = document.getElementById('feedback-form');
  const comment = document.getElementById('feedback-comment').value.trim();
  const successMsg = document.getElementById('feedback-success-msg');
  const submitBtn = document.getElementById('btn-submit-feedback');
  
  if (selectedRating === 0) {
    showToast("Please select a star rating first.", "error");
    return;
  }
  
  if (submitBtn) {
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.textContent = 'Submitting...';
  }

  // Load details to get orderId
  const savedDetailsStr = localStorage.getItem("mic_last_order_details");
  let orderId = "mock-id";
  if (savedDetailsStr) {
    try {
      const parsed = JSON.parse(savedDetailsStr);
      if (parsed && parsed.orderId) {
        orderId = parsed.orderId;
      }
    } catch(e) {
      console.error(e);
    }
  }
  
  // Submit to backend Mongo database
  fetch(`${BACKEND_URL}/api/orders/${orderId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rating: selectedRating,
      comment: comment
    })
  })
  .then(res => res.json())
  .then(data => {
    if (form) form.style.display = 'none';
    if (successMsg) {
      successMsg.style.display = 'block';
      successMsg.style.opacity = '0';
      setTimeout(() => {
        successMsg.style.transition = 'opacity 0.4s ease';
        successMsg.style.opacity = '1';
      }, 50);
    }
    showToast("Feedback submitted! Thank you for sharing your experience.", "success");
  })
  .catch(err => {
    console.error("Error submitting feedback:", err);
    // fallback simulation
    if (form) form.style.display = 'none';
    if (successMsg) {
      successMsg.style.display = 'block';
      successMsg.style.opacity = '1';
    }
    showToast("Feedback simulation submitted (Backend offline).", "info");
  });
}

// Local print Invoice trigger
function printInvoice() {
  window.print();
}

// Toast helper function
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideUpToast 0.3s reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Expose submitFeedback and printInvoice to window
window.submitFeedback = submitFeedback;
window.printInvoice = printInvoice;
window.showToast = showToast;

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
    // Fetch from MongoDB
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
      if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('/')) {
        avatarUrl = '../' + avatarUrl;
      }
      if (avatarSpan) avatarSpan.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      if (popupAvatar) popupAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    } else {
      const initial = displayName.substring(0, 1).toUpperCase();
      if (avatarSpan) avatarSpan.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f43f5e; color:#fff; font-weight:700; border-radius:50%;">${initial}</div>`;
      if (popupAvatar) popupAvatar.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f43f5e; color:#fff; font-weight:700; border-radius:50%;">${initial}</div>`;
    }
  } else {
    if (avatarBtn) avatarBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'flex';
  }
}

// Toggle Profile Popup
window.addEventListener('DOMContentLoaded', () => {
  const userMenuBtn = document.getElementById('builderUserMenuBtn');
  const userPopup = document.getElementById('builderUserPopup');

  if (userMenuBtn && userPopup) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userPopup.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      userPopup.classList.remove('show');
    });
  }

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
window.showLogoutConfirm = function() {
  const popup = document.getElementById('logout-confirm-popup');
  if (popup) popup.style.display = 'block';
}

window.closeLogoutConfirm = function() {
  const popup = document.getElementById('logout-confirm-popup');
  if (popup) popup.style.display = 'none';
}

window.executeLogout = function() {
  closeLogoutConfirm();
  if (firebaseAuth && firebaseConfig) {
    firebaseAuth.signOut(firebaseConfig.auth).then(() => {
      showToast("Logged out successfully", "success");
      setTimeout(() => {
        window.location.href = '../template-dashboard.html';
      }, 1000);
    }).catch(err => {
      console.error("Signout error:", err);
      showToast("Logout failed", "error");
    });
  }
}
