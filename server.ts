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

  app.post("/api/kra/automation/pin-certificate", (req, res) => {
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

  app.post("/api/kra/automation/compliance-check", (req, res) => {
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
