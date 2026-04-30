import { pool } from "../src/db.js";
import bcrypt from "bcrypt";
async function migratePasswords(): Promise<void> {
  const PLAIN = "Tienda2025!";
  const hash = await bcrypt.hash(PLAIN, 10);
  await pool.query("UPDATE customers SET password_hash = $1", [hash]);
  console.log("✅ Contraseñas migradas a bcrypt");
  process.exit(0);
}
migratePasswords();
