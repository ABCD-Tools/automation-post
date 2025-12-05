/**
 * Platform-specific configuration for different social media platforms
 */

export const PLATFORM_CONFIG = {
  instagram: {
    name: 'instagram',
    protocolTimeout: 180000, // 3 minutes for heavy SPA
    navigationStabilityWait: 5000,
    useMobileViewport: true,
  },
  facebook: {
    name: 'facebook',
    protocolTimeout: 120000, // 2 minutes
    navigationStabilityWait: 3000,
    useMobileViewport: true,
  },
  twitter: {
    name: 'twitter',
    protocolTimeout: 60000, // 1 minute
    navigationStabilityWait: 2000,
    useMobileViewport: false,
  },
  default: {
    name: 'default',
    protocolTimeout: 60000, // 1 minute default
    navigationStabilityWait: 1000,
    useMobileViewport: false,
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

