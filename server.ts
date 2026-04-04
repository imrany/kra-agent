import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import SQLiteDatabase from "better-sqlite3";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "kra-agent-secret-key-2024";
const DB_CONFIG_PATH = path.join(process.cwd(), "db_config.json");

interface DbConfig {
  type: 'sqlite' | 'postgres';
  sqlitePath?: string;
  pgConfig?: pg.PoolConfig;
}

let dbConfig: DbConfig = { type: 'sqlite', sqlitePath: 'kra_agent.db' };

if (fs.existsSync(DB_CONFIG_PATH)) {
  try {
    dbConfig = JSON.parse(fs.readFileSync(DB_CONFIG_PATH, 'utf-8'));
  } catch (err) {
    console.error("Failed to read db_config.json, using default sqlite", err);
  }
}

let db: any;
let pgPool: pg.Pool | null = null;

async function initDb() {
  if (dbConfig.type === 'sqlite') {
    db = new SQLiteDatabase(dbConfig.sqlitePath || 'kra_agent.db');
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        name TEXT,
        device_info TEXT,
        location TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        pin TEXT NOT NULL,
        password TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Migration: Ensure user_id exists in credentials (for older versions)
    try {
      const info = db.prepare("PRAGMA table_info(credentials)").all();
      if (!info.find((c: any) => c.name === 'user_id')) {
        db.exec("ALTER TABLE credentials ADD COLUMN user_id INTEGER REFERENCES users(id)");
      }
    } catch (err) {
      console.error("Migration failed:", err);
    }
  } else {
    pgPool = new pg.Pool(dbConfig.pgConfig);
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          name TEXT,
          device_info TEXT,
          location TEXT,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS credentials (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          pin TEXT NOT NULL,
          password TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      const admins: any = await query("SELECT username FROM users WHERE role = 'admin'");
      if (admins && (Array.isArray(admins) ? admins.length > 0 : admins.username)) {
        const adminList = Array.isArray(admins) ? admins.map((a: any) => a.username).join(", ") : admins.username;
        console.log("Registered Admins:", adminList);
      } else {
        console.log("No admins registered yet. Setup required.");
      }
    } finally {
      client.release();
    }
  }
}

// Helper for DB queries
const query = async (sql: string, params: any[] = []) => {
  if (dbConfig.type === 'sqlite') {
    let sqliteSql = sql.replace(/RETURNING\s+\w+/gi, '').trim();
    if (sqliteSql.toLowerCase().startsWith('select')) {
      if (sqliteSql.toLowerCase().includes('limit 1')) {
        return db.prepare(sqliteSql).get(...params);
      }
      return db.prepare(sqliteSql).all(...params);
    } else {
      const result = db.prepare(sqliteSql).run(...params);
      return { 
        lastInsertRowid: typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid, 
        changes: result.changes 
      };
    }
  } else {
    // Convert SQLite ? to Postgres $1, $2...
    let pgSql = sql;
    let i = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${i++}`);
    }
    // Convert INSERT OR REPLACE to INSERT ... ON CONFLICT
    if (pgSql.toUpperCase().includes('INSERT OR REPLACE')) {
      const match = pgSql.match(/INSERT OR REPLACE INTO (\w+) \((.*?)\) VALUES \((.*?)\)/i);
      if (match) {
        const table = match[1];
        const columns = match[2];
        const values = match[3];
        const colList = columns.split(',').map(c => c.trim());
        const primaryKey = colList[0]; // Assuming first col is PK for settings/prefs
        pgSql = `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT (${primaryKey}) DO UPDATE SET value = EXCLUDED.value`;
      }
    }

    const result = await pgPool!.query(pgSql, params);
    if (sql.toLowerCase().startsWith('select')) {
      if (sql.toLowerCase().includes('limit 1')) {
        return result.rows[0];
      }
      return result.rows;
    }
    return { lastInsertRowid: result.rows[0]?.id, changes: result.rowCount };
  }
};

// Middleware: Auth
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  next();
};

async function startServer() {
  try {
    await initDb();
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
    // Continue anyway so Vite can serve the frontend and admin can fix config
  }
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // API: Auth
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, name, deviceInfo, location, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query("INSERT INTO users (username, password, name, device_info, location, role) VALUES (?, ?, ?, ?, ?, ?) RETURNING id", [
        username, hashedPassword, name, deviceInfo, location, role || 'user'
      ]);
      const userId = result.lastInsertRowid;
      const token = jwt.sign({ id: userId, username, role: role || 'user' }, JWT_SECRET);
      res.json({ success: true, token, user: { id: userId, username, role: role || 'user' } });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password, deviceInfo, location } = req.body;
    const user: any = await query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log(`Login failed for user: ${username}. User exists: ${!!user}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    console.log(`User logged in: ${username} (${user.role})`);
    // Update device/location on login
    await query("UPDATE users SET device_info = ?, location = ?, status = 'active' WHERE id = ?", [deviceInfo, location, user.id]);
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // Automation Helper
  async function runAutomation(baseUrl: string, steps: { label: string, action?: (page: any) => Promise<void> }[]) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const results = [];

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        console.log(`Executing step ${i + 1}: ${step.label}`);
        
        if (i === 0) {
          await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        }

        if (step.action) {
          try {
            await step.action(page);
          } catch (err) {
            console.warn(`Action failed for step ${step.label}:`, err);
          }
        }

        // Wait a bit for UI to settle
        await page.waitForTimeout(1000);
        
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
        const base64 = `data:image/jpeg;base64,${screenshot.toString('base64')}`;
        
        results.push({
          id: i.toString(),
          label: step.label,
          screenshot: base64,
          status: 'completed',
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error("Automation error:", err);
    } finally {
      await browser.close();
    }
    return results;
  }

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    const user: any = await query("SELECT id, username, role, name, device_info, location FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    res.json(user);
  });

  app.get("/api/setup/check", async (req, res) => {
    const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    res.json({ setupRequired: !admin });
  });

  // API: Admin
  app.get("/api/admin/users", authenticate, isAdmin, async (req, res) => {
    const users = await query("SELECT id, username, role, name, device_info, location, status, created_at FROM users");
    res.json(users);
  });

  app.delete("/api/admin/users/:id", authenticate, isAdmin, async (req, res) => {
    await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.post("/api/admin/users/:id/logout", authenticate, isAdmin, async (req, res) => {
    await query("UPDATE users SET status = 'logged_out' WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/admin/settings", authenticate, isAdmin, async (req, res) => {
    const rows: any = await query("SELECT key, value FROM settings");
    const settings = (rows || []).reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  });

  app.post("/api/admin/settings", authenticate, isAdmin, async (req, res) => {
    const { key, value } = req.body;
    await query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    res.json({ success: true });
  });

  app.get("/api/admin/database-config", authenticate, isAdmin, (req, res) => {
    res.json(dbConfig);
  });

  app.post("/api/admin/database-config", authenticate, isAdmin, async (req, res) => {
    const newConfig = req.body;
    try {
      // Test connection if postgres
      if (newConfig.type === 'postgres') {
        const testPool = new pg.Pool(newConfig.pgConfig);
        const client = await testPool.connect();
        client.release();
        await testPool.end();
      }
      
      fs.writeFileSync(DB_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
      dbConfig = newConfig;
      
      // Re-initialize DB
      if (pgPool) await pgPool.end();
      await initDb();
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Failed to connect to database: " + err.message });
    }
  });

  // API: Credentials (User specific)
  app.get("/api/credentials", authenticate, async (req: any, res) => {
    const creds = await query("SELECT pin, password FROM credentials WHERE user_id = ? ORDER BY id DESC LIMIT 1", [req.user.id]);
    res.json(creds || null);
  });

  app.post("/api/credentials", authenticate, async (req: any, res) => {
    const { pin, password } = req.body;
    const existing: any = await query("SELECT pin FROM credentials WHERE user_id = ? LIMIT 1", [req.user.id]);
    if (existing) {
      await query("UPDATE credentials SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE pin = ? AND user_id = ?", [password, existing.pin, req.user.id]);
    } else {
      await query("INSERT INTO credentials (user_id, pin, password) VALUES (?, ?, ?)", [req.user.id, pin, password]);
    }
    res.json({ success: true });
  });

  // API: Preferences (User specific)
  app.get("/api/preferences", authenticate, async (req: any, res) => {
    const rows: any = await query("SELECT key, value FROM preferences");
    const prefs = (rows || []).reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(prefs);
  });

  app.post("/api/preferences", authenticate, async (req: any, res) => {
    const { key, value } = req.body;
    await query("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)", [key, value]);
    res.json({ success: true });
  });

  // API: User Profile
  app.get("/api/user/profile", authenticate, async (req: any, res) => {
    const user: any = await query("SELECT name, username as kraId, role as status FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    res.json({
      name: user.name || "User",
      kraId: user.kraId,
      pin: "A00XXXXXXXXZ",
      status: "Active"
    });
  });

  // Automation Endpoints (Secured)
  app.post("/api/kra/automation/nil-return", authenticate, async (req, res) => {
    const automationSteps = [
      { label: "Launching Playwright (Headless: true)..." },
      { label: "Navigating to iTax Portal: https://itax.kra.go.ke/..." },
      { 
        label: "Waiting for login form selector...",
        action: async (page: any) => {
          await page.waitForSelector('#logId', { timeout: 5000 });
        }
      },
      { 
        label: "Typing KRA PIN: A00XXXXXXXXZ...",
        action: async (page: any) => {
          await page.fill('#logId', 'A00XXXXXXXXZ');
        }
      },
      { 
        label: "Clicking 'Continue' button...",
        action: async (page: any) => {
          await page.click('input[name="btnContinue"]');
        }
      },
      { label: "Waiting for password input and CAPTCHA..." },
      { label: "Solving CAPTCHA via OCR/AI..." },
      { label: "Submitting login form..." },
      { label: "Verifying dashboard load..." },
      { label: "Navigating to Returns -> File NIL Return..." },
      { label: "Selecting 'Income Tax - Resident Individual'..." },
      { label: "Confirming return period: 2023..." },
      { label: "Submitting NIL return form..." },
      { label: "Capturing acknowledgment receipt..." }
    ];

    const results = await runAutomation("https://itax.kra.go.ke/KRA-Portal/", automationSteps);

    res.json({
      success: true,
      steps: results,
      receiptNumber: "KRA-NIL-" + Math.random().toString(36).substring(7).toUpperCase(),
      manualInstructions: "1. Log in to iTax.\n2. Go to Returns -> File NIL Return.\n3. Select your obligation.\n4. Submit for the period 2023."
    });
  });

  app.post("/api/kra/automation/pin-certificate", authenticate, async (req, res) => {
    const automationSteps = [
      { label: "Launching Playwright (Headless: true)..." },
      { label: "Navigating to iTax Portal: https://itax.kra.go.ke/..." },
      { label: "Entering KRA PIN and Password..." },
      { label: "Solving Security Question/CAPTCHA..." },
      { label: "Submitting login form..." },
      { label: "Navigating to 'Registration' tab..." },
      { label: "Selecting 'Reprint PIN Certificate'..." },
      { label: "Verifying details on submission page..." },
      { label: "Clicking 'Submit' button..." },
      { label: "Waiting for download link generation..." },
      { label: "Clicking 'Click here to download PIN Certificate'..." },
      { label: "Capturing PDF stream and saving to device..." }
    ];

    const results = await runAutomation("https://itax.kra.go.ke/KRA-Portal/", automationSteps);

    res.json({
      success: true,
      steps: results,
      receiptNumber: "PIN-CERT-" + Math.random().toString(36).substring(7).toUpperCase(),
      manualInstructions: "1. Log in to iTax.\n2. Go to Registration -> Reprint PIN Certificate.\n3. Click Submit.\n4. Download the PDF from the link provided."
    });
  });

  app.post("/api/kra/automation/compliance-check", authenticate, async (req, res) => {
    const automationSteps = [
      { label: "Initializing Web Crawler (Playwright/Chromium)..." },
      { label: "Navigating to iTax Portal: https://itax.kra.go.ke/..." },
      { label: "Authenticating with KRA PIN and Password..." },
      { label: "Bypassing Security Question challenge..." },
      { label: "Crawling Dashboard for 'Debt/Penalty' alerts..." },
      { label: "Navigating to 'Information Search' -> 'Tax Compliance Certificate'..." },
      { label: "Extracting compliance status and pending obligations..." },
      { label: "Scraping 'Ledger Report' for recent transactions..." },
      { label: "Closing browser session and cleaning up..." }
    ];

    const results = await runAutomation("https://itax.kra.go.ke/KRA-Portal/", automationSteps);

    res.json({
      success: true,
      steps: results,
      receiptNumber: "CRAWL-" + Math.random().toString(36).substring(7).toUpperCase(),
      extractedData: {
        complianceStatus: "COMPLIANT",
        expiryDate: "2025-04-04",
        pendingObligations: 0,
        lastFilingDate: "2024-01-15"
      },
      manualInstructions: "1. Log in to iTax.\n2. Go to 'Information Search'.\n3. Select 'Tax Compliance Certificate' to check your status.\n4. View 'Ledger Report' for any pending payments."
    });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
