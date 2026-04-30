import { useEffect, useState } from "react";
import "./admin-users.css";
import type { Customer } from "../types";

export default function AdminUsers() {
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [users, setUsers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ROUTE}api/admin/users`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`${ROUTE}api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        );
      }
    } catch (err) {
      console.error("Error al cambiar rol:", err);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: boolean) => {
    try {
      const res = await fetch(`${ROUTE}api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      });

      if (res.ok) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, active: newStatus } : u)),
        );
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  if (loading) return <div className="loading">Cargando usuarios...</div>;

  return (
    <div className="admin-users-container">
      <h2>Gestión de Usuarios</h2>
      <div className="users-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option>customer</option>
                    <option>employee</option>
                    <option>admin</option>
                  </select>
                </td>
                <td>{user.active ? "Activo" : "Suspendido"}</td>
                <td>
                  <button
                    onClick={() => handleStatusChange(user.id, !user.active)}
                  >
                    {user.active ? "Suspender" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
