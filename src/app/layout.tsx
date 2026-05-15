import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Nebulab3D',
  description:
    'Plataforma para restaurantes — menú interactivo, llamada al mesero y reseñas con bonificación.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
