import { AuthProvider } from "./AuthProvider";


import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
        <AuthProvider>{children}</AuthProvider>
  );
}
