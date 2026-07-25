import { brandingDefaults } from './branding.defaults'
import { connectivityDefaults } from './connectivity.defaults'
import { featuresDefaults } from './features.defaults'
import { projectPwaConfig } from './pwa.runtime'
import { pwaUiDefaults } from './pwaUi.defaults'

/** کانفیگ پیش‌فرض کامل اپ */
export function createDefaultAppConfig() {
  return {
    features: { ...featuresDefaults },
    branding: { ...brandingDefaults },
    pwaUi: { ...pwaUiDefaults },
    connectivity: { ...connectivityDefaults },
  }
}

export {
  brandingDefaults,
  connectivityDefaults,
  featuresDefaults,
  projectPwaConfig,
  pwaUiDefaults,
}
