'use client';

import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui/primitives';
import { setSession } from '@/lib/session';

const OTP_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const submitCredentials = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setError('');
    setStep('otp');
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((current) => current.map((d, i) => (i === index ? digit : d)));
    if (digit) boxes.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index]) boxes.current[index - 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    setOtp(Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] ?? ''));
    boxes.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const submitOtp = (e: FormEvent) => {
    e.preventDefault();
    if (otp.join('').length < OTP_LENGTH) return setError('Enter the 6-digit code.');
    setSession(email);
    router.replace('/dashboard');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Image src="/logo.png" alt="Society emblem" width={88} height={88} className="mx-auto" priority />
          <h1 className="mt-3 font-gujarati text-lg font-bold text-maroon">શ્રી ગામટોળા યુવક મિત્ર મંડળ</h1>
          <p className="text-sm text-muted-foreground">
            {step === 'credentials' ? 'Super Admin Login' : `Enter the code sent to ${email}`}
          </p>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={submitCredentials} className="space-y-3">
            <Input type="email" placeholder="Email" aria-label="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error ? <p role="alert" className="text-xs text-[#C62828]">{error}</p> : null}
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="space-y-4">
            <div className="flex justify-between gap-2" onPaste={onPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxes.current[i] = el;
                  }}
                  value={digit}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={i === 0}
                  aria-label={`Digit ${i + 1}`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  className="h-12 w-11 rounded-lg border border-input text-center text-lg font-semibold focus:border-maroon focus:outline-none"
                />
              ))}
            </div>
            {error ? <p role="alert" className="text-xs text-[#C62828]">{error}</p> : null}
            <Button type="submit" className="w-full">Verify &amp; Login</Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep('credentials');
                setError('');
              }}
            >
              Back
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
