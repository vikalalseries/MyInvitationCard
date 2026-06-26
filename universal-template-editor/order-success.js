/* ════════════════════════════════════════════════════════════
   order-success.js - Order Success and Tracking Logic
   ════════════════════════════════════════════════════════════ */

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
  
  // 4. Setup Star Rating Component Interactivity
  setupStarRating();
});

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
  document.getElementById('track-confirm-date').textContent = today.toLocaleDateString('en-US', options);
  
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
  const iframe = document.getElementById('iframe-checkout-preview');
  if (!iframe) return;
  
  const templateId = details.templateId || 'card1';
  iframe.src = `templates/${templateId}/template.html`;
  
  // Fetch template configuration
  let config = null;
  try {
    const response = await fetch(`templates/${templateId}/config.json`);
    if (response.ok) {
      config = await response.json();
    }
  } catch (err) {
    console.error("Failed to load template config inside success page preview:", err);
  }
  
  iframe.onload = () => {
    // 1. Inject CSS stylesheet to isolate and scale Section 1 of the card layout
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const style = doc.createElement('style');
    style.textContent = `
      body { background: transparent !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; }
      .card { padding: 0 !important; margin: 0 !important; gap: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; width: 21.5cm !important; height: 8.5cm !important; min-height: 8.5cm !important; overflow: hidden !important; }
      .sec2 { display: none !important; }
      .sec1 { width: 21.5cm !important; height: 8.5cm !important; border: none !important; box-shadow: none !important; top: 0 !important; left: 0 !important; position: absolute !important; }
    `;
    doc.head.appendChild(style);
    
    // 2. Resolve field values with config defaults and sync details to iframe
    if (iframe.contentWindow) {
      const orderData = details.data || {};
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
  fetch(`http://localhost:5000/api/orders/${orderId}/review`, {
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
