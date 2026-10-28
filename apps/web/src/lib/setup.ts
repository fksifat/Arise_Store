import { anyTheme, themeWebsiteType, websiteTypes } from './sites';

export type SetupProgress = { step: number; website_type: string; name: string; slug: string; theme_key: string };

export function setupSearch(search: string, newWebsite = false) {
  const source = new URLSearchParams(search);
  const query = new URLSearchParams();
  for (const key of ['theme', 'type']) if (source.get(key)) query.set(key, source.get(key)!);
  if (newWebsite) query.set('new', '1');
  return query.size ? '?' + query.toString() : '';
}

export function initialSetup(search: string): SetupProgress {
  const query = new URLSearchParams(search);
  const theme = anyTheme(query.get('theme') || '');
  const type = websiteTypes.find(type=>type.key===(theme ? themeWebsiteType(theme.key) : query.get('type'))) || websiteTypes[0];
  return { step: 1, website_type: type.key, name: '', slug: '', theme_key: theme?.key || type.default_theme };
}
