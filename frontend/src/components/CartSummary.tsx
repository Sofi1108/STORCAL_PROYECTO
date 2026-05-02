import type { CartItem, Product } from "../types";
import "./cart.css";

interface CartProps {
  items: CartItem[];
  onAddToCart: (product: Product) => void;
  onDecreaseQuantity?: (productId: number) => void;
  onConfirm: () => void;
}

export default function Cart({
  items,
  onDecreaseQuantity,
  onAddToCart,
  onConfirm,
}: CartProps) {
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
                    className="item-btn btn-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(item.product);
                    }}
                    disabled={item.quantity >= item.product.stock}
                  >
                    ➕
                  </button>

                  <button
                    className="item-btn btn-remove"
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
              <button
                className="checkout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
              >
                Ir a pagar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
