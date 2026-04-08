import { useEffect, useState } from "react";
import type { Product } from "./types";
import ProductCard from "./components/ProductCard";

function App() {
  const [products, setProducts] = useState<Product[]>([]);

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
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default App;
