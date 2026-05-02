import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import type { Product } from "./types.ts";
import { pool } from "./db.js";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import cookieParser from "cookie-parser";

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

interface AuthRequest extends Request {
  customer?: { id: number; email: string; role: string };
}

const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Intentar obtener el token del Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Si no está en el header, intentar de la cookie
  if (!token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: string;
    };
    req.customer = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.customer === null || req.customer === undefined) {
      return res.status(401).json({ error: "No hay customer" });
    }

    if (!roles.includes(req.customer.role)) {
      return res.status(403).json({ error: "El rol no está en la lista" });
    }
    next();
  };
};

const JWT_SECRET = process.env.JWT_SECRET ?? "Puta_Vida_TT";

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

app.get(
  "/api/orders",
  verifyToken,
  requireRole(["admin", "employee"]),
  async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT o.id, o.created_at, oi.product_id, oi.quantity, p.name AS product_name
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id`,
    );
    res.json(result.rows);
  },
);

app.get(
  "/api/orders/my",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    const customerId = req.customer!.id;
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
      items: itemsResult.rows,
    });
  },
);

// PATCH /api/orders/:id/status - Change order status
app.patch(
  "/api/orders/:id/status",
  verifyToken,
  requireRole(["admin", "employee"]),
  async (
    req: Request<{ id: string }, {}, { status: string }>,
    res: Response,
  ) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, orderId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Status updated", order: result.rows[0] });
  },
);

app.post(
  "/api/products",
  verifyToken,
  requireRole(["admin", "employee"]),
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
  verifyToken,
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
    const user = (req as AuthRequest).customer!;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "El pedido debe contener al menos un producto" });
    }

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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, address, status)
         VALUES ($1, $2, $3)
         RETURNING id, status, address, created_at`,
        [user.id, address, "pending"],
      );

      const orderId = orderResult.rows[0].id;

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

      // Calcular el total desde order_items
      const totalResult = await pool.query(
        `SELECT COALESCE(SUM(unit_price * quantity), 0) as total
         FROM order_items
         WHERE order_id = $1`,
        [orderId],
      );

      return res.status(201).json({
        message: "Pedido creado",
        order: {
          id: orderResult.rows[0].id,
          status: orderResult.rows[0].status,
          total: totalResult.rows[0].total,
          address: orderResult.rows[0].address,
          created_at: orderResult.rows[0].created_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error processing order:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      return res
        .status(500)
        .json({ error: `Error al procesar la orden: ${errorMessage}` });
    } finally {
      client.release();
    }
  },
);

// Actualizar producto
app.put(
  "/api/products/:id",
  verifyToken,
  requireRole(["admin", "employee"]),
  async (
    req: Request<
      { id: string },
      {},
      {
        name?: string;
        description?: string;
        price?: number;
        category?: string;
        stock?: number;
        image_url?: string;
      }
    >,
    res: Response,
  ) => {
    const { id } = req.params;
    const { name, description, price, category, stock, image_url } = req.body;

    // Primero obtener el producto actual
    const currentResult = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [parseInt(id)],
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const current = currentResult.rows[0];

    // Usar valores del body o mantener los actuales
    const updateResult = await pool.query(
      "UPDATE products" +
        " SET name=$1, description=$2, price=$3, category=$4, stock=$5, image_url=$6" +
        " WHERE id=$7 RETURNING *",
      [
        name ?? current.name,
        description ?? current.description,
        price ?? current.price,
        category ?? current.category,
        stock !== undefined ? stock : current.stock,
        image_url ?? current.image_url,
        parseInt(id),
      ],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({
      message: "Producto actualizado",
      product: updateResult.rows[0],
    });
  },
);

// Parte 2 — Soft delete
app.delete(
  "/api/products/:id",
  verifyToken,
  requireRole(["admin"]),
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
  verifyToken,
  requireRole(["admin", "employee"]),
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

// GET /api/clock/status
app.get(
  "/api/clock/status",
  verifyToken,
  requireRole(["employee", "admin"]),
  async (req: AuthRequest, res: Response) => {
    const employeeId = req.customer!.id;

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
  verifyToken,
  requireRole(["employee", "admin"]),
  async (req: AuthRequest, res: Response) => {
    // Extraemos employeeId del token y el type/note del body
    const employeeId = req.customer!.id;
    const { type, note } = req.body;

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
  verifyToken,
  requireRole(["employee", "admin"]),
  async (req: AuthRequest, res: Response) => {
    const employeeId = req.customer!.id;

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
  verifyToken,
  requireRole(["admin"]),
  async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT id, email, email, role, active FROM customers ORDER BY id`,
    );
    res.json(result.rows);
  },
);

// PATCH /api/admin/users/:id/role - Change user role
app.patch(
  "/api/admin/users/:id/role",
  verifyToken,
  requireRole(["admin"]),
  async (req: Request<{ id: string }, {}, { role: string }>, res: Response) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!["customer", "employee", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const result = await pool.query(
      `UPDATE customers SET role = $1 WHERE id = $2 RETURNING id, email, email, role, active`,
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
  verifyToken,
  requireRole(["admin"]),
  async (
    req: Request<{ id: string }, {}, { active: boolean }>,
    res: Response,
  ) => {
    const userId = parseInt(req.params.id);
    const { active } = req.body;

    const result = await pool.query(
      `UPDATE customers SET active = $1 WHERE id = $2 RETURNING id, email, email, role, active`,
      [active, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Status updated", user: result.rows[0] });
  },
);

app.post(
  "/api/auth/register",
  async (
    req: Request<{}, {}, { name: string; email: string; password: string }>,
    res: Response,
  ) => {
    const { name, email, password } = req.body;

    if (!email || !email || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const existing = await pool.query(
      "SELECT id FROM customers WHERE email = $1 OR email = $2",
      [email, email],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email o email ya existe" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (email, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, email, email`,
      [email, email, password_hash],
    );
    res.status(201).json({ message: "Usuario creado", user: result.rows[0] });
  },
);

app.post(
  "/api/auth/login",
  async (
    req: Request<{}, {}, { identifier: string; password: string }>,
    res: Response,
  ) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const userResult = await pool.query(
      "SELECT * FROM customers WHERE email = $1 OR email = $2",
      [identifier, identifier],
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000, // 2 horas -- Se ponen en milisegundos
    });

    res.json({
      message: "Login exitoso",
      customer: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  },
);

app.get(
  "/api/auth/me",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    res.json({ customer: req.customer });
  },
);

app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
  res.json({ message: "Logout exitoso" });
});

app.get(
  "/api/fichajes",
  verifyToken,
  requireRole(["employee", "admin"]),
  (req: AuthRequest, res: Response) => {
    res.json({ message: "Bienvenido, " + req.customer!.email });
  },
);
// Solo admin
app.delete(
  "/api/admin/users/:id",
  verifyToken,
  requireRole(["admin"]),
  (req: AuthRequest, res: Response) => {
    // ...
  },
);
