import './globals.css'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>{children}</body>
    </html>
  )
}
