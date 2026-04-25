import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Header from "./components/Header.tsx";
import CheckoutPage from "./components/CheckoutPage.tsx";
import IntranetLayout from "./components/IntranetLayout.tsx";
import IntranetHome from "./components/IntranetHome.tsx";
import ClockInPage from "./components/ClockInPage.tsx";
import ClockHistory from "./components/ClockHistory.tsx";
import AdminUsers from "./components/AdminUsers.tsx";
import LoginPage from "./components/LoginPage.tsx";
import RegisterPage from "./components/RegisterPage.tsx";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/intranet" element={<IntranetLayout />}>
          <Route index element={<IntranetHome />} />
          <Route path="fichajes" element={<ClockInPage />} />
          <Route path="historico" element={<ClockHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
