import { useEffect, useState } from "react";
import type { Product } from "./types";
import ProductCard from "./components/ProductCard";
import { useNavigate } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import ProductDetail from "./components/ProductDetail";

function App() {
  const navigate = useNavigate();
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [products, setProducts] = useState<Product[]>([]);
  const [newName,        setNewName]        = useState("");
  const [newPrice,       setNewPrice]       = useState("");
  const [newCategory,    setNewCategory]    = useState("");
  const [newStock,       setNewStock]       = useState("");
  const [newDescription, setNewDescription] = useState("");

  const loadProducts = (): void => {
    fetch(``)
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch((error) => console.error("Error:", error));
  };

  useEffect(() => { loadProducts(); }, []);

    const handleUpdateStock = (id: number, currentStock: number): void => {
    const input = window.prompt(`Stock actual: ${currentStock}. Nuevo stock:`);
    if (input === null) return;
    const newStock = parseInt(input);
    if (isNaN(newStock) || newStock < 0) {
      alert("El stock debe ser un número mayor o igual a 0");
      return;
    }
    fetch(`${ROUTE}api/products/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ stock: newStock })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error del servidor: " + res.status);
        return res.json();
      })
      .then(() => loadProducts())
      .catch((error) => console.error("Error:", error));
  };
  
  const handleDelete = (id: number): void => {
    if (!window.confirm("¿Seguro que quieres borrar este producto?")) return;
    fetch(`${ROUTE}api/products/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Error del servidor: " + res.status);
        return res.json();
      })
      .then(() => loadProducts())
      .catch((error) => console.error("Error:", error));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    fetch("http://localhost:3000/api/products", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:        newName,
        price:       parseFloat(newPrice),
        description: newDescription || undefined,
        category:    newCategory || undefined,
        stock:       newStock ? parseInt(newStock) : undefined
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error " + res.status);
        return res.json();
      })
      .then(() => {
        setNewName(""); setNewPrice("");
        setNewCategory(""); setNewStock("");
        setNewDescription("");
        loadProducts();
      })
      .catch((error) => console.error("Error:", error));
  };

return (
    <Routes>
      <Route path="/" element={
        <>
            <form className="add-product-form" onSubmit={handleSubmit}>
            <input type="text"   placeholder="Nombre *"    value={newName}        onChange={e => setNewName(e.target.value)} />
            <input type="text"   placeholder="Descripción" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            <input type="number" step="0.01" placeholder="Precio *" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
            <input type="text"   placeholder="Categoría"  value={newCategory}    onChange={e => setNewCategory(e.target.value)} />
            <input type="number" placeholder="Stock"       value={newStock}       onChange={e => setNewStock(e.target.value)} />
            <button type="submit">Añadir producto</button>
          </form>
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card-container">
                <ProductCard product={product} onSelect={(id) => navigate(`/product/${id}`)}/>
                <div className="product-card actions">
                   <button onClick={(e) => { e.stopPropagation(); handleUpdateStock(product.id, product.stock); }}>✏️</button>
                   <button className="btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </>
      } />

      <Route path="/product/:id" element={<ProductDetail />} />
    </Routes>
  );
}

export default App;
