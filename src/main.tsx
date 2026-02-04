import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "xp.css/dist/XP.css";
import "./index.css";
import App from "./App.tsx";

console.log("[DEBUG] main.tsx executing");

const rootElement = document.getElementById("root");
console.log("[DEBUG] rootElement found:", !!rootElement);

if (!rootElement) throw new Error("Root element not found");

try {
  const root = createRoot(rootElement);
  console.log("[DEBUG] Root created, calling render...");
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log("[DEBUG] Render called successfully");
} catch (err) {
  console.error("[DEBUG] Render failed:", err);
}
