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
