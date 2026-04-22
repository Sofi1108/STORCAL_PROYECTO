import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Product, CartItem } from "../types";
import "./product-detail.css";
import CartButton from "./CartButton";
import Cart from "./Cart";

interface ProductDetailProps {
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: number) => void;
  onDecreaseQuantity: (productId: number) => void;
}

function ProductDetail({
  cart,
  onAddToCart,
  onRemoveFromCart,
  onDecreaseQuantity,
}: ProductDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState(false); // Estado para manejar ID inexistente

  useEffect(() => {
    fetch(`http://localhost:3000/api/products/${id}`)
      .then((res) => {
        if (!res.ok) {
          // Si el ID no existe en la base de datos (404 de API)
          setError(true);
          throw new Error("Producto no encontrado");
        }
        return res.json();
      })
      .then((data) => setProduct(data))
      .catch((err) => {
        console.error(err);
        setError(true);
      });
  }, [id]);

  if (error) {
    return (
      <div className="product-detail">
        <h2>El producto con ID {id} no existe.</h2>
        <button className="product-detail_back" onClick={() => navigate("/")}>
          Volver al catálogo
        </button>
      </div>
    );
  }

  if (!product) return <p>Cargando...</p>;

  return (
    <div className="product-detail">
      <button className="product-detail_back" onClick={() => navigate("/")}>
        ← Volver
      </button>

      <img
        className="product-detail_img"
        src={product.image_url}
        alt={product.name}
      />

      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">{product.price}€</p>
      <p className="stock">
        Stock:{" "}
        <span className={product.stock > 0 ? "in-stock" : "out-of-stock"}>
          {product.stock > 0
            ? `${product.stock} disponible${product.stock !== 1 ? "s" : ""}`
            : "Sin stock"}
        </span>
      </p>

      <CartButton
        product={product}
        cart={cart}
        onAddToCart={onAddToCart}
        onRemoveFromCart={onRemoveFromCart}
        onDecreaseQuantity={onDecreaseQuantity}
      />
    </div>
  );
}

export default ProductDetail;
