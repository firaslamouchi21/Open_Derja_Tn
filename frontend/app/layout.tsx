import type { ReactNode } from "react";
import "./globals.css";
import { DEFAULT_UI_LOCALE, uiLocaleDirection } from "@/lib/i18n";
import { SessionProvider } from "@/lib/auth";
import { ApiQueryProvider } from "@/lib/api";

export const metadata = {
  title: "OpenDerja_TN",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_UI_LOCALE} dir={uiLocaleDirection(DEFAULT_UI_LOCALE)}>
      <body>
        <SessionProvider initialSession={null}>
          <ApiQueryProvider>{children}</ApiQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
