import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import type { Product } from "./types.ts";

const app = express();
const PORT = 3000;

const products: Product[] = [
  {
    id: 1,
    name: "Camiseta Unboxing",
    description: "Camiseta negra con diseño retro de unboxing.",
    price: 19.99,
    category: "Ropa",
    stock: 50,
    imageUrl: "https://placehold.co/200x200?text=Camiseta",
  },
  {
    id: 2,
    name: "Taza Bug Hunter",
    description: "Taza blanca con mensaje para programadores.",
    price: 12.5,
    category: "Cocina",
    stock: 30,
    imageUrl: "https://placehold.co/200x200?text=Taza",
  },
  {
    id: 3,
    name: "Funda Dark Mode",
    description: "Funda para móvil con diseño minimalista.",
    price: 15.0,
    category: "Accesorios",
    stock: 20,
    imageUrl: "https://placehold.co/200x200?text=Funda",
  },
  {
    id: 4,
    name: "Sudadera npm ci",
    description: "Sudadera gris con eslogan de desarrollo.",
    price: 35.0,
    category: "Ropa",
    stock: 15,
    imageUrl: "https://placehold.co/200x200?text=Sudadera",
  },
  {
    id: 5,
    name: "Sticker Pack Dev",
    description: "Set de 10 stickers con iconos tech.",
    price: 5.99,
    category: "Papelería",
    stock: 100,
    imageUrl: "https://placehold.co/200x200?text=Stickers",
  },
];

app.use(cors());
app.use(express.json());

let nextId = products.length + 1;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

app.get("/", (req: Request, res: Response) => {
  res.send("Backend de la tienda funcionando");
});

app.get("/api/hello", (req: Request, res: Response) => {
  res.json({ message: "Hola desde el backend" });
});

app.get("/api/products", (req: Request, res: Response) => {
  res.json(products);
});

app.get("/api/products/:id", (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  res.json(product);
});

app.post("/api/products", (req: Request<{}, {}, {
    name: string; description?: string; price: number;
    category?: string; stock?: number; imageUrl?: string;
}>, res: Response) => {
    const { name, description, price, category, stock, imageUrl } = req.body;

    if (!name) {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    if (price === undefined || price <= 0) {
        return res.status(400).json({ error: "El precio debe ser mayor que 0" });
    }
    if (stock !== undefined && stock < 0) {
        return res.status(400).json({ error: "El stock no puede ser negativo" });
    }

    const newProduct: Product = {
        id:          nextId++,
        name:        name,
        description: description ?? "",
        price:       Math.round(price * 100) / 100,
        category:    category ?? "General",
        stock:       stock ?? 0,
        imageUrl:    imageUrl ?? `https://placehold.co/200x200?text=${encodeURIComponent(name)}`
    };

    products.push(newProduct);
    res.status(201).json({ message: "Producto añadido correctamente", product: newProduct });
});

// Actualizar stock
app.put("/api/products/:id", (req: Request<{ id: string }, {}, { stock: number }>, res: Response) => {
    const id      = parseInt(req.params.id);
    const { stock } = req.body;
    const product = products.find((p) => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
    }
    if (stock === undefined || stock < 0) {
        res.status(400).json({ error: "El stock debe ser mayor o igual a 0" });
        return;
    }
    product.stock = stock;
    res.json({ message: "Stock actualizado", product });
});

// Eliminar
app.delete("/api/products/:id", (req: Request<{ id: string }>, res: Response) => {
    const id    = parseInt(req.params.id);
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
    }
    const deleted = products[index];
    products.splice(index, 1);
    res.json({ message: "Producto eliminado", product: deleted });
});