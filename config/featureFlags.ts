/**
 * Feature Flags Configuration
 * 
 * Allows toggling features on/off globally or based on environment/user role.
 */

export interface FeatureFlags {
  enableAIAnalysis: boolean;
  enableAdvancedAnalytics: boolean;
  enableOfflineSync: boolean;
  enableLiveChat: boolean;
  enableChandraOCR: boolean;
  enableExperimentalDashboard: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  enableAIAnalysis: true,
  enableAdvancedAnalytics: true,
  enableOfflineSync: true,
  enableLiveChat: true,
  enableChandraOCR: true,
  enableExperimentalDashboard: false, // Turned off by default
};

/**
 * Hook-like utility to check if a feature is enabled
 * In a real app, this might depend on user permissions or remote config
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return FEATURE_FLAGS[feature];
};
