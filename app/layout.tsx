import { AuthProvider } from "./AuthProvider";
import { ReactNode } from "react";
import { ConfigProvider } from "antd";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="preload" href="/_next/static/chunks/antd.css" as="style" />
      </head>
      <body suppressHydrationWarning>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#1677ff",
            },
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
