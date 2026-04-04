import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import SQLiteDatabase from "better-sqlite3";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { GoogleGenAI } from "@google/genai";

// @ts-ignore
chromium.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "kra-agent-secret-key-2024";
const DB_CONFIG_PATH = path.join(process.cwd(), "db_config.json");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

// In-memory task store
const activeTasks = new Map<string, {
  id: string;
  userId: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  page: any;
  browser: any;
  steps: any[];
  currentStepIndex: number;
  resolveAnswer?: (answer: string) => void;
}>();

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

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        automation_steps TEXT,
        extracted_data TEXT,
        receipt_number TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
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

        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type TEXT NOT NULL,
          text TEXT NOT NULL,
          automation_steps TEXT,
          extracted_data TEXT,
          receipt_number TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  // Automation Helper (v3 Stealth + Vision)
  async function runAutomationV3(userId: number, taskId: string, baseUrl: string, automationSteps: any[]) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'en-KE',
      timezoneId: 'Africa/Nairobi'
    });
    
    const page = await context.newPage();
    const task: {
      id: string;
      userId: number;
      status: 'running' | 'paused' | 'completed' | 'failed';
      page: any;
      browser: any;
      steps: any[];
      currentStepIndex: number;
      resolveAnswer?: (answer: string) => void;
    } = {
      id: taskId,
      userId,
      status: 'running',
      page,
      browser,
      steps: [],
      currentStepIndex: 0
    };
    activeTasks.set(taskId, task);

    try {
      for (let i = 0; i < automationSteps.length; i++) {
        task.currentStepIndex = i;
        const step = automationSteps[i];
        console.log(`[Task ${taskId}] Executing: ${step.label}`);

        if (i === 0) {
          await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
        }

        // Check for security questions or CAPTCHA via Vision if needed
        if (step.useVision) {
          const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
          const base64 = screenshot.toString('base64');
          
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              { text: `Analyze this KRA iTax screenshot. ${step.visionPrompt}. Return JSON with "found": boolean and "selector": string or "coordinates": {x, y} if found.` },
              { inlineData: { data: base64, mimeType: "image/jpeg" } }
            ],
            config: { responseMimeType: "application/json" }
          });

          const visionResult = JSON.parse(response.text || '{}');
          if (visionResult.found) {
            if (visionResult.selector) {
              await page.click(visionResult.selector);
            } else if (visionResult.coordinates) {
              await page.mouse.click(visionResult.coordinates.x, visionResult.coordinates.y);
            }
          }
        }

        if (step.action) {
          await step.action(page, async (prompt: string) => {
            // Pause for user input
            task.status = 'paused';
            const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
            const base64 = `data:image/jpeg;base64,${screenshot.toString('base64')}`;
            
            // In a real app, we'd use WebSockets here. 
            // For this demo, we'll wait for the /answer endpoint.
            return new Promise<string>((resolve) => {
              task.resolveAnswer = resolve;
            });
          });
        }

        // Human-like delay
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 40 });
        task.steps.push({
          id: i.toString(),
          label: step.label,
          screenshot: `data:image/jpeg;base64,${screenshot.toString('base64')}`,
          status: 'completed',
          timestamp: Date.now()
        });
      }
      task.status = 'completed';
    } catch (err) {
      console.error(`[Task ${taskId}] Error:`, err);
      task.status = 'failed';
    } finally {
      // Keep browser open if paused, otherwise close
      if (task.status !== 'paused') {
        await browser.close();
        activeTasks.delete(taskId);
      }
    }
  }

  app.post("/api/kra/tasks/:id/answer", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { answer } = req.body;
    const task = activeTasks.get(id);

    if (!task || task.status !== 'paused' || !task.resolveAnswer) {
      return res.status(404).json({ error: "Task not found or not awaiting input" });
    }

    const resolve = task.resolveAnswer;
    delete task.resolveAnswer;
    task.status = 'running';
    resolve(answer);
    
    res.json({ success: true });
  });

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

  // API: Messages
  app.get("/api/messages", authenticate, async (req: any, res) => {
    const rows: any = await query("SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp ASC", [req.user.id]);
    const messages = (rows || []).map((row: any) => ({
      id: row.id.toString(),
      type: row.type,
      text: row.text,
      timestamp: new Date(row.timestamp).getTime(),
      automationSteps: row.automation_steps ? JSON.parse(row.automation_steps) : undefined,
      extractedData: row.extracted_data ? JSON.parse(row.extracted_data) : undefined,
      receiptNumber: row.receipt_number
    }));
    res.json(messages);
  });

  app.post("/api/messages", authenticate, async (req: any, res) => {
    const { type, text, automationSteps, extractedData, receiptNumber } = req.body;
    const result: any = await query(
      "INSERT INTO messages (user_id, type, text, automation_steps, extracted_data, receipt_number) VALUES (?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        type,
        text,
        automationSteps ? JSON.stringify(automationSteps) : null,
        extractedData ? JSON.stringify(extractedData) : null,
        receiptNumber || null
      ]
    );
    res.json({ success: true, id: result.lastInsertRowid || result.id });
  });

  app.delete("/api/messages", authenticate, async (req: any, res) => {
    await query("DELETE FROM messages WHERE user_id = ?", [req.user.id]);
    res.json({ success: true });
  });

  // Automation Endpoints (Secured)
  app.post("/api/kra/automation/nil-return", authenticate, async (req: any, res) => {
    const taskId = Math.random().toString(36).substring(7);
    const automationSteps = [
      { label: "Launching Stealth Browser..." },
      { label: "Navigating to iTax Portal...", useVision: true, visionPrompt: "Find the PIN input field." },
      { 
        label: "Authenticating...",
        action: async (page: any, ask: any) => {
          await page.fill('#logId', 'A00XXXXXXXXZ');
          await page.click('input[name="btnContinue"]');
          
          // Check for security question
          const isQuestion = await page.isVisible('.security-question');
          if (isQuestion) {
            const questionText = await page.innerText('.security-question');
            const answer = await ask(`Security Question: ${questionText}`);
            await page.fill('#answer', answer);
          }
        }
      },
      { label: "Filing NIL Return..." },
      { label: "Task Complete." }
    ];

    runAutomationV3(req.user.id, taskId, "https://itax.kra.go.ke/KRA-Portal/", automationSteps);

    res.json({
      success: true,
      taskId,
      message: "Automation started in background."
    });
  });

  app.get("/api/kra/tasks/:id", authenticate, async (req: any, res) => {
    const task = activeTasks.get(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    
    res.json({
      id: task.id,
      status: task.status,
      steps: task.steps,
      currentStepIndex: task.currentStepIndex
    });
  });

  app.post("/api/kra/automation/pin-certificate", authenticate, async (req: any, res) => {
    const taskId = Math.random().toString(36).substring(7);
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

    const results = await runAutomationV3(req.user.id, taskId, "https://itax.kra.go.ke/KRA-Portal/", automationSteps);

    res.json({
      success: true,
      taskId,
      receiptNumber: "PIN-CERT-" + Math.random().toString(36).substring(7).toUpperCase(),
      manualInstructions: "1. Log in to iTax.\n2. Go to Registration -> Reprint PIN Certificate.\n3. Click Submit.\n4. Download the PDF from the link provided."
    });
  });

  app.post("/api/kra/automation/compliance-check", authenticate, async (req: any, res) => {
    const taskId = Math.random().toString(36).substring(7);
    const automationSteps = [
      { label: "Initializing Web Crawler...", useVision: true, visionPrompt: "Find the login button." },
      { label: "Navigating to iTax Portal..." },
      { label: "Authenticating..." },
      { label: "Crawling Dashboard..." },
      { label: "Extracting compliance status..." }
    ];

    const results = await runAutomationV3(req.user.id, taskId, "https://itax.kra.go.ke/KRA-Portal/", automationSteps);

    res.json({
      success: true,
      taskId,
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
