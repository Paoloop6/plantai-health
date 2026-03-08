import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import "@fontsource/bitter/400.css";
import "@fontsource/bitter/600.css";
import "@fontsource/bitter/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";

createRoot(document.getElementById("root")!).render(<App />);
