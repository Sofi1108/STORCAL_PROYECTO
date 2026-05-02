import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function IntranetHome() {
  const navigate = useNavigate();
  const { customer } = useUser();

  return (
    <div className="intranet-home">
      <h2>Bienvenida a la Intranet</h2>
      <p>
        Hola, {customer?.email ?? "empleado"}. Gestiona tus datos desde aquí.
      </p>
      <button onClick={() => navigate("/intranet/fichajes")}>
        Ir a fichajes
      </button>
    </div>
  );
}
