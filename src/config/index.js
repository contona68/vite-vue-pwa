import { brandingDefaults } from './branding.defaults'
import { connectivityDefaults } from './connectivity.defaults'
import { featuresDefaults } from './features.defaults'
import { pwaUiDefaults } from './pwaUi.defaults'

/** کانفیگ پیش‌فرض کامل اپ (قابل override از API/localStorage) */
export function createDefaultAppConfig() {
  return {
    features: { ...featuresDefaults },
    branding: { ...brandingDefaults },
    pwaUi: { ...pwaUiDefaults },
    connectivity: { ...connectivityDefaults },
  }
}
