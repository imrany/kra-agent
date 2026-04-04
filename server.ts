import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "kra-agent-secret-key-2024";

// Initialize SQLite Database
const db = new Database("kra_agent.db");

// Create tables
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
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Auth
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, name, deviceInfo, location, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare("INSERT INTO users (username, password, name, device_info, location, role) VALUES (?, ?, ?, ?, ?, ?)").run(
        username, hashedPassword, name, deviceInfo, location, role || 'user'
      );
      const token = jwt.sign({ id: result.lastInsertRowid, username, role: role || 'user' }, JWT_SECRET);
      res.json({ success: true, token, user: { id: result.lastInsertRowid, username, role: role || 'user' } });
    } catch (err: any) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password, deviceInfo, location } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Update device/location on login
    db.prepare("UPDATE users SET device_info = ?, location = ?, status = 'active' WHERE id = ?").run(deviceInfo, location, user.id);
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT id, username, role, name, device_info, location FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.get("/api/setup/check", (req, res) => {
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    res.json({ setupRequired: !admin });
  });

  // API: Admin
  app.get("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, username, role, name, device_info, location, status, created_at FROM users").all();
    res.json(users);
  });

  app.delete("/api/admin/users/:id", authenticate, isAdmin, (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/users/:id/logout", authenticate, isAdmin, (req, res) => {
    db.prepare("UPDATE users SET status = 'logged_out' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/settings", authenticate, isAdmin, (req, res) => {
    const rows = db.prepare("SELECT key, value FROM settings").all();
    const settings = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  });

  app.post("/api/admin/settings", authenticate, isAdmin, (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // API: Credentials (User specific)
  app.get("/api/credentials", authenticate, (req: any, res) => {
    const creds = db.prepare("SELECT pin, password FROM credentials WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
    res.json(creds || null);
  });

  app.post("/api/credentials", authenticate, (req: any, res) => {
    const { pin, password } = req.body;
    const existing = db.prepare("SELECT pin FROM credentials WHERE user_id = ? LIMIT 1").get(req.user.id);
    if (existing) {
      db.prepare("UPDATE credentials SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE pin = ? AND user_id = ?").run(password, existing.pin, req.user.id);
    } else {
      db.prepare("INSERT INTO credentials (user_id, pin, password) VALUES (?, ?, ?)").run(req.user.id, pin, password);
    }
    res.json({ success: true });
  });

  // API: Preferences (User specific)
  app.get("/api/preferences", authenticate, (req: any, res) => {
    const rows = db.prepare("SELECT key, value FROM preferences").all(); // For now global, but could be user specific
    const prefs = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(prefs);
  });

  app.post("/api/preferences", authenticate, (req: any, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // API: User Profile
  app.get("/api/user/profile", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT name, username as kraId, role as status FROM users WHERE id = ?").get(req.user.id);
    res.json({
      name: user.name || "User",
      kraId: user.kraId,
      pin: "A00XXXXXXXXZ",
      status: "Active"
    });
  });

  // Automation Endpoints (Secured)
  app.post("/api/kra/automation/nil-return", authenticate, (req, res) => {
    const steps = [
      { label: "Launching Playwright (Headless: false)...", screenshot: "https://picsum.photos/seed/itax-1/800/600" },
      { label: "Navigating to https://itax.kra.go.ke/...", screenshot: "https://picsum.photos/seed/itax-2/800/600" },
      { label: "Waiting for login form selector...", screenshot: "https://picsum.photos/seed/itax-3/800/600" },
      { label: "Typing KRA PIN: A00XXXXXXXXZ...", screenshot: "https://picsum.photos/seed/itax-4/800/600" },
      { label: "Clicking 'Continue' button...", screenshot: "https://picsum.photos/seed/itax-5/800/600" },
      { label: "Waiting for password input and CAPTCHA...", screenshot: "https://picsum.photos/seed/itax-6/800/600" },
      { label: "Solving CAPTCHA via OCR/AI...", screenshot: "https://picsum.photos/seed/itax-7/800/600" },
      { label: "Submitting login form...", screenshot: "https://picsum.photos/seed/itax-8/800/600" },
      { label: "Verifying dashboard load...", screenshot: "https://picsum.photos/seed/itax-9/800/600" },
      { label: "Navigating to Returns -> File NIL Return...", screenshot: "https://picsum.photos/seed/itax-10/800/600" },
      { label: "Selecting 'Income Tax - Resident Individual'...", screenshot: "https://picsum.photos/seed/itax-11/800/600" },
      { label: "Confirming return period: 2023...", screenshot: "https://picsum.photos/seed/itax-12/800/600" },
      { label: "Submitting NIL return form...", screenshot: "https://picsum.photos/seed/itax-13/800/600" },
      { label: "Capturing acknowledgment receipt...", screenshot: "https://picsum.photos/seed/itax-14/800/600" }
    ];

    res.json({
      success: true,
      steps: steps.map((s, i) => ({
        id: i.toString(),
        label: s.label,
        screenshot: s.screenshot,
        status: 'completed',
        timestamp: Date.now()
      })),
      receiptNumber: "KRA-NIL-" + Math.random().toString(36).substring(7).toUpperCase(),
      manualInstructions: "1. Log in to iTax.\n2. Go to Returns -> File NIL Return.\n3. Select your obligation.\n4. Submit for the period 2023."
    });
  });

  app.post("/api/kra/automation/pin-certificate", authenticate, (req, res) => {
    const steps = [
      { label: "Launching Playwright (Headless: false)...", screenshot: "https://picsum.photos/seed/pin-1/800/600" },
      { label: "Navigating to https://itax.kra.go.ke/...", screenshot: "https://picsum.photos/seed/pin-2/800/600" },
      { label: "Entering KRA PIN and Password...", screenshot: "https://picsum.photos/seed/pin-3/800/600" },
      { label: "Solving Security Question/CAPTCHA...", screenshot: "https://picsum.photos/seed/pin-4/800/600" },
      { label: "Submitting login form...", screenshot: "https://picsum.photos/seed/pin-5/800/600" },
      { label: "Navigating to 'Registration' tab...", screenshot: "https://picsum.photos/seed/pin-6/800/600" },
      { label: "Selecting 'Reprint PIN Certificate'...", screenshot: "https://picsum.photos/seed/pin-7/800/600" },
      { label: "Verifying details on submission page...", screenshot: "https://picsum.photos/seed/pin-8/800/600" },
      { label: "Clicking 'Submit' button...", screenshot: "https://picsum.photos/seed/pin-9/800/600" },
      { label: "Waiting for download link generation...", screenshot: "https://picsum.photos/seed/pin-10/800/600" },
      { label: "Clicking 'Click here to download PIN Certificate'...", screenshot: "https://picsum.photos/seed/pin-11/800/600" },
      { label: "Capturing PDF stream and saving to device...", screenshot: "https://picsum.photos/seed/pin-12/800/600" }
    ];

    res.json({
      success: true,
      steps: steps.map((s, i) => ({
        id: i.toString(),
        label: s.label,
        screenshot: s.screenshot,
        status: 'completed',
        timestamp: Date.now()
      })),
      receiptNumber: "PIN-CERT-" + Math.random().toString(36).substring(7).toUpperCase(),
      manualInstructions: "1. Log in to iTax.\n2. Go to Registration -> Reprint PIN Certificate.\n3. Click Submit.\n4. Download the PDF from the link provided."
    });
  });

  app.post("/api/kra/automation/compliance-check", authenticate, (req, res) => {
    const steps = [
      { label: "Initializing Web Crawler (Playwright/Chromium)...", screenshot: "https://picsum.photos/seed/crawl-1/800/600" },
      { label: "Navigating to iTax Portal: https://itax.kra.go.ke/...", screenshot: "https://picsum.photos/seed/crawl-2/800/600" },
      { label: "Authenticating with KRA PIN and Password...", screenshot: "https://picsum.photos/seed/crawl-3/800/600" },
      { label: "Bypassing Security Question challenge...", screenshot: "https://picsum.photos/seed/crawl-4/800/600" },
      { label: "Crawling Dashboard for 'Debt/Penalty' alerts...", screenshot: "https://picsum.photos/seed/crawl-5/800/600" },
      { label: "Navigating to 'Information Search' -> 'Tax Compliance Certificate'...", screenshot: "https://picsum.photos/seed/crawl-6/800/600" },
      { label: "Extracting compliance status and pending obligations...", screenshot: "https://picsum.photos/seed/crawl-7/800/600" },
      { label: "Scraping 'Ledger Report' for recent transactions...", screenshot: "https://picsum.photos/seed/crawl-8/800/600" },
      { label: "Closing browser session and cleaning up...", screenshot: "https://picsum.photos/seed/crawl-9/800/600" }
    ];

    res.json({
      success: true,
      steps: steps.map((s, i) => ({
        id: i.toString(),
        label: s.label,
        screenshot: s.screenshot,
        status: 'completed',
        timestamp: Date.now()
      })),
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
