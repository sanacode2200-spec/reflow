"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="default"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="reflow-theme"
      themes={["default", "dark"]}
    >
      {children}
    </NextThemesProvider>
  );
}
