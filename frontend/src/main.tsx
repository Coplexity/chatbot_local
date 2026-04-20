import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./css/tailwind.css";
import "./css/index.css";

const App = lazy(async () => {
  const module = await import("./app");
  return { default: module.App };
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
