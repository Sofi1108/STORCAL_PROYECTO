import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Product } from "../types";
import "./product-detail.css";

function ProductDetail() {
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
        src={product.imageUrl}
        alt={product.name}
      />

      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">{product.price}€</p>
    </div>
  );
}

export default ProductDetail;
