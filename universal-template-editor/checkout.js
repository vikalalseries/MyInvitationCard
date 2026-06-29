/* ════════════════════════════════════════════════════════════
   checkout.js - Checkout & Payment Page Logic
   ════════════════════════════════════════════════════════════ */

// Order Configuration State (Default Fallback)
let orderConfig = {
  templateId: 'card1',
  documentTitle: 'Wedding Card',
  quantity: 100,
  paperStock: 'matte',
  envelopeOption: 'standard',
  unitPrice: 15.00,
  data: { fields: {}, events: {}, styles: {} }
};

let config = null; // Config state for resolving template defaults
let templateDbConfig = null; // Dynamic template settings from backend DB

// Checkout state
let shippingSpeed = 'standard';
let activePaymentMethod = 'upi';
let selectedUpiBrand = 'gpay';
let activeUpiType = 'qr';
let qrTimerInterval = null;

// Delivery Date variables
let standardDeliveryDate = '';
let expressDeliveryDate = '';

window.addEventListener('DOMContentLoaded', async () => {
  // 1. Retrieve order configuration from localStorage
  loadOrderConfig();
  
  // Load template config first to resolve defaults
  await loadTemplateConfig();
  
  // Fetch dynamic template settings from backend
  try {
    const dbRes = await fetch(`http://localhost:5000/api/templates/${orderConfig.templateId}`);
    if (dbRes.ok) {
      const dbData = await dbRes.json();
      if (dbData.success && dbData.template) {
        templateDbConfig = dbData.template;
        // Disable express delivery if template doesn't support it
        if (templateDbConfig.expressDeliveryAvailable === false) {
          const expressRadio = document.querySelector('input[name="shipping-speed"][value="express"]');
          if (expressRadio) {
            expressRadio.disabled = true;
            const expressCard = expressRadio.closest('.ship-option-card');
            if (expressCard) {
              expressCard.style.opacity = '0.4';
              expressCard.style.pointerEvents = 'none';
              expressCard.title = 'Express delivery is not available for this template';
            }
          }
          // Force standard shipping
          shippingSpeed = 'standard';
          const stdRadio = document.querySelector('input[name="shipping-speed"][value="standard"]');
          if (stdRadio) stdRadio.checked = true;
        }
      }
    }
  } catch (dbErr) {
    console.warn("Could not load template settings from backend:", dbErr.message);
  }
  
  // 2. Initialize UI summary items
  initializeSummaryUI();
  
  // 3. Set up input formatters
  setupCardFormatters();
  
  // 4. Calculate initial dates
  calculateDeliveryDates();
  
  // 5. Run initial billing calculation
  recalculateBill();
  
  // 6. Start QR Code countdown timer
  startQrCountdown();

  // 7. Pre-populate shipping address if saved in profile/localStorage
  const savedAddress = localStorage.getItem("mic_shipping_address");
  if (savedAddress) {
    try {
      const addr = JSON.parse(savedAddress);
      if (addr) {
        if (document.getElementById('full-name')) document.getElementById('full-name').value = addr.fullName || '';
        if (document.getElementById('phone-num')) document.getElementById('phone-num').value = addr.phone || '';
        if (document.getElementById('address-line1')) document.getElementById('address-line1').value = addr.address || '';
        if (document.getElementById('address-line2')) document.getElementById('address-line2').value = addr.address2 || '';
        if (document.getElementById('city-input')) document.getElementById('city-input').value = addr.city || '';
        if (document.getElementById('state-input')) document.getElementById('state-input').value = addr.state || '';
        if (document.getElementById('pincode-input')) document.getElementById('pincode-input').value = addr.pincode || '';
      }
    } catch (e) {
      console.error("Error parsing saved shipping address:", e);
    }
  }
});

// Load template config
async function loadTemplateConfig() {
  try {
    const response = await fetch(`templates/${orderConfig.templateId}/config.json`);
    if (response.ok) {
      config = await response.json();
    }
  } catch (err) {
    console.error("Failed to load template config:", err);
  }
}

// Load configuration
function loadOrderConfig() {
  const savedOrderStr = localStorage.getItem("mic_current_order_config");
  if (savedOrderStr) {
    try {
      const parsed = JSON.parse(savedOrderStr);
      if (parsed) {
        orderConfig = parsed;
      }
    } catch (e) {
      console.error("Error parsing order configuration:", e);
    }
  } else {
    // Try falling back to default VLS
    const savedVlsStr = localStorage.getItem("savedVlsData");
    if (savedVlsStr) {
      try {
        const parsed = JSON.parse(savedVlsStr);
        orderConfig.templateId = parsed.templateId || 'card1';
        orderConfig.documentTitle = parsed.documentTitle || 'Wedding Card';
        orderConfig.data = parsed.data || {};
      } catch (e) {}
    }
  }
}

// Populate UI components with parsed details
function initializeSummaryUI() {
  const titleInput = document.getElementById('doc-title-input');
  if (titleInput) {
    titleInput.value = orderConfig.documentTitle;
  }
  document.getElementById('checkout-card-title').textContent = orderConfig.documentTitle;
  document.getElementById('checkout-qty-summary').textContent = orderConfig.quantity;
  
  // Capitalize stock names
  const paperNames = { matte: 'Matte Cardboard', glossy: 'Premium Glossy', linen: 'Elegant Textured Linen', metallic: 'Metallic Gold Foil' };
  document.getElementById('checkout-paper-summary').textContent = paperNames[orderConfig.paperStock] || orderConfig.paperStock;
  
  const envNames = { standard: 'Crimson envelope', velvet: 'Premium Velvet envelope', none: 'No Envelopes' };
  document.getElementById('checkout-envelope-summary').textContent = envNames[orderConfig.envelopeOption] || orderConfig.envelopeOption;
  
  // Setup miniature preview iframe
  const iframe = document.getElementById('iframe-checkout-preview');
  if (iframe) {
    iframe.src = `templates/${orderConfig.templateId}/template.html`;
    iframe.onload = () => {
      // Sync customized texts resolving defaults
      syncCheckoutIframeData(iframe);
      
      // Inject CSS to crop only Section 1 as preview thumb
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const style = doc.createElement('style');
      style.textContent = `
        body { background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        .card { padding: 0 !important; margin: 0 !important; gap: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; width: 21.5cm !important; height: 8.5cm !important; min-height: 8.5cm !important; overflow: hidden !important; }
        .sec2 { display: none !important; }
        .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; position: absolute !important; }
      `;
      doc.head.appendChild(style);
    };
  }
}

// Send resolved data to checkout preview iframe
function syncCheckoutIframeData(iframe) {
  if (iframe && iframe.contentWindow) {
    const resolvedData = {
      fields: {},
      events: {},
      styles: orderConfig.data.styles || {}
    };
    
    if (config) {
      if (config.fields) {
        config.fields.forEach(f => {
          const val = (orderConfig.data.fields && orderConfig.data.fields[f.id]);
          resolvedData.fields[f.id] = (val === null || val === undefined) ? (f.default || '') : val;
        });
      }
      if (config.events) {
        config.events.forEach(e => {
          const currentEv = (orderConfig.data.events && orderConfig.data.events[e.id]) || {};
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
      resolvedData.fields = orderConfig.data.fields || {};
      resolvedData.events = orderConfig.data.events || {};
    }
    
    iframe.contentWindow.postMessage({
      type: 'UPDATE_TEMPLATE_DATA',
      data: resolvedData
    }, '*');
  }
}

// Calculate delivery estimate based on current date
function calculateDeliveryDates(isMetro = false) {
  const today = new Date();
  
  // Standard delivery: 5-7 days
  const stdMin = new Date(today);
  stdMin.setDate(today.getDate() + (isMetro ? 4 : 5));
  const stdMax = new Date(today);
  stdMax.setDate(today.getDate() + (isMetro ? 5 : 7));
  
  // Express delivery: 2-3 days
  const expMin = new Date(today);
  expMin.setDate(today.getDate() + (isMetro ? 2 : 2));
  const expMax = new Date(today);
  expMax.setDate(today.getDate() + (isMetro ? 3 : 3));
  
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  
  standardDeliveryDate = `${stdMin.toLocaleDateString('en-US', options)} - ${stdMax.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  expressDeliveryDate = `${expMin.toLocaleDateString('en-US', options)} - ${expMax.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  // Update labels
  document.getElementById('standard-delivery-est').textContent = `Delivered by ${standardDeliveryDate}.`;
  document.getElementById('express-delivery-est').textContent = `Delivered by ${expressDeliveryDate}. Priority dispatch tracking.`;
}

// Pincode lookup simulation
function calculateDeliveryEstimate(pincode) {
  const cleaned = pincode.replace(/\D/g, '');
  if (cleaned.length === 6) {
    // Metro check: Common Indian metros start numbers
    // Delhi (11), Mumbai (40), Kolkata (70), Chennai (60), Bangalore (56), Hyderabad (50)
    const prefix = cleaned.substring(0, 2);
    const metros = ['11', '40', '70', '60', '56', '50', '22']; // 22 is Varanasi area too!
    const isMetro = metros.includes(prefix);
    
    // Autofill city/state mock lookup
    const cityInput = document.getElementById('city-input');
    const stateInput = document.getElementById('state-input');
    
    if (cleaned.startsWith('11')) { cityInput.value = 'New Delhi'; stateInput.value = 'Delhi'; }
    else if (cleaned.startsWith('40')) { cityInput.value = 'Mumbai'; stateInput.value = 'Maharashtra'; }
    else if (cleaned.startsWith('70')) { cityInput.value = 'Kolkata'; stateInput.value = 'West Bengal'; }
    else if (cleaned.startsWith('60')) { cityInput.value = 'Chennai'; stateInput.value = 'Tamil Nadu'; }
    else if (cleaned.startsWith('56')) { cityInput.value = 'Bengaluru'; stateInput.value = 'Karnataka'; }
    else if (cleaned.startsWith('50')) { cityInput.value = 'Hyderabad'; stateInput.value = 'Telangana'; }
    else if (cleaned.startsWith('22')) { cityInput.value = 'Varanasi'; stateInput.value = 'Uttar Pradesh'; }
    
    calculateDeliveryDates(isMetro);
    toast("Delivery pincode verified successfully!", "s");
  }
}

// Handle shipping method changes
function updateShippingMethod(el) {
  shippingSpeed = el.value;
  
  // Toggle visual styles
  document.querySelectorAll('input[name="shipping-speed"]').forEach(radio => {
    radio.closest('.ship-option-card')?.classList.remove('checked');
  });
  el.closest('.ship-option-card')?.classList.add('checked');
  
  recalculateBill();
}

// Bill Calculations
function recalculateBill() {
  const qty = orderConfig.quantity || 100;
  const designTitle = orderConfig.documentTitle || "Wedding Card";
  
  // Update simplified overview labels
  const overviewDesign = document.getElementById('overview-design-name');
  if (overviewDesign) overviewDesign.textContent = designTitle;
  
  const overviewQty = document.getElementById('overview-qty');
  if (overviewQty) overviewQty.textContent = `${qty} Cards`;
  
  const overviewSpeed = document.getElementById('overview-shipping-speed');
  if (overviewSpeed) {
    overviewSpeed.textContent = shippingSpeed === 'standard' ? 'Standard Courier (FREE)' : 'Express Priority (+₹350.00)';
  }
}

// ── PAYMENT METHODS TABS ──
function switchPaymentMethod(method) {
  activePaymentMethod = method;
  
  // Toggle tab buttons visual classes
  document.querySelectorAll('.pay-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.closest('.pay-tab-btn')?.classList.add('active');
  
  // Toggle panes
  document.querySelectorAll('.pay-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById(`pay-pane-${method}`).classList.add('active');
}

// UPI Brand tiles selection
function selectUpiBrand(brand) {
  selectedUpiBrand = brand;
  document.querySelectorAll('.upi-brand-tile').forEach(tile => {
    tile.classList.remove('active');
  });
  
  // Use class selector instead of window.event for robustness
  const activeTile = document.querySelector(`.upi-brand-tile.tile-${brand}`);
  if (activeTile) {
    activeTile.classList.add('active');
  }
  
  // Update placeholder based on selected brand, keeping input blank
  const upiInput = document.getElementById('upi-id-input');
  if (upiInput) {
    upiInput.value = ''; // Keep it blank as requested
    
    // Update dynamic focus highlight classes
    upiInput.classList.remove('gpay-focus', 'phonepe-focus', 'paytm-focus');
    upiInput.classList.add(`${brand}-focus`);
    
    if (brand === 'gpay') upiInput.placeholder = 'username@okaxis';
    else if (brand === 'phonepe') upiInput.placeholder = 'mobileNumber@ybl';
    else if (brand === 'paytm') upiInput.placeholder = 'mobileNumber@paytm';
  }
}

// UPI VPA Quick-fill chip application
function applyUpiChip(handle) {
  const upiInput = document.getElementById('upi-id-input');
  if (!upiInput) return;
  
  let val = upiInput.value.trim();
  if (!val) {
    // If empty, pre-fill with a generic username placeholder
    upiInput.value = 'username' + handle;
  } else {
    // Replace handle if it already exists, otherwise append it
    const atIndex = val.indexOf('@');
    if (atIndex !== -1) {
      val = val.substring(0, atIndex);
    }
    upiInput.value = val + handle;
  }
  
  upiInput.focus();
}

// Switch UPI sub-tab view (QR vs VPA)
function switchUpiType(type) {
  activeUpiType = type;
  
  // Toggle sub-tab button active classes
  document.getElementById('upi-btn-qr').classList.toggle('active', type === 'qr');
  document.getElementById('upi-btn-vpa').classList.toggle('active', type === 'vpa');
  
  // Toggle sub-pane visibility
  document.getElementById('upi-sub-pane-qr').classList.toggle('active', type === 'qr');
  document.getElementById('upi-sub-pane-vpa').classList.toggle('active', type === 'vpa');
  
  // Trigger countdown timer restart if switching to QR
  if (type === 'qr') {
    startQrCountdown();
  } else {
    if (qrTimerInterval) clearInterval(qrTimerInterval);
  }
}

// Manage QR code expiration timer countdown
function startQrCountdown() {
  if (qrTimerInterval) clearInterval(qrTimerInterval);
  let timeRemaining = 300; // 5 minutes
  const timerDisplay = document.getElementById('qr-countdown');
  if (!timerDisplay) return;
  
  // Reset style in case it was previously EXPIRED
  timerDisplay.style.color = '';
  timerDisplay.textContent = '05:00';
  
  qrTimerInterval = setInterval(() => {
    timeRemaining--;
    if (timeRemaining <= 0) {
      clearInterval(qrTimerInterval);
      timerDisplay.textContent = 'EXPIRED';
      timerDisplay.style.color = 'var(--rose-dark)';
      return;
    }
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

// Format Credit Card input fields
function setupCardFormatters() {
  const cardNum = document.getElementById('card-number');
  const cardExpiry = document.getElementById('card-expiry');
  const cardCvv = document.getElementById('card-cvv');
  
  if (cardNum) {
    cardNum.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      let formatted = '';
      for (let i = 0; i < val.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += val[i];
      }
      e.target.value = formatted.substring(0, 19);
    });
  }
  
  if (cardExpiry) {
    cardExpiry.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      if (val.length >= 2) {
        e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
      } else {
        e.target.value = val;
      }
    });
  }
}

// ── PROCEED TO PAYMENT SUMMARY PAGE ──
function proceedToPaymentPage() {
  // 1. Verify Shipping fields are completely filled
  const fullName = document.getElementById('full-name').value.trim();
  const phone = document.getElementById('phone-num').value.trim();
  const address = document.getElementById('address-line1').value.trim();
  const address2 = document.getElementById('address-line2').value.trim();
  const city = document.getElementById('city-input').value.trim();
  const state = document.getElementById('state-input').value.trim();
  const pincode = document.getElementById('pincode-input').value.trim();
  
  if (!fullName || !phone || !address || !city || !state || !pincode) {
    showError("Please fill in all required shipping address fields (*)");
    // Scroll address card into view
    document.getElementById('shipping-form').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  
  if (phone.length < 10) {
    showError("Please enter a valid 10-digit mobile number");
    return;
  }
  
  const emergencyPhone = document.getElementById('emergency-phone-num').value.trim();
  if (emergencyPhone && emergencyPhone.length < 10) {
    showError("Please enter a valid 10-digit emergency mobile number");
    return;
  }
  
  if (pincode.length < 6) {
    showError("Please enter a valid 6-digit postal pincode");
    return;
  }
  
  // Validate state/district availability against template restrictions
  if (templateDbConfig) {
    const allowedStates = templateDbConfig.availableStates || [];
    const allowedDistricts = templateDbConfig.availableDistricts || [];
    if (allowedStates.length > 0 && !allowedStates.map(s => s.toLowerCase()).includes(state.toLowerCase())) {
      showError(`This design template is not available for delivery in ${state}. Available states: ${allowedStates.join(', ')}`);
      document.getElementById('state-input').focus();
      return;
    }
    if (allowedDistricts.length > 0 && !allowedDistricts.map(d => d.toLowerCase()).includes(city.toLowerCase())) {
      showError(`This design template is not available for delivery in ${city}. Available districts: ${allowedDistricts.join(', ')}`);
      document.getElementById('city-input').focus();
      return;
    }
  }
  
  // 2. Save current order and shipping details to localStorage
  const shippingDetails = {
    fullName,
    phone,
    emergencyPhone,
    address,
    address2,
    city,
    state,
    pincode
  };
  
  localStorage.setItem("mic_shipping_address", JSON.stringify(shippingDetails));
  localStorage.setItem("mic_shipping_speed", shippingSpeed);
  localStorage.setItem("mic_current_order_config", JSON.stringify(orderConfig));
  
  // 3. Redirect to payment summary page
  window.location.href = "payment.html";
}

// Receipt print trigger
function printReceipt() {
  window.print();
}

// Redirect back to dashboard
function continueToDashboard() {
  // Clear print order cache to prevent duplicate loads
  localStorage.removeItem("mic_current_order_config");
  window.location.href = "../template-dashboard.html";
}

// Pre-fill fields for immediate convenience
function autofillAddress() {
  document.getElementById('full-name').value = 'Amit Maurya';
  document.getElementById('phone-num').value = '9876543210';
  document.getElementById('address-line1').value = 'Plot No 123, Maurya Vihar';
  document.getElementById('pincode-input').value = '221001';
  document.getElementById('city-input').value = 'Varanasi';
  document.getElementById('state-input').value = 'Uttar Pradesh';
}

// ── TOAST NOTIFICATIONS ──
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

// ── REUSABLE UI MESSAGES & LOADERS ──
function showSuccess(message) {
  toast(message, 's');
}

function showError(message) {
  toast(message, 'e');
}

function showLoading() {
  const modal = document.getElementById('modal-processing');
  const progress = document.getElementById('auth-progress-bar');
  const modalTitle = modal ? modal.querySelector('h2') : null;
  
  if (modalTitle) {
    modalTitle.textContent = "Verifying Payment...";
  }
  if (modal) {
    modal.classList.add('active');
  }
  if (progress) {
    progress.style.width = '75%';
    progress.style.transition = 'width 15s cubic-bezier(0.1, 0.8, 0.25, 1)';
  }
}

function hideLoading() {
  const modal = document.getElementById('modal-processing');
  const progress = document.getElementById('auth-progress-bar');
  if (modal) {
    modal.classList.remove('active');
  }
  if (progress) {
    progress.style.width = '0%';
    progress.style.transition = 'none';
  }
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
      const res = await fetch(`http://localhost:5000/api/users/${user.uid}`);
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

// ── GEOLOCATION & SWIGGY-STYLE MAP PICKER ──
let mapPickerInstance = null;
let currentTracedAddress = null;

function traceLocation() {
  const modal = document.getElementById('map-picker-modal');
  if (modal) {
    modal.classList.add('active');
  }

  // Request browser GPS coordinates
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        initMapPicker(position.coords.latitude, position.coords.longitude);
        setTimeout(() => {
          if (mapPickerInstance) mapPickerInstance.invalidateSize();
        }, 150);
      },
      (error) => {
        console.warn("Geolocation coordinate acquisition failed:", error);
        // Default center: India (Madhya Pradesh area)
        initMapPicker(22.973, 78.656, 5);
        setTimeout(() => {
          if (mapPickerInstance) mapPickerInstance.invalidateSize();
        }, 150);
        toast("Could not access GPS. Please drag map to pin your address.", "w");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  } else {
    initMapPicker(22.973, 78.656, 5);
    setTimeout(() => {
      if (mapPickerInstance) mapPickerInstance.invalidateSize();
    }, 150);
    toast("Geolocation not supported. Please drag map to pin your address.", "w");
  }
}

function closeMapPicker() {
  const modal = document.getElementById('map-picker-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function initMapPicker(lat, lon, zoom = 15) {
  if (typeof L === 'undefined') {
    console.error("Leaflet mapping library not loaded.");
    return;
  }

  const canvas = document.getElementById('map-picker-canvas');
  if (!canvas) return;

  if (!mapPickerInstance) {
    mapPickerInstance = L.map('map-picker-canvas', {
      zoomControl: true
    }).setView([lat, lon], zoom);

    // Standard OpenStreetMap tiles (reliable and requires no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapPickerInstance);

    // Bind dragging events (like Swiggy/Zomato map picker)
    mapPickerInstance.on('movestart', () => {
      document.getElementById('map-picker-address-text').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Selecting location...';
      document.getElementById('btn-confirm-location').disabled = true;
    });

    mapPickerInstance.on('moveend', () => {
      onMapMoveEnd();
    });
  } else {
    mapPickerInstance.setView([lat, lon], zoom);
    setTimeout(() => {
      mapPickerInstance.invalidateSize();
    }, 100);
  }

  // Trigger initial geocode lookup for starting coordinates
  onMapMoveEnd();
}

async function onMapMoveEnd() {
  if (!mapPickerInstance) return;
  const center = mapPickerInstance.getCenter();
  const addressText = document.getElementById('map-picker-address-text');
  const confirmBtn = document.getElementById('btn-confirm-location');

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&addressdetails=1`);
    if (response.ok) {
      const data = await response.json();
      const addressObj = data.address || {};
      
      const street = addressObj.road || addressObj.suburb || addressObj.neighbourhood || '';
      const houseNumber = addressObj.house_number || '';
      const line1 = (houseNumber ? houseNumber + ', ' : '') + street;
      const displayAddress = data.display_name || 'Selected Location';

      if (addressText) addressText.textContent = displayAddress;
      if (confirmBtn) confirmBtn.disabled = false;

      currentTracedAddress = {
        line1: line1 || addressObj.amenity || addressObj.shop || 'Selected Location',
        city: addressObj.city || addressObj.town || addressObj.village || addressObj.county || '',
        state: addressObj.state || '',
        pincode: (addressObj.postcode || '').replace(/\s+/g, '').substring(0, 6)
      };
    } else {
      if (addressText) addressText.textContent = "Unable to resolve coordinates. Move pin slightly.";
      if (confirmBtn) confirmBtn.disabled = true;
    }
  } catch (err) {
    console.error("Reverse geocoding Nominatim error:", err);
    if (addressText) addressText.textContent = "Network error. Unable to fetch details.";
    if (confirmBtn) confirmBtn.disabled = true;
  }
}

function confirmMapLocation() {
  if (!currentTracedAddress) return;

  const addrInput = document.getElementById('address-line1');
  const cityInput = document.getElementById('city-input');
  const stateInput = document.getElementById('state-input');
  const pincodeInput = document.getElementById('pincode-input');

  if (addrInput) addrInput.value = currentTracedAddress.line1;
  if (cityInput) cityInput.value = currentTracedAddress.city;
  if (stateInput) stateInput.value = currentTracedAddress.state;

  if (pincodeInput) {
    if (currentTracedAddress.pincode && currentTracedAddress.pincode.length === 6) {
      pincodeInput.value = currentTracedAddress.pincode;
      verifyPincodeAndAutofill(currentTracedAddress.pincode);
    } else {
      pincodeInput.value = '';
      const feedback = document.getElementById('pincode-feedback');
      if (feedback) feedback.style.display = 'none';
    }
  }

  closeMapPicker();
  toast("Delivery address updated from pin location!", "s");
}

// ── PINCODE VERIFICATION & AUTOFILL CITY/STATE (api.postalpincode.in) ──
async function verifyPincodeAndAutofill(pincode) {
  const cleaned = pincode.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  const cityInput = document.getElementById('city-input');
  const stateInput = document.getElementById('state-input');
  const feedback = document.getElementById('pincode-feedback');

  if (cleaned.length !== 6) {
    if (feedback) feedback.style.display = 'none';
    return;
  }

  if (feedback) {
    feedback.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying pincode...';
    feedback.className = 'pincode-feedback loading';
    feedback.style.display = 'block';
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        const city = postOffice.District || postOffice.Division || '';
        const state = postOffice.State || '';
        
        if (cityInput) cityInput.value = city;
        if (stateInput) stateInput.value = state;
        
        if (feedback) {
          feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified: ${city}, ${state}`;
          feedback.className = 'pincode-feedback success';
        }
        
        // Recalculate bill and dates
        calculateDeliveryEstimate(cleaned);
      } else {
        if (feedback) {
          feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Invalid Pincode. Please verify.';
          feedback.className = 'pincode-feedback error';
        }
        if (cityInput) cityInput.value = '';
        if (stateInput) stateInput.value = '';
      }
    } else {
      if (feedback) feedback.style.display = 'none';
    }
  } catch (err) {
    console.error("Pincode API geocode error:", err);
    if (feedback) feedback.style.display = 'none';
  }
}
