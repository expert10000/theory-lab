import React from "react";
import { createRoot } from "react-dom/client";
import "../../../packages/ui/theme.css";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(<App />);
