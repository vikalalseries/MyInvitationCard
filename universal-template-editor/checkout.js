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

// Checkout state
let shippingSpeed = 'standard';
let activePaymentMethod = 'upi';
let selectedUpiBrand = 'gpay';

// Delivery Date variables
let standardDeliveryDate = '';
let expressDeliveryDate = '';

// ── INITIALIZATION ──
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Retrieve order configuration from localStorage
  loadOrderConfig();
  
  // Load template config first to resolve defaults
  await loadTemplateConfig();
  
  // 2. Initialize UI summary items
  initializeSummaryUI();
  
  // 3. Set up input formatters
  setupCardFormatters();
  
  // 4. Calculate initial dates
  calculateDeliveryDates();
  
  // 5. Run initial billing calculation
  recalculateBill();
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
  const qty = orderConfig.quantity;
  
  // 1. Base unit card price tier
  let basePrice = 20.00;
  if (qty >= 500) basePrice = 10.00;
  else if (qty >= 300) basePrice = 13.00;
  else if (qty >= 150) basePrice = 16.00;
  
  const cardsTotal = qty * basePrice;
  
  // 2. Paperstock addons
  let paperUnitCost = 0.00;
  let paperName = 'Matte';
  switch (orderConfig.paperStock) {
    case 'glossy': paperUnitCost = 2.00; paperName = 'Premium Glossy'; break;
    case 'linen': paperUnitCost = 5.00; paperName = 'Textured Linen'; break;
    case 'metallic': paperUnitCost = 8.00; paperName = 'Gold Foil Metallic'; break;
  }
  const paperTotal = qty * paperUnitCost;
  
  // 3. Envelope option addons
  let envelopeUnitCost = 0.00;
  let envelopeName = 'Standard Crimson';
  switch (orderConfig.envelopeOption) {
    case 'velvet': envelopeUnitCost = 5.00; envelopeName = 'Premium Velvet Silk'; break;
    case 'none': envelopeUnitCost = -2.00; envelopeName = 'Omitted Envelopes'; break;
  }
  const envelopeTotal = qty * envelopeUnitCost;
  
  // Subtotal before shipping/tax
  const subtotal = cardsTotal + paperTotal + envelopeTotal;
  
  // 4. Shipping Calculation
  // Standard shipping is free for orders above ₹2000, otherwise ₹150
  let shippingCost = 0.00;
  if (shippingSpeed === 'standard') {
    if (subtotal < 2000) {
      shippingCost = 150.00;
      document.getElementById('standard-shipping-label').textContent = '₹150.00';
    } else {
      shippingCost = 0.00;
      document.getElementById('standard-shipping-label').textContent = 'FREE';
    }
  } else {
    // Express Shipping is flat rate ₹350
    shippingCost = 350.00;
  }
  
  // 5. GST (18%) calculated on subtotal + shipping
  const taxBase = subtotal + shippingCost;
  const gstTax = taxBase * 0.18;
  
  // 6. Grand total
  const grandTotal = subtotal + shippingCost + gstTax;
  
  // Update bill UI Labels
  document.getElementById('bill-qty').textContent = qty;
  document.getElementById('bill-base-price').textContent = basePrice.toFixed(2);
  document.getElementById('bill-cards-total').textContent = cardsTotal.toFixed(2);
  
  document.getElementById('bill-paper-name').textContent = paperName;
  document.getElementById('bill-paper-total').textContent = paperTotal.toFixed(2);
  
  document.getElementById('bill-envelope-name').textContent = envelopeName;
  document.getElementById('bill-envelope-total').textContent = envelopeTotal.toFixed(2);
  
  document.getElementById('bill-shipping-val').textContent = shippingCost === 0 ? 'FREE' : `₹${shippingCost.toFixed(2)}`;
  document.getElementById('bill-tax-val').textContent = gstTax.toFixed(2);
  document.getElementById('bill-grand-total').textContent = grandTotal.toFixed(2);
  
  // Update Payment button label
  document.getElementById('btn-pay-total').textContent = grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  
  const activeTile = window.event ? window.event.target.closest('.upi-brand-tile') : null;
  if (activeTile) {
    activeTile.classList.add('active');
  }
  
  // Update placeholder based on selected brand, keeping input blank
  const upiInput = document.getElementById('upi-id-input');
  if (upiInput) {
    upiInput.value = ''; // Keep it blank as requested
    if (brand === 'gpay') upiInput.placeholder = 'e.g. username@okaxis';
    else if (brand === 'phonepe') upiInput.placeholder = 'e.g. 9876543210@ybl';
    else if (brand === 'paytm') upiInput.placeholder = 'e.g. 9876543210@paytm';
  }
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

// ── PAYMENT VERIFICATION & SIMULATION ──
function triggerCheckoutPayment() {
  // 1. Verify Shipping fields are completely filled
  const fullName = document.getElementById('full-name').value.trim();
  const phone = document.getElementById('phone-num').value.trim();
  const address = document.getElementById('address-line1').value.trim();
  const city = document.getElementById('city-input').value.trim();
  const state = document.getElementById('state-input').value.trim();
  const pincode = document.getElementById('pincode-input').value.trim();
  
  if (!fullName || !phone || !address || !city || !state || !pincode) {
    toast("Please fill in all required shipping address fields (*)", "e");
    // Scroll address card into view
    document.getElementById('shipping-form').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  
  if (phone.length < 10) {
    toast("Please enter a valid 10-digit phone number", "e");
    return;
  }
  
  if (pincode.length < 6) {
    toast("Please enter a valid 6-digit postal pincode", "e");
    return;
  }
  
  // 2. Validate Payment inputs
  if (activePaymentMethod === 'upi') {
    const upiId = document.getElementById('upi-id-input').value.trim();
    if (!upiId || !upiId.includes('@')) {
      toast("Please enter a valid UPI VPA ID (e.g. name@bank)", "e");
      return;
    }
  } else if (activePaymentMethod === 'card') {
    const cName = document.getElementById('card-name').value.trim();
    const cNum = document.getElementById('card-number').value.trim();
    const cExp = document.getElementById('card-expiry').value.trim();
    const cCvv = document.getElementById('card-cvv').value.trim();
    
    if (!cName || !cNum || !cExp || !cCvv) {
      toast("Please fill in all card details", "e");
      return;
    }
    
    if (cNum.replace(/\s/g, '').length < 16) {
      toast("Invalid credit card number length", "e");
      return;
    }
    
    if (cExp.length < 5 || !cExp.includes('/')) {
      toast("Invalid card expiration date (MM/YY format required)", "e");
      return;
    }
    
    if (cCvv.length < 3) {
      toast("Invalid CVV/CVC code length", "e");
      return;
    }
  }
  
  // 3. Trigger loader payment simulation
  showProcessingPaymentModal();
}

function showProcessingPaymentModal() {
  const modal = document.getElementById('modal-processing');
  const progress = document.getElementById('auth-progress-bar');
  if (!modal || !progress) return;
  
  modal.classList.add('active');
  progress.style.width = '0%';
  
  let percent = 0;
  const interval = setInterval(() => {
    percent += 4;
    progress.style.width = `${percent}%`;
    
    if (percent >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        // Close loader and open success screen
        modal.classList.remove('active');
        showSuccessModal();
      }, 300);
    }
  }, 100);
}

function showSuccessModal() {
  const successModal = document.getElementById('modal-success');
  if (!successModal) return;
  
  // Generate random order ID
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const orderId = `MIC-${randNum}-2026`;
  document.getElementById('receipt-order-id').textContent = orderId;
  
  // Set delivery estimate
  const finalEst = shippingSpeed === 'standard' ? standardDeliveryDate : expressDeliveryDate;
  document.getElementById('receipt-delivery-date').textContent = finalEst;
  
  // Set quantity
  document.getElementById('receipt-qty').textContent = `${orderConfig.quantity} Cards`;
  
  // Set payment mode label
  let payModeText = '';
  if (activePaymentMethod === 'upi') {
    const upiAppName = selectedUpiBrand === 'gpay' ? 'Google Pay' : selectedUpiBrand === 'phonepe' ? 'PhonePe' : 'Paytm';
    payModeText = `UPI (${upiAppName})`;
  } else if (activePaymentMethod === 'card') {
    payModeText = 'Credit/Debit Card';
  } else {
    payModeText = 'Net Banking';
  }
  document.getElementById('receipt-payment-mode').textContent = payModeText;
  
  // Set amount paid
  const grandTotalText = document.getElementById('bill-grand-total').textContent;
  document.getElementById('receipt-amount-paid').textContent = grandTotalText;
  
  // Set shipping address meta
  const fullName = document.getElementById('full-name').value.trim();
  const address1 = document.getElementById('address-line1').value.trim();
  const city = document.getElementById('city-input').value.trim();
  const pincode = document.getElementById('pincode-input').value.trim();
  
  document.getElementById('receipt-address-name').textContent = fullName;
  document.getElementById('receipt-address-text').textContent = `${address1}, ${city} - ${pincode}`;
  
  // Display success modal
  successModal.classList.add('active');
  toast("Order completed successfully!", "s");
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

// ── GEOLOCATION & GOOGLE MAPS AUTO-TRACE LOCATION ──
let mapInstance = null;
let markerInstance = null;

function initMap(lat, lon) {
  if (typeof L === 'undefined') {
    console.error("Leaflet library is not loaded yet.");
    return;
  }
  
  if (!mapInstance) {
    mapInstance = L.map('map-container').setView([lat, lon], 15);
    
    // Load official Google Maps roadmap tiles
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Map data &copy; <a href="https://maps.google.com">Google Maps</a>'
    }).addTo(mapInstance);
    
    markerInstance = L.marker([lat, lon]).addTo(mapInstance);
  } else {
    mapInstance.setView([lat, lon], 15);
    markerInstance.setLatLng([lat, lon]);
    
    // Invalidate size to handle dynamic rendering height changes in container
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 100);
  }
}

function traceLocation() {
  const btn = document.querySelector('.btn-trace-location');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tracing Location...';
  btn.disabled = true;

  if (!navigator.geolocation) {
    toast("Geolocation is not supported by your browser.", "e");
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      // Render or update the map container
      const mapContainer = document.getElementById('map-container');
      if (mapContainer) {
        mapContainer.style.display = 'block';
        initMap(lat, lon);
      }

      try {
        // Reverse-geocode coordinates using free Nominatim API
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};
          
          // Parse street address line
          const street = address.road || address.suburb || address.neighbourhood || '';
          const houseNumber = address.house_number || '';
          const line1 = (houseNumber ? houseNumber + ', ' : '') + street;
          
          document.getElementById('address-line1').value = line1 || address.amenity || address.shop || 'Traced Location';
          document.getElementById('city-input').value = address.city || address.town || address.village || address.county || '';
          document.getElementById('state-input').value = address.state || '';
          
          const pincodeVal = address.postcode || '';
          if (pincodeVal) {
            // Clean up zip codes to standard 6 digit format for metro/delivery estimates
            const cleanedPincode = pincodeVal.replace(/\s+/g, '').substring(0, 6);
            document.getElementById('pincode-input').value = cleanedPincode;
            calculateDeliveryEstimate(cleanedPincode);
          }
          
          toast("Location traced and address fields populated!", "s");
        } else {
          toast("Failed to trace address details. Please input manually.", "w");
        }
      } catch (err) {
        console.error("Geocoding fetch error:", err);
        toast("Unable to connect to location services.", "w");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    },
    (error) => {
      console.error("Geolocation callback error:", error);
      let errMsg = "Unable to retrieve location coordinates.";
      if (error.code === error.PERMISSION_DENIED) {
        errMsg = "Location access denied. Please allow site location permissions.";
      }
      toast(errMsg, "e");
      btn.innerHTML = originalText;
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
