import "./globals.css";

export const metadata = {
  title: "Fetch Local",
  description: "Find dog training and play buddies near you in NZ.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fetch Local",
  },
};

export const viewport = {
  themeColor: "#C1592C",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
