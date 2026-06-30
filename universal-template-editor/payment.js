/* ════════════════════════════════════════════════════════════
   payment.js - Price Summary & Razorpay Payment Logic
   ════════════════════════════════════════════════════════════ */

// Initialize Firebase Auth dynamically to track logged in user
Promise.all([
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
  import("../assets/js/firebase-config.js")
]).then(([authMod, configMod]) => {
  authMod.onAuthStateChanged(configMod.auth, (user) => {
    if (user) {
      window.currentUserUid = user.uid;
    } else {
      window.currentUserUid = null;
    }
  });
}).catch(err => {
  console.error("Failed to load Firebase modules on payment page:", err);
});

const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://myinvitationcard.onrender.com";

const API_BASE_URL = `${BACKEND_URL}/api/payment`;
let orderConfig = null;
let shippingAddress = null;
let shippingSpeed = "standard";

// Standard delivery dates (simulated, similar to checkout.js)
let standardDeliveryDate = "";
let expressDeliveryDate = "";

let templateDbConfig = null;
let globalPricingConfig = null;

async function loadTemplateDbConfig() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/templates/${orderConfig.templateId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.template) {
        templateDbConfig = data.template;
      }
    }
  } catch (err) {
    console.warn("Could not load template settings from backend:", err.message);
  }
}

function countUploadedImages() {
  if (!orderConfig) return 0;
  const fields = orderConfig.data?.fields || {};
  let count = 0;
  Object.values(fields).forEach(val => {
    if (val && typeof val === "string") {
      if (val.startsWith("data:image/") || (val.includes("http") && (val.includes(".png") || val.includes(".jpg") || val.includes(".jpeg") || val.includes("/uploads/")))) {
        count++;
      }
    }
  });
  return count;
}

function calculatePriceBreakdown(qty, paperStock, envelopeOption, shippingSpeed) {
  // 1. Base card price — use dynamic DB price if available, else fallback to ₹10.00
  let basePriceRate = (templateDbConfig && templateDbConfig.price) ? templateDbConfig.price : 10.00;
  // If an active offer price exists and is within date range, use it
  if (templateDbConfig && templateDbConfig.offerPrice != null && templateDbConfig.offerPrice > 0) {
    const now = new Date();
    const start = templateDbConfig.offerStartDate ? new Date(templateDbConfig.offerStartDate) : null;
    const end = templateDbConfig.offerEndDate ? new Date(templateDbConfig.offerEndDate) : null;
    if ((!start || now >= start) && (!end || now <= end)) {
      basePriceRate = templateDbConfig.offerPrice;
    }
  }

  let discountPercent = 0;
  if (globalPricingConfig && globalPricingConfig.volume_discount_tiers && globalPricingConfig.volume_discount_tiers.length > 0) {
    const tiers = globalPricingConfig.volume_discount_tiers.sort((a, b) => a.upTo - b.upTo);
    for (const tier of tiers) {
      if (qty <= tier.upTo) { discountPercent = tier.discount; break; }
      discountPercent = tier.discount;
    }
  } else {
    discountPercent = Math.min(80, Math.floor(qty / 50 - 1) * 10);
    if (discountPercent < 0) discountPercent = 0;
  }
  let basePrice = basePriceRate * (1 - discountPercent / 100);
  const cardsTotal = qty * basePrice;

  // 2. Paper stock addon
  let paperUnitCost = 0.00;
  let paperName = 'Matte';
  switch (paperStock) {
    case 'glossy': paperUnitCost = 2.00; paperName = 'Premium Glossy'; break;
    case 'linen': paperUnitCost = 5.00; paperName = 'Textured Linen'; break;
    case 'metallic': paperUnitCost = 8.00; paperName = 'Gold Foil Metallic'; break;
  }
  const paperTotal = qty * paperUnitCost;

  // 3. Envelope option addon (skip if template has no envelope)
  let envelopeUnitCost = 0.00;
  let envelopeName = 'Standard Crimson';
  if (templateDbConfig && templateDbConfig.hasEnvelope === false) {
    envelopeUnitCost = 0.00;
    envelopeName = 'No Envelopes Required';
  } else {
    switch (envelopeOption) {
      case 'velvet': envelopeUnitCost = 5.00; envelopeName = 'Premium Velvet Silk'; break;
      case 'none': envelopeUnitCost = -2.00; envelopeName = 'Omitted Envelopes'; break;
    }
  }
  const envelopeTotal = qty * envelopeUnitCost;

  // 4. Premium pages surcharge
  let premiumPagesUnitCost = 0.00;
  if (templateDbConfig && templateDbConfig.hasPremiumPages) {
    premiumPagesUnitCost = 5.00;
  }
  const premiumPagesTotal = qty * premiumPagesUnitCost;

  // 5. Premium card stock color surcharge
  let premiumStockUnitCost = 0.00;
  if (templateDbConfig && templateDbConfig.premiumCardStocks && templateDbConfig.premiumCardStocks.length > 0) {
    const cardBg = orderConfig.data?.styles?.cardBg;
    if (cardBg && templateDbConfig.premiumCardStocks.map(c => c.toLowerCase()).includes(cardBg.toLowerCase())) {
      premiumStockUnitCost = 3.00;
    }
  }
  const premiumStockTotal = qty * premiumStockUnitCost;

  // 6. User Uploaded Images surcharge
  let uploadedImageUnitCost = 0.00;
  const imageCount = countUploadedImages();
  if (templateDbConfig && templateDbConfig.uploadedImagePrice && templateDbConfig.uploadedImagePrice > 0) {
    uploadedImageUnitCost = templateDbConfig.uploadedImagePrice;
  }
  const uploadedImageTotal = qty * (uploadedImageUnitCost * imageCount);

  // Subtotal before shipping/tax
  const subtotal = cardsTotal + paperTotal + envelopeTotal + premiumPagesTotal + premiumStockTotal + uploadedImageTotal;

  // 6. Shipping
  let shippingCost = shippingSpeed === "express" ? 350.00 : 0.00;

  // 7. GST (18%, or 0% if taxFree)
  const taxBase = subtotal + shippingCost;
  const isTaxFree = !!(templateDbConfig && templateDbConfig.taxFree);
  const gstTax = isTaxFree ? 0.00 : taxBase * 0.18;

  // 8. Grand total
  const grandTotal = subtotal + shippingCost + gstTax;

  return {
    basePriceRate,
    basePrice,
    cardsTotal,
    paperUnitCost,
    paperName,
    paperTotal,
    envelopeUnitCost,
    envelopeName,
    envelopeTotal,
    premiumPagesUnitCost,
    premiumPagesTotal,
    premiumStockUnitCost,
    premiumStockTotal,
    uploadedImageUnitCost,
    uploadedImageCount: imageCount,
    uploadedImageTotal,
    subtotal,
    shippingCost,
    gstTax,
    grandTotal
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Load details from localStorage
  const savedConfig = localStorage.getItem("mic_current_order_config");
  const savedAddress = localStorage.getItem("mic_shipping_address");
  const savedSpeed = localStorage.getItem("mic_shipping_speed");

  if (savedConfig && savedAddress) {
    try {
      orderConfig = JSON.parse(savedConfig);
      shippingAddress = JSON.parse(savedAddress);
    } catch (e) {
      console.error("Error parsing localstorage data:", e);
      toast("Error loading order configuration. Please try again.", "e");
      return;
    }
  } else {
    const lastOrder = localStorage.getItem("mic_last_order_details");
    if (lastOrder) {
      try {
        const parsed = JSON.parse(lastOrder);
        orderConfig = {
          templateId: parsed.templateId || 'card1',
          documentTitle: parsed.documentTitle || 'Wedding Card',
          quantity: parsed.quantity || 100,
          paperStock: parsed.paperStock || 'matte',
          envelopeOption: parsed.envelopeOption || 'standard',
          unitPrice: parsed.pricing?.baseRate || 10.00,
          data: parsed.data || { fields: {}, events: {}, styles: {} }
        };
        shippingAddress = parsed.shippingAddress || {
          fullName: '',
          phone: '',
          address: '',
          address2: '',
          city: '',
          state: '',
          pincode: '',
          emergencyPhone: ''
        };
        shippingSpeed = parsed.deliveryMethod || 'standard';
      } catch (e) {
        console.error("Error parsing last order details:", e);
        toast("Missing order or shipping details. Redirecting to checkout...", "e");
        setTimeout(() => {
          window.location.href = "checkout.html";
        }, 2000);
        return;
      }
    } else {
      toast("Missing order or shipping details. Redirecting to checkout...", "e");
      setTimeout(() => {
        window.location.href = "checkout.html";
      }, 2000);
      return;
    }
  }

  if (savedSpeed) {
    shippingSpeed = savedSpeed;
  }

  // 2. Setup dates
  calculateEstimates();

  // 3. Render Shipping Summary
  renderShippingSummary();

  // 4. Fetch dynamic template settings from backend DB
  await loadTemplateDbConfig();

  // 4b. Fetch global pricing settings
  try {
    const gRes = await fetch(`${BACKEND_URL}/api/pricing/global`);
    if (gRes.ok) {
      const gData = await gRes.json();
      if (gData.success) globalPricingConfig = gData.config;
    }
  } catch (e) { console.warn('Could not load global pricing config'); }

  // 5. Recalculate and render pricing summary
  recalculateBill();

  // 6. Load Card design review preview
  setupIframePreview();
});

// Calculate delivery dates
function calculateEstimates() {
  const today = new Date();
  
  const stdMin = new Date(today); stdMin.setDate(today.getDate() + 5);
  const stdMax = new Date(today); stdMax.setDate(today.getDate() + 7);
  const expMin = new Date(today); expMin.setDate(today.getDate() + 2);
  const expMax = new Date(today); expMax.setDate(today.getDate() + 3);
  
  const opt = { weekday: 'short', month: 'short', day: 'numeric' };
  standardDeliveryDate = `${stdMin.toLocaleDateString('en-US', opt)} - ${stdMax.toLocaleDateString('en-US', opt)}`;
  expressDeliveryDate = `${expMin.toLocaleDateString('en-US', opt)} - ${expMax.toLocaleDateString('en-US', opt)}`;
}

// Display Shipping address summary
function renderShippingSummary() {
  document.getElementById("shipping-summary-name").textContent = shippingAddress.fullName;
  
  const fullAddress = [
    shippingAddress.address,
    shippingAddress.address2,
    `${shippingAddress.city} - ${shippingAddress.pincode}`,
    shippingAddress.state,
    "India"
  ].filter(Boolean).join(", ");
  
  document.getElementById("shipping-summary-address").textContent = fullAddress;
  document.getElementById("shipping-summary-phone").textContent = shippingAddress.phone;
  
  if (shippingAddress.emergencyPhone) {
    document.getElementById("shipping-summary-emergency").textContent = shippingAddress.emergencyPhone;
    document.getElementById("shipping-summary-emergency-row").style.display = "inline";
  } else {
    document.getElementById("shipping-summary-emergency-row").style.display = "none";
  }
}

// Recompute prices and update UI
function recalculateBill() {
  const qty = orderConfig.quantity || 100;
  const breakdown = calculatePriceBreakdown(qty, orderConfig.paperStock, orderConfig.envelopeOption, shippingSpeed);

  // Update bill UI Labels
  document.getElementById('bill-qty').textContent = qty;
  document.getElementById('bill-base-price').textContent = breakdown.basePrice.toFixed(2);
  document.getElementById('bill-cards-total').textContent = breakdown.cardsTotal.toFixed(2);
  
  document.getElementById('bill-paper-name').textContent = breakdown.paperName;
  document.getElementById('bill-paper-total').textContent = breakdown.paperTotal.toFixed(2);
  
  document.getElementById('bill-envelope-name').textContent = breakdown.envelopeName;
  document.getElementById('bill-envelope-total').textContent = breakdown.envelopeTotal.toFixed(2);
  
  const imgRow = document.getElementById('bill-item-uploaded-images');
  if (imgRow) {
    if (breakdown.uploadedImageTotal > 0) {
      document.getElementById('bill-image-count').textContent = breakdown.uploadedImageCount;
      document.getElementById('bill-image-price').textContent = breakdown.uploadedImageUnitCost.toFixed(2);
      document.getElementById('bill-image-total').textContent = breakdown.uploadedImageTotal.toFixed(2);
      imgRow.style.display = 'flex';
    } else {
      imgRow.style.display = 'none';
    }
  }
  
  document.getElementById('bill-shipping-val').textContent = breakdown.shippingCost === 0 ? 'FREE' : `₹${breakdown.shippingCost.toFixed(2)}`;
  document.getElementById('bill-tax-val').textContent = breakdown.gstTax.toFixed(2);
  
  const grandTotalStr = breakdown.grandTotal.toFixed(2);
  document.getElementById('bill-grand-total').textContent = grandTotalStr;
  
  // Update Payment button label
  document.getElementById('btn-pay-total').textContent = breakdown.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Setup preview iframe card layout
async function setupIframePreview() {
  const iframe = document.getElementById('iframe-checkout-preview');
  if (!iframe) return;
  
  const templateId = orderConfig.templateId || 'card1';
  iframe.src = `templates/${templateId}/template.html`;
  
  // Fetch template title
  document.getElementById("checkout-card-title").textContent = orderConfig.documentTitle || "Wedding Card";
  document.getElementById("checkout-qty-summary").textContent = orderConfig.quantity || 100;
  
  let paperLabel = "Matte Cardboard";
  if (orderConfig.paperStock === "glossy") paperLabel = "Premium Glossy";
  if (orderConfig.paperStock === "linen") paperLabel = "Textured Linen";
  if (orderConfig.paperStock === "metallic") paperLabel = "Gold Foil Metallic";
  document.getElementById("checkout-paper-summary").textContent = paperLabel;
  
  let envLabel = "Standard Envelope";
  if (orderConfig.envelopeOption === "velvet") envLabel = "Premium Velvet Silk";
  if (orderConfig.envelopeOption === "none") envLabel = "Omitted Envelope";
  document.getElementById("checkout-envelope-summary").textContent = envLabel;

  // Fetch template configuration for preview sync
  let config = null;
  try {
    const response = await fetch(`templates/${templateId}/config.json`);
    if (response.ok) {
      config = await response.json();
    }
  } catch (err) {
    console.error("Failed to load template config:", err);
  }
  
  iframe.onload = () => {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const style = doc.createElement('style');
    style.textContent = `
      body { background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; }
      .card { padding: 0 !important; margin: 0 !important; gap: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; width: 21.5cm !important; height: 8.5cm !important; min-height: 8.5cm !important; overflow: hidden !important; }
      .sec2 { display: none !important; }
      .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; position: absolute !important; }
    `;
    doc.head.appendChild(style);
    
    if (iframe.contentWindow) {
      const orderData = orderConfig.data || {};
      const resolvedData = {
        fields: {},
        events: {},
        styles: orderData.styles || {}
      };
      
      if (config) {
        if (config.fields) {
          config.fields.forEach(f => {
            const val = (orderData.fields && orderData.fields[f.id]);
            resolvedData.fields[f.id] = (val === null || val === undefined) ? (f.default || '') : val;
          });
        }
        if (config.events) {
          config.events.forEach(e => {
            const currentEv = (orderData.events && orderData.events[e.id]) || {};
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
        resolvedData.fields = orderData.fields || {};
        resolvedData.events = orderData.events || {};
      }
      
      iframe.contentWindow.postMessage({
        type: 'UPDATE_TEMPLATE_DATA',
        data: resolvedData
      }, '*');
    }
  };
}

// ── RAZORPAY GATEWAY TRIGGER ──
function triggerRazorpayPayment() {
  const payBtn = document.querySelector('.btn-pay-now');
  const originalBtnText = payBtn ? payBtn.innerHTML : 'Pay Now';
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';
  }

  const fakePaymentId = `pay_FAKE_${Math.floor(100000 + Math.random() * 900000)}`;

  setTimeout(() => {
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = originalBtnText;
    }
    showSuccess("Payment successful!");
    showSuccessModal(null, fakePaymentId, "Instant Payment");
  }, 700);
}

// Redirect to order success page
function showSuccessModal(razorpayOrderId, razorpayPaymentId, methodUsed) {
  const orderId = razorpayOrderId || `MIC-${Math.floor(10000 + Math.random() * 90000)}-2026`;
  const finalEst = shippingSpeed === 'standard' ? standardDeliveryDate : expressDeliveryDate;
  
  let payModeText = methodUsed || "Razorpay Online";
  if (razorpayPaymentId) {
    payModeText += ` (Ref: ${razorpayPaymentId})`;
  }
  
  const qty = orderConfig.quantity || 100;
  const breakdown = calculatePriceBreakdown(qty, orderConfig.paperStock, orderConfig.envelopeOption, shippingSpeed);
  
  const basePrice = breakdown.basePrice;
  const cardsTotal = breakdown.cardsTotal;
  const paperTotal = breakdown.paperTotal;
  const envelopeTotal = breakdown.envelopeTotal;
  const premiumPagesTotal = breakdown.premiumPagesTotal;
  const premiumStockTotal = breakdown.premiumStockTotal;
  const uploadedImageTotal = breakdown.uploadedImageTotal;
  const subtotal = breakdown.subtotal;
  const shippingCost = breakdown.shippingCost;
  const gstTax = breakdown.gstTax;
  const grandTotal = breakdown.grandTotal;
  const paperUnitCost = breakdown.paperUnitCost;
  const envelopeUnitCost = breakdown.envelopeUnitCost;
  
  const orderDetails = {
    orderId,
    templateId: orderConfig.templateId,
    documentTitle: orderConfig.documentTitle,
    quantity: qty,
    paperStock: orderConfig.paperStock,
    envelopeOption: orderConfig.envelopeOption,
    basePrice,
    cardsTotal,
    paperTotal,
    envelopeTotal,
    premiumPagesTotal,
    premiumStockTotal,
    uploadedImageTotal,
    subtotal,
    shippingCost,
    gstTax,
    grandTotal,
    deliveryDate: finalEst,
    paymentMode: payModeText,
    data: orderConfig.data,
    shippingAddress: {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      emergencyPhone: shippingAddress.emergencyPhone || "",
      address: `${shippingAddress.address}, ${shippingAddress.address2 || ""}`,
      city: shippingAddress.city,
      state: shippingAddress.state,
      pincode: shippingAddress.pincode
    }
  };

  const backendOrderPayload = {
    orderId: orderId,
    uid: window.currentUserUid || "guest_" + Math.floor(1000 + Math.random() * 9000),
    templateId: orderConfig.templateId,
    templateName: orderConfig.documentTitle || "Wedding Card",
    orderType: shippingSpeed === 'express' ? 'express' : 'normal',
    status: "Confirmed",
    stockOption: orderConfig.paperStock || "matte",
    premiumPaperStock: orderConfig.premiumPaper || null,
    envelopeOption: orderConfig.envelopeOption || "standard",
    quantity: qty,
    deliveryMethod: shippingSpeed,
    templatePreviewUrl: `storage/templates/${orderConfig.templateId}/thumbnail.jpg`,
    templateEditData: orderConfig.data || {},
    pricing: {
      baseRate: basePrice,
      stockPrice: paperUnitCost,
      premiumStockPrice: breakdown.premiumStockUnitCost,
      premiumPagesPrice: breakdown.premiumPagesUnitCost,
      envelopePrice: envelopeUnitCost,
      deliveryPrice: shippingCost,
      uploadedImagePrice: breakdown.uploadedImageUnitCost,
      uploadedImageCount: breakdown.uploadedImageCount,
      baseTotal: cardsTotal,
      addonsTotal: paperTotal + envelopeTotal + premiumPagesTotal + premiumStockTotal + uploadedImageTotal,
      subtotal: subtotal,
      tax: gstTax,
      total: grandTotal
    },
    shippingAddress: {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      emergencyPhone: shippingAddress.emergencyPhone || "",
      pincode: shippingAddress.pincode,
      address: shippingAddress.address,
      address2: shippingAddress.address2 || "",
      city: shippingAddress.city,
      state: shippingAddress.state
    },
    paymentId: razorpayPaymentId || ""
  };
  
  // Call backend API to persist the order
  fetch(`${BACKEND_URL}/api/orders/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(backendOrderPayload)
  })
  .then(res => res.json())
  .then(data => {
    console.log("Order saved to backend:", data);
  })
  .catch(err => {
    console.error("Failed to save order to backend database:", err);
  })
  .finally(() => {
    // If user is logged in, save order to their order history in localStorage
    if (window.currentUserUid) {
      const orderHistoryKey = `mic_user_orders_${window.currentUserUid}`;
      let orderHistory = [];
      try {
        const raw = localStorage.getItem(orderHistoryKey);
        if (raw) orderHistory = JSON.parse(raw);
      } catch (e) {
        console.error("Error reading order history:", e);
      }
      orderHistory.push({
        ...orderDetails,
        orderDate: new Date().toISOString()
      });
      localStorage.setItem(orderHistoryKey, JSON.stringify(orderHistory));
    }

    localStorage.setItem("mic_last_order_details", JSON.stringify(orderDetails));
    localStorage.removeItem("mic_current_order_config");
    
    // Clear speed details from cache, but keep mic_shipping_address for persistence!
    localStorage.removeItem("mic_shipping_speed");
    
    window.location.href = "order-success.html";
  });
}

// Redirect to payment failed page
function showFailureSimulation(customReason, customTxnId) {
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const failureRef = customTxnId || `TXN-REF-${randNum}-2026`;
  const qty = orderConfig.quantity || 100;
  const breakdown = calculatePriceBreakdown(qty, orderConfig.paperStock, orderConfig.envelopeOption, shippingSpeed);
  
  const grandTotal = breakdown.grandTotal;
  
  const failedDetails = {
    orderId: `MIC-${randNum}-2026`,
    txnId: failureRef,
    amount: grandTotal,
    reason: customReason || "The transaction was declined by the bank.",
    paymentMode: "Razorpay Online"
  };
  
  localStorage.setItem("mic_failed_order_details", JSON.stringify(failedDetails));
  window.location.href = "payment-failed.html";
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
