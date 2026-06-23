/* ════════════════════════════════════════════════════════════
   payment-failed.js - Payment Failed Page Script
   ════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Retrieve details from localStorage or use fallback
  const savedDetailsStr = localStorage.getItem("mic_failed_order_details");
  let failedDetails = null;
  
  if (savedDetailsStr) {
    try {
      failedDetails = JSON.parse(savedDetailsStr);
    } catch (e) {
      console.error("Error parsing failed order details:", e);
    }
  }
  
  if (!failedDetails) {
    console.warn("No real failed order details found. Using fallback mock details for presentation.");
    failedDetails = getFallbackMockupData();
  }
  
  // 2. Populate UI Fields
  populateUI(failedDetails);
  
  // 3. Clear failed details from storage so it doesn't linger,
  // but do NOT clear the checkout order configurations.
  localStorage.removeItem("mic_failed_order_details");
});

// Fallback mockup data when page is loaded directly
function getFallbackMockupData() {
  const randNum = Math.floor(10000 + Math.random() * 90000);
  return {
    orderId: `MIC-${randNum}-2026`,
    txnId: `TXN-REF-${randNum}-2026`,
    amount: 1416.00,
    reason: "The transaction was declined by the bank due to incorrect CVV/CVC or insufficient funds.",
    paymentMode: "Credit/Debit Card"
  };
}

// Populate the textual fields in the HTML
function populateUI(details) {
  document.getElementById('failed-order-id').textContent = details.orderId || 'MIC-XXXXX-2026';
  
  const amtVal = details.amount || 0;
  document.getElementById('failed-amount').textContent = `₹${amtVal.toFixed(2)}`;
  document.getElementById('failed-pay-mode').textContent = details.paymentMode || 'Credit / Debit Card';
  document.getElementById('failed-transaction-id').textContent = details.txnId || 'TXN-REF-XXXXX';
  document.getElementById('failed-reason').textContent = details.reason || 'The transaction failed during authorization.';
}
