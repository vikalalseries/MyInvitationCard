/**
 * ShareService - URL share, QR code
 * TODO: Implement sharing functionality
 */
const ShareService = (() => {
  function getShareUrl() {
    return window.location.href;
  }
  function copyToClipboard() {
    navigator.clipboard.writeText(getShareUrl())
      .then(() => Toast.show('Link copied!', 'success'))
      .catch(() => Toast.show('Could not copy link', 'error'));
  }
  return { getShareUrl, copyToClipboard };
})();
