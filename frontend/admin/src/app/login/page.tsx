'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui/primitives';
import { setSession } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // UI only for now: any email and password log in until the panel is connected to the backend.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setSession(email);
    router.replace('/dashboard');
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
          <Button type="submit" className="w-full">Login</Button>
        </form>
      </div>
    </main>
  );
}
