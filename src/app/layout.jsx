import './globals.css'

export const metadata = {
  title: 'BotBlock',
  description: 'Block unwanted crawlers, file types, and protect sensitive paths.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
