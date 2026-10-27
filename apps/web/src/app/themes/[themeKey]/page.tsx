import { notFound } from 'next/navigation';
import { storefrontThemes } from '@/lib/storefront-themes';
import { makeThemeDemo } from '@/lib/theme-demo';
import { websiteThemes } from '@/lib/sites';
import { WebsiteThemePreview } from './WebsiteThemePreview';
import { ThemePreview } from './ThemePreview';

export function generateStaticParams() {
  return [...storefrontThemes,...websiteThemes].map(theme => ({ themeKey: theme.key }));
}

export default async function ThemePreviewPage({ params }: { params: Promise<{ themeKey: string }> }) {
  const { themeKey } = await params;
  const websitePreset=websiteThemes.find(theme=>theme.key===themeKey);
  if(websitePreset)return <WebsiteThemePreview preset={websitePreset}/>;
  const preset = storefrontThemes.find(theme => theme.key === themeKey);
  if (!preset) notFound();
  return <ThemePreview key={preset.key} preset={preset} demo={makeThemeDemo(themeKey)} />;
}
