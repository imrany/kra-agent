import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database
const db = new Database("kra_agent.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin TEXT NOT NULL,
    password TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Credentials
  app.get("/api/credentials", (req, res) => {
    const creds = db.prepare("SELECT pin, password FROM credentials ORDER BY id DESC LIMIT 1").get();
    res.json(creds || null);
  });

  app.post("/api/credentials", (req, res) => {
    const { pin, password } = req.body;
    
    // Check if a PIN already exists
    const existing = db.prepare("SELECT pin FROM credentials LIMIT 1").get();
    
    if (existing) {
      // If PIN exists, only allow password update
      db.prepare("UPDATE credentials SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE pin = ?").run(password, existing.pin);
    } else {
      // First time: Create account with PIN and Password
      db.prepare("INSERT INTO credentials (pin, password) VALUES (?, ?)").run(pin, password);
      
      // Also initialize a mock profile for this PIN
      db.prepare("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)").run('user_name', 'KRA User ' + pin.substring(0, 4));
    }
    res.json({ success: true });
  });

  // API: Preferences
  app.get("/api/preferences", (req, res) => {
    const rows = db.prepare("SELECT key, value FROM preferences").all();
    const prefs = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(prefs);
  });

  app.post("/api/preferences", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // API: User Profile
  app.get("/api/user/profile", (req, res) => {
    res.json({
      name: "Imran Mat",
      kraId: "982210",
      pin: "A001234567Z",
      status: "Active"
    });
  });

  app.post("/api/kra/automation/nil-return", (req, res) => {
    const steps = [
      "Launching Playwright (Headless: false)...",
      "Navigating to https://itax.kra.go.ke/...",
      "Waiting for login form selector...",
      "Typing KRA PIN: A00XXXXXXXXZ...",
      "Clicking 'Continue' button...",
      "Waiting for password input and CAPTCHA...",
      "Solving CAPTCHA via OCR/AI...",
      "Submitting login form...",
      "Verifying dashboard load...",
      "Navigating to Returns -> File NIL Return...",
      "Selecting 'Income Tax - Resident Individual'...",
      "Confirming return period: 2023...",
      "Submitting NIL return form...",
      "Capturing acknowledgment receipt..."
    ];

    const diagram = `
      <svg viewBox="0 0 400 200" class="w-full h-auto">
        <rect x="10" y="10" width="80" height="40" rx="5" fill="#1b6d24" fill-opacity="0.1" stroke="#1b6d24" />
        <text x="50" y="35" text-anchor="middle" font-size="10" fill="#1b6d24">Login</text>
        <line x1="90" y1="30" x2="120" y2="30" stroke="#1b6d24" stroke-dasharray="4" />
        
        <rect x="120" y="10" width="80" height="40" rx="5" fill="#1b6d24" fill-opacity="0.1" stroke="#1b6d24" />
        <text x="160" y="35" text-anchor="middle" font-size="10" fill="#1b6d24">Dashboard</text>
        <line x1="200" y1="30" x2="230" y2="30" stroke="#1b6d24" stroke-dasharray="4" />
        
        <rect x="230" y="10" width="80" height="40" rx="5" fill="#1b6d24" fill-opacity="0.1" stroke="#1b6d24" />
        <text x="270" y="35" text-anchor="middle" font-size="10" fill="#1b6d24">Returns</text>
        <line x1="310" y1="30" x2="340" y2="30" stroke="#1b6d24" stroke-dasharray="4" />
        
        <rect x="340" y="10" width="50" height="40" rx="5" fill="#ba0013" fill-opacity="0.1" stroke="#ba0013" />
        <text x="365" y="35" text-anchor="middle" font-size="10" fill="#ba0013">File NIL</text>
        
        <path d="M 50 50 L 50 150 L 365 150 L 365 50" fill="none" stroke="#1b6d24" stroke-dasharray="4" />
        <text x="207" y="145" text-anchor="middle" font-size="8" fill="#1b6d24">Automation Loop</text>
      </svg>
    `;
    
    res.json({
      success: true,
      steps: steps.map((s, i) => ({
        id: i.toString(),
        label: s,
        status: 'completed',
        timestamp: Date.now()
      })),
      receiptNumber: "KRA-NIL-" + Math.random().toString(36).substring(7).toUpperCase(),
      screenshot: "https://picsum.photos/seed/itax-screenshot/800/600",
      diagram: diagram
    });
  });

  app.post("/api/kra/automation/pin-certificate", (req, res) => {
    const steps = [
      "Launching Playwright (Headless: false)...",
      "Navigating to https://itax.kra.go.ke/...",
      "Entering KRA PIN and Password...",
      "Solving Security Question/CAPTCHA...",
      "Submitting login form...",
      "Navigating to 'Registration' tab...",
      "Selecting 'Reprint PIN Certificate'...",
      "Verifying details on submission page...",
      "Clicking 'Submit' button...",
      "Waiting for download link generation...",
      "Clicking 'Click here to download PIN Certificate'...",
      "Capturing PDF stream and saving to device..."
    ];

    const diagram = `
      <svg viewBox="0 0 400 200" class="w-full h-auto">
        <rect x="10" y="10" width="80" height="40" rx="5" fill="#1b6d24" fill-opacity="0.1" stroke="#1b6d24" />
        <text x="50" y="35" text-anchor="middle" font-size="10" fill="#1b6d24">Login</text>
        <line x1="90" y1="30" x2="120" y2="30" stroke="#1b6d24" stroke-dasharray="4" />
        
        <rect x="120" y="10" width="80" height="40" rx="5" fill="#1b6d24" fill-opacity="0.1" stroke="#1b6d24" />
        <text x="160" y="35" text-anchor="middle" font-size="10" fill="#1b6d24">Registration</text>
        <line x1="200" y1="30" x2="230" y2="30" stroke="#1b6d24" stroke-dasharray="4" />
        
        <rect x="230" y="10" width="80" height="40" rx="5" fill="#1b6d24" fill-opacity="0.1" stroke="#1b6d24" />
        <text x="270" y="35" text-anchor="middle" font-size="10" fill="#1b6d24">Reprint</text>
        <line x1="310" y1="30" x2="340" y2="30" stroke="#1b6d24" stroke-dasharray="4" />
        
        <rect x="340" y="10" width="50" height="40" rx="5" fill="#ba0013" fill-opacity="0.1" stroke="#ba0013" />
        <text x="365" y="35" text-anchor="middle" font-size="10" fill="#ba0013">Download</text>
        
        <path d="M 50 50 L 50 150 L 365 150 L 365 50" fill="none" stroke="#1b6d24" stroke-dasharray="4" />
        <text x="207" y="145" text-anchor="middle" font-size="8" fill="#1b6d24">PDF Generation Flow</text>
      </svg>
    `;
    
    res.json({
      success: true,
      steps: steps.map((s, i) => ({
        id: i.toString(),
        label: s,
        status: 'completed',
        timestamp: Date.now()
      })),
      receiptNumber: "PIN-CERT-" + Math.random().toString(36).substring(7).toUpperCase(),
      screenshot: "https://picsum.photos/seed/pin-cert/800/600",
      diagram: diagram
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
