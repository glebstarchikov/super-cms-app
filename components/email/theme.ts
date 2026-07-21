// These hex values are the email-safe equivalents of the app's light theme tokens
// from app/globals.css. We resolve them here because email clients should not rely
// on CSS variables or OKLCH support.
export const emailTheme = {
  background: "#FBFAF7",
  foreground: "#17181A",
  muted: "#F2F0EA",
  mutedForeground: "#6B6C70",
  link: "#17181A",
  mutedLink: "#6B6C70",
  buttonBackground: "#E8502D",
  buttonForeground: "#FFFFFF",
  buttonBorder: "#E8502D",
} as const;
