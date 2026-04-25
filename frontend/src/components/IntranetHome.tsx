import { useNavigate } from "react-router-dom";

export default function IntranetHome() {
  const navigate = useNavigate();
  const raw = sessionStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  return (
    <div className="intranet-home">
      <h2>Bienvenida a la Intranet</h2>
      <p>Hola, {user?.username ?? "empleado"}. Gestiona tus datos desde aquí.</p>
      <button onClick={() => navigate("/intranet/fichajes")}>
        Ir a fichajes
      </button>
    </div>
  );
}
