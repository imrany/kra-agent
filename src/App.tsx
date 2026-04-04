import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  LayoutDashboard, 
  Calculator, 
  User, 
  Settings, 
  HelpCircle, 
  UserCircle, 
  History, 
  Bell, 
  FileText, 
  ShieldCheck, 
  Download, 
  Paperclip, 
  Mic, 
  Send,
  Calendar,
  Landmark,
  Menu,
  X,
  Lock,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  ExternalLink,
  CreditCard,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { Message, UserProfile, Credentials, AutomationStep } from './types';

// --- Components ---

const Sidebar = ({ isOpen, onClose, onTaskClick }: { isOpen: boolean, onClose: () => void, onTaskClick: (label: string) => void }) => {
  const quickTasks = [
    { id: 'nil', label: 'Nil Returns', icon: FileText, badge: '2024' },
    { id: 'compliance', label: 'Tax Compliance', icon: ShieldCheck },
    { id: 'pin', label: 'PIN Certificate', icon: FileText },
    { id: 'ledger', label: 'Tax Ledger', icon: LayoutDashboard },
    { id: 'mpesa', label: 'M-Pesa Payment Slip', icon: CreditCard },
    { id: 'refund', label: 'Refund Status', icon: RefreshCw },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-surface-container-low border-r border-surface-container-high z-50 transition-transform duration-300 lg:translate-x-0 lg:static lg:block",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <img src="https://flagcdn.com/w40/ke.png" alt="Kenya" className="w-6 h-4 object-cover rounded-sm" />
              </div>
              <div>
                <h1 className="text-lg font-serif font-bold text-on-surface leading-tight">KRA Agent</h1>
                <p className="text-[10px] text-on-surface-variant">iTax Automation</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 text-on-surface-variant">
              <X size={20} />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-full w-fit">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Agent online</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-3">Quick Tasks</h2>
              <nav className="space-y-1">
                {quickTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { onTaskClick(task.label); onClose(); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm text-on-surface-variant hover:bg-white/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <task.icon size={18} className="text-on-surface-variant" />
                      <span>{task.label}</span>
                    </div>
                    {task.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-bold">{task.badge}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-surface-container-high">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-container-high">
              <div className="w-8 h-8 bg-surface-container-low rounded-lg flex items-center justify-center text-[10px] font-mono text-on-surface-variant">
                c850
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-on-surface-variant truncate">c850b059-e...</p>
                <p className="text-[10px] text-on-surface-variant">No model configured</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const SettingsModal = ({ isOpen, onClose, creds, onSaveCreds, preferences, onSavePreference }: { 
  isOpen: boolean, 
  onClose: () => void, 
  creds: Credentials | null, 
  onSaveCreds: (c: Credentials) => void,
  preferences: any,
  onSavePreference: (key: string, value: string) => void
}) => {
  const [activeSection, setActiveSection] = useState<'general' | 'credentials'>('general');
  const [tempPin, setTempPin] = useState(creds?.pin || '');
  const [tempPassword, setTempPassword] = useState(creds?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempPin(creds?.pin || '');
      setTempPassword(creds?.password || '');
    }
  }, [isOpen, creds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl h-full sm:h-[500px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row"
      >
        {/* Sidebar */}
        <div className="w-full sm:w-48 bg-surface-container-low border-b sm:border-b-0 sm:border-r border-surface-container-high p-4 flex flex-row sm:flex-col items-center sm:items-stretch gap-4 sm:gap-0">
          <h2 className="text-lg font-serif font-bold sm:mb-6 px-2 whitespace-nowrap">Settings</h2>
          <nav className="flex-1 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
            <button 
              onClick={() => setActiveSection('general')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap",
                activeSection === 'general' ? "bg-white text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-white/50"
              )}
            >
              <Settings size={16} />
              <span>General</span>
            </button>
            <button 
              onClick={() => setActiveSection('credentials')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap",
                activeSection === 'credentials' ? "bg-white text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-white/50"
              )}
            >
              <Lock size={16} />
              <span>Credentials</span>
            </button>
          </nav>
          <button 
            onClick={onClose}
            className="sm:mt-auto flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-white/50 transition-all"
          >
            <X size={16} />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 flex-1 overflow-y-auto">
            {activeSection === 'general' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">AI Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Gemini API Key</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={preferences.api_key || ''}
                          onChange={(e) => onSavePreference('api_key', e.target.value)}
                          placeholder="Enter your Gemini API Key"
                          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all pl-10"
                        />
                        <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1.5">Used for AI reasoning and task planning.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Model Selection</label>
                      <select 
                        value={preferences.model || 'gemini-3-flash-preview'}
                        onChange={(e) => onSavePreference('model', e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">iTax Authentication</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">KRA PIN</label>
                      <input 
                        type="text" 
                        value={tempPin}
                        readOnly={!!creds}
                        onChange={(e) => setTempPin(e.target.value.toUpperCase())}
                        placeholder="A00XXXXXXXXZ"
                        className={cn(
                          "w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all",
                          creds ? "opacity-60 cursor-not-allowed" : ""
                        )}
                      />
                      {creds && <p className="text-[10px] text-primary mt-1 font-bold">PIN is immutable after account creation.</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all pr-10"
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
                  <ShieldCheck size={18} className="text-primary shrink-0" />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    Account creation happens automatically when you save your credentials for the first time.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="p-6 bg-surface-container-low border-t border-surface-container-high flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (activeSection === 'credentials') {
                  onSaveCreds({ pin: tempPin, password: tempPassword });
                }
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [preferences, setPreferences] = useState<any>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [credsRes, prefsRes] = await Promise.all([
          fetch('/api/credentials'),
          fetch('/api/preferences')
        ]);
        const credsData = await credsRes.json();
        const prefsData = await prefsRes.json();
        setCreds(credsData);
        setPreferences(prefsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveCreds = async (newCreds: Credentials) => {
    try {
      await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCreds)
      });
      setCreds(newCreds);
      
      // Refresh preferences to get new user_name if it was created
      const prefsRes = await fetch('/api/preferences');
      const prefsData = await prefsRes.json();
      setPreferences(prefsData);
    } catch (error) {
      console.error("Failed to save credentials:", error);
    }
  };

  const savePreference = async (key: string, value: string) => {
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      setPreferences((prev: any) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error("Failed to save preference:", error);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (messageText.toLowerCase().includes('file nil') || messageText.toLowerCase().includes('nil return')) {
      await runAutomation('nil-return');
    } else if (messageText.toLowerCase().includes('pin certificate') || messageText.toLowerCase().includes('reprint pin')) {
      await runAutomation('pin-certificate');
    } else {
      try {
        const apiKey = preferences.api_key || process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: preferences.model || "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: messageText }] }],
          config: { systemInstruction: "You are a KRA AI Agent. You help users with Kenyan tax tasks. You can automate tasks on iTax." }
        });

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: response.text || "I'm here to help with your KRA tasks.",
          timestamp: Date.now()
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: "I'm having trouble connecting to my AI core. Please check your API key in Settings.",
          timestamp: Date.now()
        }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const runAutomation = async (type: string) => {
    if (!creds) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I need your iTax credentials to perform this task. Please configure them in **Settings > Credentials**.",
        timestamp: Date.now()
      }]);
      setIsTyping(false);
      return;
    }

    const automationMsg: Message = {
      id: Date.now().toString(),
      role: 'model',
      text: `Starting automated ${type.replace('-', ' ')}...`,
      timestamp: Date.now(),
      type: 'automation',
      automationSteps: [
        { id: '1', label: 'Initializing browser...', status: 'running', timestamp: Date.now() }
      ]
    };

    setMessages(prev => [...prev, automationMsg]);

    const res = await fetch(`/api/kra/automation/${type}`, { method: 'POST' });
    const data = await res.json();

    for (let i = 0; i < data.steps.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setMessages(prev => prev.map(m => m.id === automationMsg.id ? {
        ...m,
        automationSteps: data.steps.slice(0, i + 1).map((s: any, idx: number) => ({
          ...s,
          status: idx === i ? 'running' : 'completed'
        }))
      } : m));
    }

    await new Promise(r => setTimeout(r, 1000));
    setMessages(prev => prev.map(m => m.id === automationMsg.id ? {
      ...m,
      text: `✅ **Task Completed!** Your ${type.replace('-', ' ')} has been processed successfully.\n\n**Receipt Number:** \`${data.receiptNumber}\``,
      automationSteps: data.steps,
      screenshot: data.screenshot,
      diagram: data.diagram
    } : m));
    setIsTyping(false);
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onTaskClick={(label) => handleSend(`Help me with ${label}`)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-surface-container-high bg-white flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-on-surface">KRA AI Agent</h2>
              <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] text-on-surface-variant">
                -
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all border border-surface-container-high"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto pt-12 text-center space-y-8">
              <div className="flex justify-center">
                <img src="https://flagcdn.com/w160/ke.png" alt="Kenya" className="w-16 h-10 object-cover rounded-md shadow-lg" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-serif font-medium text-on-surface">
                  Habari {preferences.user_name ? preferences.user_name : ''}!
                </h2>
                <p className="text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  I automate iTax tasks using a real browser — nil returns, compliance checks, PIN certificates, payments and more.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {["File nil returns for 2024", "Am I tax compliant?", "How do I pay via M-Pesa?", "What's the filing deadline?"].map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(q)}
                    className="px-4 py-2 bg-white border border-surface-container-high rounded-full text-sm text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {!creds && (
                <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center justify-center gap-3 max-w-md mx-auto">
                  <HelpCircle size={18} className="text-primary" />
                  <p className="text-xs text-primary font-medium">
                    Configure your credentials in Settings before starting
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                    msg.role === 'model' ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface"
                  )}>
                    {msg.role === 'model' ? <Bot size={18} /> : <User size={18} />}
                  </div>
                  <div className={cn("flex-1 space-y-4", msg.role === 'user' ? "text-right" : "")}>
                    <div className={cn(
                      "inline-block p-4 rounded-2xl text-sm leading-relaxed w-full",
                      msg.role === 'model' 
                        ? "bg-white border border-surface-container-high text-on-surface text-left" 
                        : "bg-primary text-white text-left"
                    )}>
                      <div className="prose prose-sm max-w-none">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>

                    {msg.type === 'automation' && msg.automationSteps && (
                      <div className="bg-white border border-surface-container-high rounded-2xl overflow-hidden shadow-sm w-full">
                        <div className="p-4 border-b border-surface-container-high bg-surface-container-low flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Search size={14} className="text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Thinking Process</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-on-surface-variant">Live Browser</span>
                            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {msg.automationSteps.map((step) => (
                            <div key={step.id} className="flex items-center gap-3 text-xs">
                              {step.status === 'completed' ? (
                                <CheckCircle2 size={14} className="text-primary" />
                              ) : step.status === 'running' ? (
                                <Loader2 size={14} className="text-primary animate-spin" />
                              ) : (
                                <Circle size={14} className="text-on-surface-variant/30" />
                              )}
                              <span className={cn(
                                "font-medium",
                                step.status === 'completed' ? "text-on-surface" : "text-on-surface-variant"
                              )}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        {msg.diagram && (
                          <div className="p-4 bg-surface-container-low border-t border-surface-container-high">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Flow Diagram</span>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-surface-container-high" dangerouslySetInnerHTML={{ __html: msg.diagram }} />
                          </div>
                        )}
                        {msg.screenshot && (
                          <div className="p-4 bg-surface-container-low border-t border-surface-container-high">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Live Screenshot</span>
                              <button className="text-[10px] text-primary font-bold flex items-center gap-1">
                                <ExternalLink size={10} />
                                View Full
                              </button>
                            </div>
                            <img 
                              src={msg.screenshot} 
                              alt="iTax Screenshot" 
                              className="w-full rounded-lg border border-surface-container-high shadow-inner"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot size={18} />
                </div>
                <div className="bg-white border border-surface-container-high p-4 rounded-2xl flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <footer className="p-4 lg:p-8 shrink-0">
          <div className="max-w-4xl mx-auto bg-surface-container-low border border-surface-container-high rounded-2xl p-2 shadow-sm">
            <div className="flex items-end gap-2">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-on-surface placeholder:text-on-surface-variant/50 py-3 px-4 resize-none min-h-[44px] max-h-32" 
                placeholder="Ask about KRA taxes or request an automated task..." 
                rows={1}
              />
              <div className="flex items-center gap-1 pr-2 pb-1.5">
                <button className="p-2 text-on-surface-variant hover:bg-white rounded-lg transition-all">
                  <Mic size={18} />
                </button>
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="bg-primary text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 px-2 max-w-4xl mx-auto">
            <p className="text-[10px] text-on-surface-variant">
              Enter to send • Shift+Enter for newline
            </p>
            <p className="text-[10px] text-on-surface-variant">
              Model: {preferences.model || 'Gemini 3 Flash'}
            </p>
          </div>
        </footer>
      </main>

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        creds={creds}
        onSaveCreds={saveCreds}
        preferences={preferences}
        onSavePreference={savePreference}
      />
    </div>
  );
}
