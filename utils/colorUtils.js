/**
 * Generate a unique, readable color for each user
 * Based on their identifier (userId, roomId, etc.)
 */

/**
 * Hash string to number
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * HSL to RGB conversion
 */
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * Generate a pastel color for better readability
 */
export function generateUserColor(userId) {
  const hash = hashString(userId || 'default');

  // Use hash to generate hue (0-360)
  const hue = hash % 360;

  // Fixed saturation and lightness for pastel colors
  // High lightness (75-85%) for light, readable backgrounds
  const saturation = 0.5 + (hash % 20) / 100; // 50-70%
  const lightness = 0.75 + (hash % 10) / 100;  // 75-85%

  const rgb = hslToRgb(hue, saturation, lightness);

  return {
    background: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hex: `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`
  };
}

/**
 * Generate contrasting text color (dark or light)
 */
export function getTextColor(backgroundColor) {
  // Parse RGB from background color
  const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

/**
 * Get a consistent color scheme for a user
 */
export function getUserColorScheme(userId, isCurrentUser = false) {
  if (isCurrentUser) {
    // Current user gets a distinct green color (WhatsApp style)
    return {
      background: '#dcf8c6',
      text: '#1a1a1a',
      name: '#065e54'
    };
  }

  const colors = generateUserColor(userId);
  const textColor = getTextColor(colors.background);

  return {
    background: colors.background,
    text: textColor,
    name: colors.hex
  };
}
