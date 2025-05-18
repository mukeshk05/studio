
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// Toaster is now handled by Providers
// QueryClient and QueryClientProvider are now handled by Providers
// AuthProvider is now handled by Providers
import { Providers } from '@/components/layout/Providers';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BudgetRoam - AI Trip Planner',
  description: 'Plan your trips within budget using AI. Track prices and manage bookings effortlessly.',
};

// queryClient instance is now managed within Providers.tsx

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <Providers>
          {children}
          {/* Toaster is rendered inside Providers */}
        </Providers>
      </body>
    </html>
  );
}
