import { Outlet, NavLink } from "react-router-dom";
import "./intranet.css";

export default function IntranetLayout() {
  const raw = sessionStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  return (
    <div className="intranet-layout">
      <header className="intranet-header">
        <h2>Intranet</h2>
        <p>Bienvenida, {user?.username ?? "empleado"}</p>
      </header>

      <nav className="intranet-nav">
        <NavLink to="/intranet" end>
          Bienvenida
        </NavLink>
        <NavLink to="/intranet/fichajes">Fichajes</NavLink>
        <NavLink to="/intranet/historico">Histórico</NavLink>
      </nav>

      <div className="intranet-content">
        <Outlet />
      </div>
    </div>
  );
}
