import catalog from '../../../../services/api/app/theme_catalog.json';

export const storefrontThemes = catalog;
export const themeCategories = [...new Set(storefrontThemes.map(theme => theme.category))];
export type StorefrontThemePreset = typeof storefrontThemes[number];
export function getStorefrontTheme(key?: string): StorefrontThemePreset {
  return storefrontThemes.find(theme => theme.key === key) || storefrontThemes[0];
}
