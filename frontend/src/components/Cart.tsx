import type { CartItem } from "../types";
import "../cart.css";

interface CartProps {
  items: CartItem[];
  onDecreaseQuantity?: (productId: number) => void;
}

export default function Cart({ items, onDecreaseQuantity }: CartProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <div className="cart-widget">
      <div className="cart-icon">
        🛒
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </div>
      <div className="cart-popup">
        <h3>Carrito</h3>
        {items.length === 0 ? (
          <p className="cart-empty">Carrito vacío</p>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.product.id} className="cart-item">
                  <span className="item-name">{item.product.name}</span>
                  <span className="item-qty">x{item.quantity}</span>
                  <span className="item-price">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    className="item-btn decrease"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDecreaseQuantity?.(item.product.id);
                    }}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="cart-total">
                Total: <strong>${totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
