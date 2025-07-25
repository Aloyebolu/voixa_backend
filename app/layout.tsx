'use client'
import "./globals.css";
import UserProvider from "./utils/userContext"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // const user = localStorage.getItem('userId')
  // const {user, setUser} = useContext(UserContext)
  
  return (
    <html lang="en" content="width=device-width, maximum-scale=1.0, users-scalable=no, initial-scale=1.0">
      <body className="select-none">
        <UserProvider>
          {children}
        </UserProvider>     
      </body>
    </html>
  );
}
