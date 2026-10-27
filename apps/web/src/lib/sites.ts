import catalog from '../../../../services/api/app/website_catalog.json';
import { storefrontThemes } from './storefront-themes';

export const websiteTypes = catalog.types;
export const websiteThemes = catalog.themes;
export const websiteStarters = catalog.starters as Record<string, Section[]>;
export type SectionItem = { heading: string; body: string; image_url: string; image_alt: string; button_text: string; button_url: string };
export type Section = Partial<SectionItem> & { id: string; type: string; enabled?: boolean; eyebrow?: string; items?: Partial<SectionItem>[] };
export const isOnlineStore = (site: any) => !site.website_type || site.website_type === 'online_store';
export const publicSitePath = (site: any) => `${isOnlineStore(site) ? '/store' : '/site'}/${site.slug}`;
export const websiteType = (key: string) => websiteTypes.find(type => type.key === key) || websiteTypes.find(type => type.key === 'online_store')!;
export const websiteTheme = (key: string) => websiteThemes.find(theme => theme.key === key);
export const anyTheme = (key: string) => storefrontThemes.find(theme => theme.key === key) || websiteTheme(key);
export const themeWebsiteType = (key: string) => websiteTheme(key)?.website_type || 'online_store';
export const contentPath = (site: any, page: {kind?: string; slug: string}) => page.slug === 'home' ? publicSitePath(site) : `/site/${site.slug}/${page.kind === 'post' ? 'blog/' : ''}${page.slug}`;
