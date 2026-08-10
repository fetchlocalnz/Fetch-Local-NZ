import "./globals.css";

export const metadata = {
  title: "Fetch Local",
  description: "Find dog training and play buddies near you in NZ.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
