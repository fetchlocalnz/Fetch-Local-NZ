export default function manifest() {
  return {
    name: "Fetch Local",
    short_name: "Fetch Local",
    description: "Find dog training and play buddies near you in NZ.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6EFE3",
    theme_color: "#C1592C",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
