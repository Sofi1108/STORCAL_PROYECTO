import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ProductDetail from "./components/ProductDetail";
import NotFound from "./components/NotFound.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />

      <Route path="product/:id" element={<ProductDetail />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>,
);
