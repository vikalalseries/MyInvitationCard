/**
 * SaveCardModal - Save as custom card template
 * TODO: Implement save card UI
 */
const SaveCardModal = (() => {
  function open() {
    AppState.saveToStorage();
    Toast.show('Card saved to browser storage!', 'success');
  }
  return { open };
})();
