import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CartItem, Order } from "../types";
import "./checkout.css";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    setCart(cart);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.product.price,
    }));

    try {
      const res = await fetch(`${ROUTE}api/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, address }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear el pedido");
        return;
      }

      setSuccess(data.order);
      setOrderItems(cart);
      sessionStorage.removeItem("cart");
      setCart([]);
    } catch (err) {
      setError("Error al conectar con el servidor");
    }
  };

  if (success) {
    return (
      <div className="checkout-container">
        <div className="success-message">
          <h2>¡Pedido creado exitosamente!</h2>
          <p>
            Número de pedido: <strong>#{success.id}</strong>
          </p>
          <p>
            Dirección: <strong>{success.address}</strong>
          </p>

          <div className="success-items">
            <h3>Resumen de tu compra</h3>
            <table className="order-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.product.id}>
                    <td>{item.product.name}</td>
                    <td>{item.quantity}</td>
                    <td>${Number(item.product.price).toFixed(2)}</td>
                    <td>
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="order-total">
              <strong>Total: ${success.total}</strong>
            </div>
          </div>

          <button onClick={() => navigate("/")}>Volver a la tienda</button>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !success) {
    return (
      <div className="checkout-container">
        <div className="empty-cart">
          <p>El carrito está vacío.</p>
          <button onClick={() => navigate("/")}>Volver a la tienda</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h2>Completar pedido</h2>

      <div className="checkout-content">
        <div className="order-summary">
          <h3>Resumen del pedido</h3>
          <table className="order-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.product.id}>
                  <td>{item.product.name}</td>
                  <td>{item.quantity}</td>
                  <td>${Number(item.product.price).toFixed(2)}</td>
                  <td>
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="order-total">
            <strong>Total: ${total.toFixed(2)}</strong>
          </div>
        </div>

        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="address">Dirección de envío:</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Calle Mayor 12, Madrid"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              type="submit"
              className="primary-btn"
              disabled={!address.trim()}
            >
              Completar pedido
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/")}
            >
              ← Volver al carrito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
