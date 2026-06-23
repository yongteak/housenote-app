/**
 * @file main.tsx
 * @description React 앱 엔트리. 전역 스타일과 App 루트를 렌더링한다.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("root 엘리먼트를 찾을 수 없습니다.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
