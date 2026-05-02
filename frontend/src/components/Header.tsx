import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import type { CartItem } from "../types";

function Header() {
  const navigate = useNavigate();
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const raw = sessionStorage.getItem("cart");
  const cart: CartItem[] = raw ? JSON.parse(raw) : [];
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const { customer, setCustomer } = useUser();

  const handleLogout = async () => {
    try {
      await fetch(`${ROUTE}api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setCustomer(null);
      navigate("/");
    } catch (error) {
      console.error("Error al desconectar:", error);
    }
  };

  return (
    <header className="site-header">
      <h1>CustomShop</h1>
      <p>Tienda de productos personalizados</p>
      <nav>
        {!customer ? (
          <button onClick={() => navigate("/login")}>Iniciar sesión</button>
        ) : (
          <>
            <p>Bienvenida, {customer.email}</p>
            <button
              onClick={() =>
                navigate(
                  customer.role === "customer"
                    ? "/mis-pedidos"
                    : "/mis-pedidos",
                )
              }
            >
              {customer.role === "customer"
                ? "Mis pedidos"
                : "Historial de pedidos"}
            </button>
            {customer.role === "admin" && (
              <>
                <button onClick={() => navigate("/admin/users")}>
                  Panel admin
                </button>
                <button onClick={() => navigate("/admin/users")}>
                  Usuarios
                </button>
              </>
            )}
            {customer.role === "employee" && (
              <button onClick={() => navigate("/intranet")}>
                Panel de empleados
              </button>
            )}
            {(customer.role === "admin" || customer.role === "employee") && (
              <button onClick={() => navigate("/admin/orders")}>Pedidos</button>
            )}
            <button onClick={handleLogout}>Cerrar sesión</button>
          </>
        )}
      </nav>
      {cartCount > 0 && <p>Carrito: {cartCount} items</p>}
    </header>
  );
}

export default Header;
