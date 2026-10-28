import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in | Arise', robots: { index: false, follow: false } };

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const showDemoCredentials = process.env.APP_ENV === 'development' && process.env.SEED_DEMO_DATA === 'true';
  return <LoginForm showDemoCredentials={showDemoCredentials} />;
}
