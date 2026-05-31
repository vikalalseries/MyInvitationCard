/**
 * ApiService - Backend API calls
 * TODO: Implement API integration for saving/sharing cards
 */
const ApiService = (() => {
  const BASE_URL = '/api';

  async function saveCard(cardData) {
    // TODO: POST to backend
    console.log('[ApiService] saveCard - not implemented');
    return Promise.resolve({ success: true });
  }

  async function loadCard(cardId) {
    // TODO: GET from backend
    console.log('[ApiService] loadCard - not implemented');
    return Promise.resolve(null);
  }

  return { saveCard, loadCard };
})();
