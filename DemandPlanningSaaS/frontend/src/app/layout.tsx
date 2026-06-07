import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demand Forecaster Pro',
  description: 'Enterprise Grade Demand Planning & Forecasting Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
