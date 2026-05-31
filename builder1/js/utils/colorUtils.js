/**
 * ColorUtils - Color manipulation utilities
 */
const ColorUtils = (() => {
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : null;
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2,'0')).join('');
  }
  function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(
      Math.min(255, rgb.r + Math.round(255 * amount)),
      Math.min(255, rgb.g + Math.round(255 * amount)),
      Math.min(255, rgb.b + Math.round(255 * amount))
    );
  }
  function darken(hex, amount) {
    return lighten(hex, -amount);
  }
  return { hexToRgb, rgbToHex, lighten, darken };
})();
