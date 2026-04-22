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
  const result = await pool.query(
    "SELECT * FROM products WHERE deleted_at IS NULL ORDER BY id",
  );
  res.json(result.rows); // ← devuelve las filas de la BD
});

app.get("/api/products/inactive", async (req: Request, res: Response) => {
  const result = await pool.query(
    "SELECT * FROM products WHERE active = false ORDER BY id",
  );
  res.json(result.rows); // ← devuelve las filas de la BD
});

app.get(
  "/api/products/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseInt(req.params.id);
    const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  },
);

app.get("/api/test", async (req: Request, res: Response) => {
  const result = await pool.query("SELECT NOW()");
  res.json({ connected: true, time: result.rows[0].now });
});

app.get("/api/orders", async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT o.id, o.created_at, oi.product_id, oi.quantity, p.name AS product_name
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id`,
  );
  res.json(result.rows);
});

app.get(
  "/api/orders/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const orderId = parseInt(req.params.id);
    const orderResult = await pool.query(
      `SELECT id, status, total, address, created_at
         FROM orders WHERE id = $1`,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [orderId],
    );

    res.json({ order: orderResult.rows[0], items: itemsResult.rows });
  },
);

app.post(
  "/api/products",
  async (
    req: Request<
      {},
      {},
      {
        name: string;
        description?: string;
        price: number;
        category?: string;
        stock?: number;
        image_url?: string;
      }
    >,
    res: Response,
  ) => {
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
        image_url ??
          `https://placehold.co/200x200?text=${encodeURIComponent(name)}`,
      ],
    );

    const newProduct = result.rows[0];

    res
      .status(201)
      .json({ message: "Producto añadido correctamente", product: newProduct });
  },
);

app.post(
  "/api/orders",
  async (
    // 1. Tipamos el body directamente en el Request, no hace falta usar "as" después
    req: Request<
      {},
      {},
      {
        items: { product_id: number; quantity: number; unitPrice: number }[];
        address: string;
      }
    >,
    res: Response,
  ) => {
    const { items, address } = req.body;

    // 2. Validación inicial del carrito
    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "La orden debe contener al menos un producto" });
    }

    // 3. Validar cada item y consultar el stock
    for (const item of items) {
      // Mensaje de error más genérico para abarcar todas estas condiciones
      if (!item.product_id || item.unitPrice <= 0 || item.quantity <= 0) {
        return res.status(400).json({
          error:
            "Cada item debe tener un product_id válido y cantidades/precios mayores a 0",
        });
      }

      // Validamos si el producto existe y está activo
      const productResult = await pool.query(
        "SELECT stock FROM products WHERE id = $1 AND active = TRUE AND deleted_at IS NULL",
        [item.product_id], // Corregido: antes tenías item.product_Id con "I" mayúscula
      );

      if (productResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: `Producto con id ${item.product_id} no encontrado` });
      }

      // Validamos si hay stock suficiente
      if (productResult.rows[0].stock < item.quantity) {
        return res.status(400).json({
          error: `No hay suficiente stock para el producto con id ${item.product_id}`,
        });
      }
    }

    // 4. Calculamos el total de la orden
    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // 5. Iniciamos la transacción para guardar la orden
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query("COMMIT"); // Si todo va bien, confirmamos los cambios
      return res.status(201).json({ message: "Orden creada con éxito", total });
    } catch (error) {
      await client.query("ROLLBACK"); // Si algo falla, deshacemos los cambios
      console.error("Error processing order:", error);
      return res.status(500).json({ error: "Error al procesar la orden" });
    } finally {
      client.release(); // Siempre liberamos el cliente de vuelta al pool
    }
  },
);

// Actualizar stock
app.put(
  "/api/products/:id",
  async (
    req: Request<
      { id: string },
      {},
      {
        name: string;
        description?: string;
        price: number;
        category?: string;
        stock?: number;
        image_url?: string;
      }
    >,
    res: Response,
  ) => {
    const { id } = req.params;
    const { name, description, price, category, stock, image_url } = req.body;

    const result = await pool.query(
      "UPDATE products" +
        " SET name=$1, description=$2, price=$3, category=$4, stock=$5, image_url=$6" +
        " WHERE id=$7 RETURNING *",
      [
        name,
        description ?? "",
        price,
        category ?? "General",
        stock ?? 0,
        image_url ?? "",
        parseInt(id),
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto actualizado", product: result.rows[0] });
  },
);

// Parte 2 — Soft delete
app.delete(
  "/api/products/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseInt(req.params.id);

    // Comprobar si el producto está en algún pedido
    const inOrders = await pool.query(
      "SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1",
      [id],
    );

    if (inOrders.rows.length > 0) {
      // Está en pedidos → soft delete
      const result = await pool.query(
        "UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
        [id],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Producto no encontrado" });
      return res.json({
        message: "Producto eliminado (soft)",
        product: result.rows[0],
      });
    }

    // No está en pedidos → hard delete
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ message: "Producto eliminado", product: result.rows[0] });
  },
);

// Parte 3 — Toggle activar/desactivar
app.patch(
  "/api/products/:id/toggle",
  async (req: Request<{ id: string }>, res: Response) => {
    const result = await pool.query(
      "UPDATE products SET active = NOT active WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [parseInt(req.params.id)],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });
    const p = result.rows[0];
    res.json({
      message: p.active ? "Producto activado" : "Producto desactivado",
      product: p,
    });
  },
);
