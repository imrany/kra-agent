import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Settings, 
  HelpCircle, 
  FileText, 
  ShieldCheck, 
  Shield,
  Download, 
  Mic, 
  Send,
  Menu,
  X,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  CreditCard,
  RefreshCw,
  Search,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { Message, Credentials, AutomationStep } from '../types';
import { useNavigate } from 'react-router-dom';
import CustomDialog from '../components/CustomDialog';

const Sidebar = ({ isOpen, onClose, onTaskClick, navigate, onClearChat }: { isOpen: boolean, onClose: () => void, onTaskClick: (label: string) => void, navigate: (path: string) => void, onClearChat: () => void }) => {
  const quickTasks = [
    { id: 'nil', label: 'Nil Returns', icon: FileText, badge: 'Stealth' },
    { id: 'compliance', label: 'Compliance Check', icon: ShieldCheck, badge: 'Vision' },
    { id: 'pin', label: 'PIN Certificate', icon: Download, badge: 'Stealth' },
    { id: 'mpesa', label: 'M-Pesa Payment Slip', icon: CreditCard },
    { id: 'refund', label: 'Refund Status', icon: RefreshCw },
  ];

  return (
    <>
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

          <div className="pt-6 border-t border-surface-container-high space-y-2">
            <button 
              onClick={onClearChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-error/5 hover:text-error transition-all"
            >
              <Trash2 size={18} />
              <span className="font-medium">Clear Chat</span>
            </button>
            <button 
              onClick={() => {
                navigate('/settings');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-white/50 transition-all"
            >
              <Settings size={18} />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [preferences, setPreferences] = useState<any>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTask, setActiveTask] = useState<{ id: string, status: string, prompt?: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [user, setUser] = useState<any>(null);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => {}
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [credsRes, prefsRes, userRes, messagesRes] = await Promise.all([
          fetch('/api/credentials', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/preferences', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        if (credsRes.status === 401) {
          navigate('/login');
          return;
        }

        if (!credsRes.ok || !prefsRes.ok || !userRes.ok || !messagesRes.ok) {
          throw new Error(`Server error: ${credsRes.status} ${prefsRes.status} ${userRes.status} ${messagesRes.status}`);
        }

        const contentType = credsRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response. The server might be restarting or misconfigured.");
        }

        const credsData = await credsRes.json();
        const prefsData = await prefsRes.json();
        const userData = await userRes.json();
        const messagesData = await messagesRes.json();
        
        setCreds(credsData);
        setPreferences(prefsData);
        setUser(userData);
        setMessages(messagesData.map((m: any) => ({
          ...m,
          messageType: m.type === 'user' ? 'prompt' : 'response',
          role: m.type === 'user' ? 'user' : 'model'
        })));
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    let interval: any;
    if (activeTask && (activeTask.status === 'running' || activeTask.status === 'paused')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/kra/tasks/${activeTask.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          
          setMessages(prev => prev.map(m => {
            if (m.type === 'automation' && m.id === activeTask.id) {
              return {
                ...m,
                automationSteps: data.steps,
                text: data.status === 'completed' ? "✅ **Task Completed Successfully!**" : (data.status === 'failed' ? "❌ **Task Failed.**" : m.text)
              };
            }
            return m;
          }));

          if (data.status === 'paused') {
            setActiveTask(prev => ({ ...prev!, status: 'paused', prompt: "Security Question Detected." }));
          } else if (data.status === 'completed' || data.status === 'failed') {
            setActiveTask(null);
            clearInterval(interval);
            setIsTyping(false);
            
            // Save final state to DB
            const finalMsg = messages.find(m => m.id === activeTask.id);
            if (finalMsg) saveMessage(finalMsg);
          } else {
            setActiveTask(prev => ({ ...prev!, status: data.status }));
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTask, messages]);

  const handleAnswerSubmit = async () => {
    if (!activeTask || !answer) return;
    try {
      await fetch(`/api/kra/tasks/${activeTask.id}/answer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ answer })
      });
      setAnswer('');
      setActiveTask(prev => ({ ...prev!, status: 'running', prompt: undefined }));
    } catch (err) {
      console.error("Answer submission error:", err);
    }
  };

  const saveMessage = async (msg: Partial<Message>) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: msg.messageType === 'prompt' ? 'user' : (msg.type === 'automation' ? 'automation' : 'bot'),
          text: msg.text,
          automationSteps: msg.automationSteps,
          extractedData: msg.extractedData,
          receiptNumber: (msg as any).receiptNumber
        })
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
      messageType: 'prompt'
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessage(userMessage);
    setInput('');
    setIsTyping(true);

    if (messageText.toLowerCase().includes('file nil') || messageText.toLowerCase().includes('nil return')) {
      await runAutomation('nil-return');
    } else if (messageText.toLowerCase().includes('pin certificate') || messageText.toLowerCase().includes('reprint pin')) {
      await runAutomation('pin-certificate');
    } else if (messageText.toLowerCase().includes('compliance check') || messageText.toLowerCase().includes('tax status')) {
      await runAutomation('compliance-check');
    } else {
      try {
        const token = localStorage.getItem('token');
        const settingsRes = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
        const settings = await settingsRes.json();
        
        const apiKey = settings.api_key || process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: settings.model || "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: messageText }] }],
          config: { systemInstruction: "You are a KRA AI Agent. You help users with Kenyan tax tasks. You can automate tasks on iTax." }
        });

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: response.text || "I'm here to help with your KRA tasks.",
          timestamp: Date.now(),
          messageType: 'response'
        };
        setMessages(prev => [...prev, botMsg]);
        saveMessage(botMsg);
      } catch (error) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: "I'm having trouble connecting to my AI core. Please check the system settings.",
          timestamp: Date.now(),
          messageType: 'response'
        };
        setMessages(prev => [...prev, errorMsg]);
        saveMessage(errorMsg);
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
        text: "I need your iTax credentials to perform this task. Please configure them in **Settings**.",
        timestamp: Date.now(),
        messageType: 'response'
      }]);
      setIsTyping(false);
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/kra/automation/${type}`, { 
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.taskId) {
        const automationMsg: Message = {
          id: data.taskId,
          role: 'model',
          text: `Starting automated ${type.replace('-', ' ')}...`,
          timestamp: Date.now(),
          type: 'automation',
          messageType: 'response',
          automationSteps: []
        };
        setMessages(prev => [...prev, automationMsg]);
        setActiveTask({ id: data.taskId, status: 'running' });
      }
    } catch (err) {
      console.error("Automation error:", err);
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    setDialog({
      isOpen: true,
      title: "Clear Chat History",
      message: "Are you sure you want to clear your chat history? This action cannot be undone.",
      type: 'confirm',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          await fetch('/api/messages', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages([]);
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Failed to clear chat:", err);
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onTaskClick={(label) => handleSend(`Help me with ${label}`)}
        navigate={navigate}
        onClearChat={handleClearChat}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
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
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-all border border-primary/20"
              >
                <Shield size={14} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto pt-12 text-center space-y-8">
              <div className="flex justify-center">
                <img src="https://flagcdn.com/w160/ke.png" alt="Kenya" className="w-16 h-10 object-cover rounded-md shadow-lg" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-serif font-medium text-on-surface">
                  Habari {user?.name || ''}!
                </h2>
                <p className="text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  I automate iTax tasks using a real browser — nil returns, compliance checks, PIN certificates, and more.
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
                    Configure your iTax credentials in Settings before starting
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
                  className="flex flex-col w-full gap-3"
                >
                  <div className={cn(
                    "flex w-full",
                    msg.messageType === 'prompt' ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.messageType === 'response' 
                        ? "bg-inherit border border-surface-container-high text-on-surface rounded-tl-none" 
                        : "bg-primary text-white rounded-tr-none"
                    )}>
                      <div className={cn(
                        "prose prose-sm max-w-none",
                        msg.messageType === 'prompt' ? "prose-invert" : ""
                      )}>
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </div>

                  {msg.messageType === 'response' && (
                    <div className="space-y-4 w-full">
                      {msg.type === 'automation' && msg.automationSteps && (
                        <div className="bg-white border border-surface-container-high rounded-2xl overflow-hidden shadow-sm w-full">
                          <div className="p-4 border-b border-surface-container-high bg-surface-container-low flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Search size={14} className="text-primary" />
                              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Automation Log</span>
                            </div>
                          </div>
                          <div className="divide-y divide-surface-container-high">
                            {msg.automationSteps.map((step) => (
                              <details key={step.id} className="group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors list-none">
                                  <div className="flex items-center gap-3 text-xs">
                                    <CheckCircle2 size={14} className="text-primary" />
                                    <span className="font-medium text-on-surface">
                                      {step.label}
                                    </span>
                                  </div>
                                  {step.screenshot && (
                                    <ChevronRight size={14} className="text-on-surface-variant transition-transform group-open:rotate-90" />
                                  )}
                                </summary>
                                {step.screenshot && (
                                  <div className="p-4 bg-surface-container-low border-t border-surface-container-high">
                                    <img 
                                      src={step.screenshot} 
                                      alt={step.label} 
                                      className="w-full rounded-lg border border-surface-container-high shadow-sm"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                              </details>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.extractedData && (
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck size={14} className="text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Extracted Data</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(msg.extractedData).map(([key, value]) => (
                              <div key={key} className="p-2 bg-white rounded-lg border border-surface-container-high">
                                <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                <p className="text-xs font-mono font-bold text-on-surface">
                                  {String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {activeTask?.status === 'paused' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-amber-800">
                  <Shield size={20} />
                  <h3 className="font-bold">Security Question Required</h3>
                </div>
                <p className="text-sm text-amber-700">
                  The iTax portal is asking for a security answer. Please provide it below to continue.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="flex-1 px-4 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                  />
                  <button 
                    onClick={handleAnswerSubmit}
                    className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </motion.div>
            )}

            {isTyping && (
              <div className="flex gap-4">
                <div className="bg-inherit text-on-surface p-4 rounded-2xl flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-xs font-medium text-on-surface-variant">
                    {activeTask ? `Agent is performing ${activeTask.status === 'paused' ? 'security check' : 'automation'}...` : 'Agent is thinking...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

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
                placeholder="Ask about KRA taxes..." 
                rows={1}
              />
              <div className="flex items-center gap-1 pr-2 pb-1.5">
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
        </footer>
      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Dashboard;
