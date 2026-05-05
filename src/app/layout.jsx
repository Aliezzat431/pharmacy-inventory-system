import { Inter } from "next/font/google";
import "./globals.css";

import ReduxProvider from "./components/ReduxProvider";
import ThemeProvider from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastContext";
import AuthWrapper from "./components/AuthWrapper";
import ChatWidget from "./components/Chat/ChatWidget";
import AppErrorBoundary from "./components/AppErrorBoundary";

import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "نظام إدارة الصيدلية",
  description: "نظام متكامل لإدارة الصيدليات",

  icons: {
    icon: "https://media.istockphoto.com/id/1313889711/vector/pharmacy-logo-icon-design-vector.jpg",
  },
};

function Providers({ children }) {
  return (
    <ReduxProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthWrapper>
            {children}
            <ChatWidget />
          </AuthWrapper>

          <Toaster richColors position="top-center" />
        </ToastProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200..700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className={inter.className}>
        <AppErrorBoundary>
          <Providers>{children}</Providers>
        </AppErrorBoundary>
      </body>
    </html>
  );
}