import './globals.css'
import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/store/AuthContext'
import { PlatformProvider } from '@/store/PlatformContext'

export const metadata: Metadata = {
  title: 'Planora AI — Enterprise Demand Planning',
  description: 'Enterprise-grade Demand Planning, S&OP, and Inventory Optimization powered by AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PlatformProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
