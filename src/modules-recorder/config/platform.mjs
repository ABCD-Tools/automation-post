/**
 * Platform-specific configuration for different social media platforms
 */

export const PLATFORM_CONFIG = {
  instagram: {
    protocolTimeout: 180000, // 3 minutes for heavy SPA
    navigationStabilityWait: 5000,
  },
  facebook: {
    protocolTimeout: 120000, // 2 minutes
    navigationStabilityWait: 3000,
  },
  twitter: {
    protocolTimeout: 60000, // 1 minute
    navigationStabilityWait: 2000,
  },
  default: {
    protocolTimeout: 60000, // 1 minute default
    navigationStabilityWait: 1000,
  }
};

/**
 * Get platform configuration
 * @param {string} platform - Platform name
 * @returns {Object} Platform configuration
 */
export function getPlatformConfig(platform) {
  return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.default;
}

/**
 * Check if platform uses mobile viewport
 * @param {string} platform - Platform name
 * @returns {boolean} True if mobile viewport should be used
 */
export function usesMobileViewport(platform) {
  return platform === 'instagram' || platform === 'facebook';
}

