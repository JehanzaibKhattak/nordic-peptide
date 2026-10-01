// Keep this public preview browse-only by default. Set the Vercel environment
// variable NEXT_PUBLIC_BROWSE_ONLY=false after a persistent database and live
// checkout have been configured.
export const BROWSE_ONLY = process.env.NEXT_PUBLIC_BROWSE_ONLY !== "false";
