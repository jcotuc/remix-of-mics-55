import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./api"; // Import api.ts for client configuration

createRoot(document.getElementById("root")!).render(<App />);
