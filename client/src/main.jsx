import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./router/router.jsx";
import { RouterProvider } from "react-router";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
