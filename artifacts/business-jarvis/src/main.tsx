import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// On Railway (or any deployment where the API lives on a different domain),
// set VITE_API_URL at build time so all API calls are routed correctly.
// On Replit the shared reverse proxy handles routing, so no base URL is needed.
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL as string);
}

createRoot(document.getElementById("root")!).render(<App />);
