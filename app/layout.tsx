'use client'
import "./globals.css";
import UserProvider from "./utils/userContext"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/logo.png" />
        <title>Voixa App</title> {/* Optional: add a title */}
      </head>
      <body className="select-none">
        <UserProvider>
          {children}
        </UserProvider>     
      </body>
    </html>
  );
}
