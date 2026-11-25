import { Analytics } from '@vercel/analytics/next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from 'next/font/google';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif' });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'whowillwintheairace.com — the winner has already been chosen',
  description: 'after billions of dollars, millions of GPUs, and an unreasonable number of podcasts, we finally have an answer.',
  openGraph: { title: 'the winner has already been chosen.', description: 'do not open until you have an opinion.', url: '/' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable} ${serif.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
