import { useLocation } from "react-router-dom";
import type { Product, CartItem } from "../types";
import "./cartButton.css";

export interface CartButtonProps {
  product: Product;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: number) => void;
  onDecreaseQuantity: (productId: number) => void;
}

export default function CartButton({
  product,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onDecreaseQuantity,
}: CartButtonProps) {
  const location = useLocation();
  const isProductDetail = location.pathname.startsWith("/product/");

  const cartItem = cart.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  return (
    <div
      className={`cart-button-wrapper ${isProductDetail ? "cart-button-detail" : ""}`}
    >
      <button
        className="btn-add-corner"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product);
        }}
        disabled={quantity >= product.stock || product.stock === 0}
      >
        🛒
        {quantity > 0 && <span className="qty-badge">{quantity}</span>}
      </button>

      {quantity > 0 && (
        <div className="cart-menu">
          <div className="menu-item">
            <span className="menu-label">En carrito:</span>
            <span className="menu-value">{quantity}</span>
          </div>

          <button
            className="menu-btn decrease"
            onClick={(e) => {
              e.stopPropagation();
              onDecreaseQuantity(product.id);
            }}
          >
            ➖ Restar
          </button>

          <button
            className="menu-btn add"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={quantity >= product.stock}
          >
            ➕ Añadir
          </button>

          <button
            className="menu-btn remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromCart(product.id);
            }}
          >
            🗑️ Quitar todo
          </button>
        </div>
      )}
    </div>
  );
}
