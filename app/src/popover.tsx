import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DiceApp } from "./DiceApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiceApp />
  </StrictMode>
);
