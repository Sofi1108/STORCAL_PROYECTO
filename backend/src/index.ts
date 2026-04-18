import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import type { Product } from "./types.ts";
import { pool } from "../db.js";

const app = express();
const PORT = 3000;


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

app.get("/api/products", async (req: Request, res: Response) => {
  const result = await pool.query("SELECT * FROM products ORDER BY id");
  res.json(result.rows); // ← devuelve las filas de la BD
});

app.get("/api/products/:id", async (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id);
  const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);

  if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
  }
  res.json(result.rows[0]);
});

app.get("/api/test", async (req: Request, res: Response) => {
const result = await pool.query("SELECT NOW()");
res.json({ connected: true, time: result.rows[0].now });
});

app.post("/api/products", async (req: Request<{}, {}, {
name: string; description?: string; price: number;
    category?: string; stock?: number; image_url?: string;
}>, res: Response) => {
    const { name, description, price, category, stock, image_url } = req.body;

    if (!name) {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    if (price === undefined || price <= 0) {
        return res.status(400).json({ error: "El precio debe ser mayor que 0" });
    }
    if (stock !== undefined && stock < 0) {
        return res.status(400).json({ error: "El stock no puede ser negativo" });
    }

    const result = await pool.query(
        `INSERT INTO products (name, description, price, category, stock, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            name, 
            description ?? "", 
            Math.round(price * 100) / 100, 
            category ?? "General", 
            stock ?? 0, 
            image_url ?? `https://placehold.co/200x200?text=${encodeURIComponent(name)}`
        ]
    );

    const newProduct = result.rows[0];

    res.status(201).json({ message: "Producto añadido correctamente", product: newProduct });
});

// Actualizar stock
app.put("/api/products/:id", async (req: Request<{ id: string }, {}, { stock: number }>, res: Response) => {
    const id      = parseInt(req.params.id);
    const { stock } = req.body;

    const result = await pool.query("UPDATE products SET stock = $1 WHERE id = $2 RETURNING *",[stock, id]);
    
    if (result.rows.length === 0) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
    }
    if (stock === undefined || stock < 0) {
        res.status(400).json({ error: "El stock debe ser mayor o igual a 0" });
        return;
    }
    res.json({ message: "Stock actualizado", product: result.rows[0] });
});

// Eliminar
app.delete("/api/products/:id", async (req: Request<{ id: string }>, res: Response) => {
    const id    = parseInt(req.params.id);
    const result = await pool.query("SELECT * FROM products WHERE id=$1 RETURNING *", [id]);

    if (result.rows.length === 0) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
    }
    res.json({ message: "Producto eliminado", product: result.rows[0]});
});