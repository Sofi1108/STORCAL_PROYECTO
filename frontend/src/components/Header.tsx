import type { CartItem } from "../types";

function Header() {
  const raw = sessionStorage.getItem("cart");
  const cart: CartItem[] = raw ? JSON.parse(raw) : [];
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const rawUser = sessionStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  return (
    <header className="site-header">
      <h1>CustomShop</h1>
      <p>Tienda de productos personalizados</p>
      {user && <p>Bienvenida, {user.username}</p>}
    </header>
  );
}
export default Header;
