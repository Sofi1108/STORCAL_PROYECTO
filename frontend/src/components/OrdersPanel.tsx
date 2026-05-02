import { useEffect, useState } from "react";
import type { Order } from "../types";
import "./checkout.css";

interface OrderWithDetails extends Order {
  customer_id: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#e65100",
  processing: "#1976d2",
  shipped: "#7b1fa2",
  delivered: "#2e7d32",
  cancelled: "#c62828",
};

export default function OrdersPanel() {
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${ROUTE}api/orders`, {
        credentials: "include",
      });
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`${ROUTE}api/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Error updating status");

      // Recargar la lista de pedidos
      await fetchOrders();
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  if (loading) return <div>Cargando pedidos...</div>;

  if (orders.length === 0) {
    return <div className="order-history">No hay pedidos.</div>;
  }

  return (
    <div className="order-history">
      <h2>Gestión de Pedidos</h2>
      <table className="orders-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Dirección</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.customer_id}</td>
              <td>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  style={{
                    backgroundColor: STATUS_COLORS[order.status] ?? "#333",
                    color: "white",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="pending">pending</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </td>
              <td>${order.total}</td>
              <td>{order.address}</td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
