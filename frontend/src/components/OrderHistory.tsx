import { useEffect, useState } from "react";
import type { Order } from "../types";
import "./checkout.css";

interface OrderDetail extends Order {
  items?: Array<{
    name: string;
    image_url: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#e65100",
  processing: "#1976d2",
  shipped: "#7b1fa2",
  delivered: "#2e7d32",
  cancelled: "#c62828",
};

export default function OrderHistory() {
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;

    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetch(`${ROUTE}api/orders/customer/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleRowClick = async (orderId: number) => {
    try {
      const res = await fetch(`${ROUTE}api/orders/${orderId}`);
      const data = await res.json();
      setSelectedOrder(data);
    } catch (err) {
      console.error("Error al cargar detalles del pedido:", err);
    }
  };

  if (loading) return <div>Cargando...</div>;

  if (orders.length === 0) {
    return <div className="order-history">No hay pedidos todavía.</div>;
  }

  return (
    <div className="order-history">
      <h2>Mis pedidos</h2>
      <table className="orders-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} onClick={() => handleRowClick(order.id)}>
              <td>#{order.id}</td>
              <td
                style={{
                  backgroundColor: STATUS_COLORS[order.status] ?? "#333",
                  color: "white",
                  padding: "0.5rem",
                  borderRadius: "4px",
                }}
              >
                {order.status}
              </td>
              <td>${order.total}</td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder && (
        <div className="order-detail">
          <h3>Detalle del pedido #{selectedOrder.id}</h3>
          <p>
            <strong>Dirección:</strong> {selectedOrder.address}
          </p>
          <table className="detail-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items?.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>${item.unit_price}</td>
                  <td>${item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setSelectedOrder(null)}>Cerrar detalle</button>
        </div>
      )}
    </div>
  );
}
