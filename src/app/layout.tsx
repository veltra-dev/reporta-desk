import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { getSession } from '@/lib/session';
import { getGitHubConfig } from '@/lib/github';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ReportaDesk • Gestão de Chamados',
  description: 'Sistema moderno de tickets e suporte integrado diretamente ao GitHub Issues.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const { isConfigured, repo } = getGitHubConfig();

  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
      </head>
      <body className="min-h-screen flex flex-col font-sans selection:bg-[#2F5BFF]/30 selection:text-[#F7F7F4] bg-[#0F1115] text-[#F7F7F4]">
        <Navbar
          session={session}
          isGitHubConnected={isConfigured}
          repoName={repo}
        />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="py-6 border-t border-white/5 text-center text-xs text-zinc-500">
          <p>ReportaDesk • Integrado diretamente com GitHub Issues & Resend</p>
        </footer>
      </body>
    </html>
  );
}
