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

const API_BASE_URL = "http://localhost:5000/api/payment";
let orderConfig = null;
let shippingAddress = null;
let shippingSpeed = "standard";

// Standard delivery dates (simulated, similar to checkout.js)
let standardDeliveryDate = "";
let expressDeliveryDate = "";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Load details from localStorage
  const savedConfig = localStorage.getItem("mic_current_order_config");
  const savedAddress = localStorage.getItem("mic_shipping_address");
  const savedSpeed = localStorage.getItem("mic_shipping_speed");

  if (!savedConfig || !savedAddress) {
    toast("Missing order or shipping details. Redirecting to checkout...", "e");
    setTimeout(() => {
      window.location.href = "checkout.html";
    }, 2000);
    return;
  }

  try {
    orderConfig = JSON.parse(savedConfig);
    shippingAddress = JSON.parse(savedAddress);
  } catch (e) {
    console.error("Error parsing localstorage data:", e);
    toast("Error loading order configuration. Please try again.", "e");
    return;
  }

  if (savedSpeed) {
    shippingSpeed = savedSpeed;
  }

  // 2. Setup dates
  calculateEstimates();

  // 3. Render Shipping Summary
  renderShippingSummary();

  // 4. Recalculate and render pricing summary
  recalculateBill();

  // 5. Load Card design review preview
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
  
  // 1. Base unit card price tier
  let basePriceRate = 10.00;
  let discountPercent = Math.min(80, Math.floor(qty / 50 - 1) * 10);
  if (discountPercent < 0) discountPercent = 0;
  let basePrice = basePriceRate * (1 - discountPercent / 100);
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
  let shippingCost = shippingSpeed === "express" ? 350.00 : 0.00;
  
  // 5. GST (18%)
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
  
  const grandTotalStr = grandTotal.toFixed(2);
  document.getElementById('bill-grand-total').textContent = grandTotalStr;
  
  // Update Payment button label
  document.getElementById('btn-pay-total').textContent = grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const grandTotal = parseFloat(document.getElementById('bill-grand-total').textContent);
  
  // Call backend order creation API
  fetch(`${API_BASE_URL}/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: grandTotal,
      receipt: `receipt_mic_${Math.floor(10000 + Math.random() * 90000)}`
    })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    if (!data.success) {
      throw new Error(data.message || "Failed to create order");
    }

    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = originalBtnText;
    }

    // Razorpay standard setup
    const options = {
      key: data.key_id,
      amount: data.order.amount,
      currency: data.order.currency,
      name: "MyInvitationCard",
      description: orderConfig.documentTitle || "Invitation Card Order",
      image: "https://myinvitationcard.vercel.app/assets/images/logo.png",
      order_id: data.order.id,
      handler: async function (response) {
        showLoading();
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();
          hideLoading();

          if (verifyData.success) {
            showSuccess("Payment successful & verified!");
            showSuccessModal(response.razorpay_order_id, response.razorpay_payment_id, "Razorpay Online");
          } else {
            showError("Payment verification failed: " + verifyData.message);
            showFailureSimulation("Verification failed: " + verifyData.message, response.razorpay_payment_id);
          }
        } catch (err) {
          console.error("Signature verification error:", err);
          hideLoading();
          showError("Error verifying payment signature");
          showFailureSimulation("Error verifying signature: " + err.message, response.razorpay_payment_id);
        }
      },
      prefill: {
        name: shippingAddress.fullName,
        contact: shippingAddress.phone
      },
      theme: {
        color: "#6366f1"
      },
      modal: {
        ondismiss: function() {
          toast("Payment cancelled by user", "i");
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      console.error("Payment failed event:", response.error);
      showError("Payment failed: " + response.error.description);
      showFailureSimulation(response.error.description, response.error.metadata.payment_id);
    });
    rzp.open();
  })
  .catch(err => {
    console.error("Order creation error:", err);
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = originalBtnText;
    }
    showError(`Payment initialization failed: ${err.message}. Please make sure the payment server is running on port 5000.`);
  });
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
  
  let basePriceRate = 10.00;
  let discountPercent = Math.min(80, Math.floor(qty / 50 - 1) * 10);
  if (discountPercent < 0) discountPercent = 0;
  let basePrice = basePriceRate * (1 - discountPercent / 100);
  const cardsTotal = qty * basePrice;
  
  let paperUnitCost = 0.00;
  switch (orderConfig.paperStock) {
    case 'glossy': paperUnitCost = 2.00; break;
    case 'linen': paperUnitCost = 5.00; break;
    case 'metallic': paperUnitCost = 8.00; break;
  }
  const paperTotal = qty * paperUnitCost;
  
  let envelopeUnitCost = 0.00;
  switch (orderConfig.envelopeOption) {
    case 'velvet': envelopeUnitCost = 5.00; break;
    case 'none': envelopeUnitCost = -2.00; break;
  }
  const envelopeTotal = qty * envelopeUnitCost;
  const subtotal = cardsTotal + paperTotal + envelopeTotal;
  
  let shippingCost = shippingSpeed === 'express' ? 350.00 : 0.00;
  const taxBase = subtotal + shippingCost;
  const gstTax = taxBase * 0.18;
  const grandTotal = subtotal + shippingCost + gstTax;
  
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
}

// Redirect to payment failed page
function showFailureSimulation(customReason, customTxnId) {
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const failureRef = customTxnId || `TXN-REF-${randNum}-2026`;
  const qty = orderConfig.quantity || 100;
  
  let basePriceRate = 10.00;
  let discountPercent = Math.min(80, Math.floor(qty / 50 - 1) * 10);
  if (discountPercent < 0) discountPercent = 0;
  let basePrice = basePriceRate * (1 - discountPercent / 100);
  const cardsTotal = qty * basePrice;
  
  let paperUnitCost = 0.00;
  switch (orderConfig.paperStock) {
    case 'glossy': paperUnitCost = 2.00; break;
    case 'linen': paperUnitCost = 5.00; break;
    case 'metallic': paperUnitCost = 8.00; break;
  }
  const paperTotal = qty * paperUnitCost;
  
  let envelopeUnitCost = 0.00;
  switch (orderConfig.envelopeOption) {
    case 'velvet': envelopeUnitCost = 5.00; break;
    case 'none': envelopeUnitCost = -2.00; break;
  }
  const envelopeTotal = qty * envelopeUnitCost;
  const subtotal = cardsTotal + paperTotal + envelopeTotal;
  
  let shippingCost = shippingSpeed === 'express' ? 350.00 : 0.00;
  const taxBase = subtotal + shippingCost;
  const gstTax = taxBase * 0.18;
  const grandTotal = subtotal + shippingCost + gstTax;
  
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
