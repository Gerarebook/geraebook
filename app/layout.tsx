import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-book Pro | Gerador Premium',
  description: 'Gerador de e-books profissionais',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}