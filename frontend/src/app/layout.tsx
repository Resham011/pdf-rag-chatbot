import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
     title: "AskMyPDF - AI PDF Chatbot",
     description: "Upload PDFs and ask questions using AI",
};

export default function RootLayout({
     children,
     }: Readonly<{
     children: React.ReactNode;
}>) {
     return (
     <html lang="en">
          <body className="antialiased">
          {children}
          </body>
     </html>
     );
}
