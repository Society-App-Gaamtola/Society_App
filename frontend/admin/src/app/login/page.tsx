'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Input } from '@/components/ui/primitives';
import { deviceId, setSession } from '@/lib/session';
import { api } from '@/services/core/backend';

type LoginData = { token: string; userData: { id: number; username: string | null; email: string } };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // POST /admin/login: only the Super Admin gets a token. The backend's message is shown as it is
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError('');
    try {
      const { data } = await api<LoginData>('POST', '/admin/login', {
        body: { email: email.trim(), password, uuid: deviceId(), device_type: 'web', device_name: navigator.userAgent.slice(0, 100) },
      });
      setSession({ id: data.userData.id, email: data.userData.email, name: data.userData.username || 'Admin', token: data.token });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Image src="/logo.png" alt="Society emblem" width={88} height={88} className="mx-auto" priority />
          <h1 className="mt-3 font-gujarati text-lg font-bold text-maroon">શ્રી ગામટોળા યુવક મિત્ર મંડળ</h1>
          <p className="text-sm text-muted-foreground">Super Admin Login</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="Email" aria-label="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p role="alert" className="text-xs text-[#C62828]">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Login
          </Button>
        </form>
      </div>
    </main>
  );
}
