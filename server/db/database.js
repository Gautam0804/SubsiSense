import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "terras_safe",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
});

pool.on("connect", () => {
    console.log("PostgreSQL client connected");
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});

export default pool;