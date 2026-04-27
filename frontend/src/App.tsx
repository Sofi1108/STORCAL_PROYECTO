import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Routes, Route } from "react-router-dom";

import type { Product, CartItem } from "./types";

import ProductCard from "./components/ProductCard";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import CartButton from "./components/CartButton";

function App() {
  const navigate = useNavigate();
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [products, setProducts] = useState<Product[]>([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  const loadProducts = (): void => {
    fetch(`${ROUTE}api/products`)
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch((error) => console.error("Error:", error));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    sessionStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product): void => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock) {
          return prev;
        }

        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }

      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number): void => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number): void => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const decreaseQuantity = (productId: number): void => {
    updateQuantity(productId, -1);
  };

  const handleUpdateStock = (
    id: number,
    name: string,
    description: string,
    price: number,
    category: string,
    image_url: string,
    currentStock: number,
  ): void => {
    const input = window.prompt(`Stock actual: ${currentStock}. Nuevo stock:`);
    if (input === null) return;
    const newStock = parseInt(input);
    if (isNaN(newStock) || newStock < 0) {
      alert("El stock debe ser un número mayor o igual a 0");
      return;
    }
    fetch(`${ROUTE}api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: newStock }),
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
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },

      body: JSON.stringify({
        name: newName,
        price: parseFloat(newPrice),
        description: newDescription || undefined,
        category: newCategory || undefined,
        stock: newStock ? parseInt(newStock) : undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error " + res.status);
        return res.json();
      })
      .then(() => {
        setNewName("");
        setNewPrice("");
        setNewCategory("");
        setNewStock("");
        setNewDescription("");
        loadProducts();
      })
      .catch((error) => console.error("Error:", error));
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Cart
              items={cart}
              onAddToCart={addToCart}
              onDecreaseQuantity={decreaseQuantity}
              onConfirm={() => navigate(`/checkout`)}
            />
            <form className="add-product-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Nombre *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Descripción"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio *"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
              <input
                type="text"
                placeholder="Categoría"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <input
                type="number"
                placeholder="Stock"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
              />
              <button type="submit">Añadir producto</button>
            </form>
            <div className="products-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card-container">
                  <CartButton
                    product={product}
                    cart={cart}
                    onAddToCart={addToCart}
                    onRemoveFromCart={removeFromCart}
                    onDecreaseQuantity={decreaseQuantity}
                  />
                  <ProductCard
                    product={product}
                    onSelect={(id) => navigate(`/product/${id}`)}
                  />
                  <div className="product-card actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStock(
                          product.id,
                          product.name,
                          product.description,
                          product.price,
                          product.category,
                          product.image_url,
                          product.stock,
                        );
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        }
      />

      <Route
        path="/product/:id"
        element={
          <>
            <Cart
              items={cart}
              onAddToCart={addToCart}
              onDecreaseQuantity={decreaseQuantity}
              onConfirm={() => navigate("/checkout")}
            />
            <ProductDetail
              cart={cart}
              onAddToCart={addToCart}
              onRemoveFromCart={removeFromCart}
              onDecreaseQuantity={decreaseQuantity}
            />
          </>
        }
      />
    </Routes>
  );
}

export default App;
