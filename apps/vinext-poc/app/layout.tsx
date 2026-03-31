export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <title>FisioFlow Vinext PoC</title>
        <meta name="description" content="Prova de Conceito do Vinext (Cloudflare)" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
