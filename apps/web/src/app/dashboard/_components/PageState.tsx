import { AlertCircle, Loader2 } from 'lucide-react';

export function PageState({ loading, error, onRetry }: { loading?: boolean; error?: string | null; onRetry: () => void }) {
  return <div className="mx-auto max-w-6xl p-6 sm:p-8">
    {loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500"><Loader2 size={20} className="animate-spin" />Loading your store…</div> : <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><div className="flex items-center gap-2"><AlertCircle size={18} />{error}</div><button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-rose-200 bg-white px-4 py-2 font-semibold">Try again</button></div>}
  </div>;
}
