import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Serif_Gujarati, Poppins } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins' });
const gujarati = Noto_Serif_Gujarati({ subsets: ['gujarati'], weight: ['400', '700'], variable: '--font-gujarati' });

export const metadata: Metadata = {
  title: 'Super Admin | Shri Gamtola Yuvak Mitra Mandal',
  description: 'Society Cultural Activity App admin panel',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${gujarati.variable}`}>
      <body className="bg-cream font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
