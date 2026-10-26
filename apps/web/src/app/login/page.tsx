import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const showDemoCredentials = process.env.APP_ENV === 'development' && process.env.SEED_DEMO_DATA === 'true';
  return <LoginForm showDemoCredentials={showDemoCredentials} />;
}
