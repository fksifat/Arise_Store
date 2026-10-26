import { notFound } from 'next/navigation';
import { storefrontThemes } from '@/lib/storefront-themes';
import { makeThemeDemo } from '@/lib/theme-demo';
import { ThemePreview } from './ThemePreview';

export function generateStaticParams() {
  return storefrontThemes.map(theme => ({ themeKey: theme.key }));
}

export default async function ThemePreviewPage({ params }: { params: Promise<{ themeKey: string }> }) {
  const { themeKey } = await params;
  const preset = storefrontThemes.find(theme => theme.key === themeKey);
  if (!preset) notFound();
  return <ThemePreview key={preset.key} preset={preset} demo={makeThemeDemo(themeKey)} />;
}
