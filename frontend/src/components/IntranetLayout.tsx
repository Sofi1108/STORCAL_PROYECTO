import { Outlet, NavLink } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "./intranet.css";

export default function IntranetLayout() {
  const { customer } = useUser();

  return (
    <div className="intranet-layout">
      <header className="intranet-header">
        <h2>Intranet</h2>
        <p>Bienvenida, {customer?.email ?? "empleado"}</p>
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
