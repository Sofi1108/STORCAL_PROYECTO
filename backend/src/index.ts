import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import type { Product } from "./types.ts";
import { pool } from "./db.js";

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
      `SELECT 
        p.name, p.image_url, oi.quantity, oi.unit_price,
        (oi.quantity * oi.unit_price)::text as subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId],
    );

    res.json({ 
      id: orderResult.rows[0].id,
      status: orderResult.rows[0].status,
      total: orderResult.rows[0].total,
      address: orderResult.rows[0].address,
      created_at: orderResult.rows[0].created_at,
      items: itemsResult.rows 
    });
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
    req: Request<
      {},
      {},
      {
        items: { productId: number; quantity: number; unitPrice: number }[];
        address: string;
      }
    >,
    res: Response,
  ) => {
    const { items, address } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "El pedido debe contener al menos un producto" });
    }

    // Validate each item and check stock
    for (const item of items) {
      if (!item.productId || item.unitPrice <= 0 || item.quantity <= 0) {
        return res.status(400).json({
          error:
            "Cada item debe tener un productId válido y cantidades/precios mayores a 0",
        });
      }

      const productResult = await pool.query(
        "SELECT stock, name FROM products WHERE id = $1 AND active = TRUE AND deleted_at IS NULL",
        [item.productId],
      );

      if (productResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: `Producto con id ${item.productId} no encontrado` });
      }

      if (productResult.rows[0].stock < item.quantity) {
        return res.status(409).json({
          error: `Stock insuficiente para "${productResult.rows[0].name}" (disponible: ${productResult.rows[0].stock})`,
        });
      }
    }

    // Calculate total
    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, address, status, total)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, total, address, created_at`,
        [1, address, "pending", total],
      );

      const orderId = orderResult.rows[0].id;

      // Insert order items and update stock
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [orderId, item.productId, item.quantity, item.unitPrice],
        );

        await client.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.productId],
        );
      }

      await client.query("COMMIT");
      return res.status(201).json({
        message: "Pedido creado",
        order: orderResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error processing order:", error);
      return res.status(500).json({ error: "Error al procesar la orden" });
    } finally {
      client.release();
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

// GET /api/orders/customer/:customerId
app.get(
  "/api/orders/customer/:customerId",
  async (req: Request<{ customerId: string }>, res: Response) => {
    const customerId = parseInt(req.params.customerId);
    const result = await pool.query(
      `SELECT o.id, o.status, 
        COALESCE(SUM(oi.unit_price * oi.quantity), 0)::text as total,
        o.address, o.created_at
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.customer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [customerId],
    );
    res.json(result.rows);
  },
);

// GET /api/clock/status - Check if employee is clocked in
app.get(
  "/api/clock/status",
  async (req: Request, res: Response) => {
    const employeeId = parseInt(req.query.employeeId as string) || 1;
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM clock_events 
       WHERE employee_id = $1 AND type = 'in' 
       AND NOT EXISTS (
         SELECT 1 FROM clock_events ce2 
         WHERE ce2.employee_id = $1 AND ce2.type = 'out' 
         AND ce2.recorded_at > clock_events.recorded_at
       )`,
      [employeeId],
    );
    const isClockedIn = parseInt(result.rows[0].count) > 0;
    res.json({ isClockedIn });
  },
);

// POST /api/clock - Clock in/out
app.post(
  "/api/clock",
  async (
    req: Request<
      {},
      {},
      { employeeId: number; type: string; note?: string }
    >,
    res: Response,
  ) => {
    const { employeeId, type, note } = req.body;

    if (!["in", "out"].includes(type)) {
      return res.status(400).json({ error: "Type must be 'in' or 'out'" });
    }

    const result = await pool.query(
      `INSERT INTO clock_events (employee_id, type, note, recorded_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, type, recorded_at`,
      [employeeId, type, note || null],
    );

    res.status(201).json({ event: result.rows[0] });
  },
);

// GET /api/clock/history - Get clock events grouped by day
app.get(
  "/api/clock/history",
  async (req: Request, res: Response) => {
    const employeeId = parseInt(req.query.employeeId as string) || 1;
    const result = await pool.query(
      `SELECT * FROM clock_events 
       WHERE employee_id = $1
       ORDER BY recorded_at DESC`,
      [employeeId],
    );
    res.json(result.rows);
  },
);

// GET /api/admin/users - List all users
app.get(
  "/api/admin/users",
  async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT id, username, email, role, active FROM customers ORDER BY id`,
    );
    res.json(result.rows);
  },
);

// PATCH /api/admin/users/:id/role - Change user role
app.patch(
  "/api/admin/users/:id/role",
  async (
    req: Request<{ id: string }, {}, { role: string }>,
    res: Response,
  ) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!["customer", "employee", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const result = await pool.query(
      `UPDATE customers SET role = $1 WHERE id = $2 RETURNING id, username, email, role, active`,
      [role, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Role updated", user: result.rows[0] });
  },
);

// PATCH /api/admin/users/:id/status - Change user status
app.patch(
  "/api/admin/users/:id/status",
  async (
    req: Request<{ id: string }, {}, { active: boolean }>,
    res: Response,
  ) => {
    const userId = parseInt(req.params.id);
    const { active } = req.body;

    const result = await pool.query(
      `UPDATE customers SET active = $1 WHERE id = $2 RETURNING id, username, email, role, active`,
      [active, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Status updated", user: result.rows[0] });
  },
);

// POST /api/auth/register - Register new user
app.post(
  "/api/auth/register",
  async (
    req: Request<
      {},
      {},
      { username: string; email: string; password: string }
    >,
    res: Response,
  ) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO customers (username, email, password, role, active)
         VALUES ($1, $2, $3, 'customer', true)
         RETURNING id, username, email`,
        [username, email, password],
      );

      res.status(201).json({ message: "Usuario creado" });
    } catch (err) {
      res.status(400).json({ error: "Email already exists or invalid data" });
    }
  },
);

// POST /api/auth/login - Login user
app.post(
  "/api/auth/login",
  async (
    req: Request<{}, {}, { email: string; password: string }>,
    res: Response,
  ) => {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, username, email, role FROM customers 
       WHERE email = $1 AND password = $2 AND active = true`,
      [email, password],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ user: result.rows[0] });
  },
);

