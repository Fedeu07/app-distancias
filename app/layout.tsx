import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'App Distancias',
  description: 'Gestión de centros operativos y búsqueda de distancias por ruta',
}

export const viewport: Viewport = {
  themeColor: '#E07B39',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-[#FAF7F4]">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  )
}
