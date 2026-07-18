const DEV_BASE_URL = "http://localhost:3000";

export const getBaseUrl = () => {
  const baseUrl = process.env.BASE_URL?.trim();

  if (baseUrl) {
    return baseUrl;
  }

  // Vercel exposes the project's stable production domain at build and runtime,
  // so a deploy works before BASE_URL (i.e. a custom domain) is set.
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_BASE_URL;
  }

  throw new Error("Missing BASE_URL. Set BASE_URL in production.");
};
