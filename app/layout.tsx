import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "READ OR PAY",
  description: "读书对赌 - 不读就罚",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
