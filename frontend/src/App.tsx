import { useEffect, useState } from "react";
import type { Product } from "./types";
import ProductCard from "./components/ProductCard";
import { useNavigate } from "react-router-dom";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:3000/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error("Error", error));
  }, []);

  return (
    <div className="products-grid">
      <h1>CustomShop</h1>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          // Al hacer clic, navegamos a la ruta del producto
          onSelect={(id) => navigate(`product/${id}`)}
        />
      ))}
    </div>
  );
}

export default App;
