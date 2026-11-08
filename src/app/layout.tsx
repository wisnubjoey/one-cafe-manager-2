import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Catalog of products",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
