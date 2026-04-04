import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Shield, 
  Save, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  Eye,
  EyeOff,
  Database,
  Smartphone,
  MapPin,
  Fingerprint,
  KeyRound,
  ShieldAlert,
  Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Credentials } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const Settings = () => {
  const [creds, setCreds] = useState<Credentials>({ pin: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [credsRes, userRes] = await Promise.all([
        fetch('/api/credentials', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (credsRes.ok && userRes.ok) {
        const c = await credsRes.json();
        if (c) setCreds(c);
        setUser(await userRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCreds = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(creds)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const isPinSet = creds.pin && creds.pin.length > 0;

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-surface-container-high">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all group font-bold"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <SettingsIcon size={18} />
            </div>
            <span className="font-serif font-bold text-on-surface">Account Settings</span>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Profile & Info */}
            <div className="lg:col-span-4 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-[32px] border border-surface-container-high shadow-xl shadow-black/5 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-24 bg-primary/5" />
                <div className="relative pt-4">
                  <div className="w-24 h-24 bg-white rounded-3xl border-4 border-surface shadow-lg flex items-center justify-center text-primary font-bold text-3xl mx-auto mb-6">
                    {user?.name?.[0] || user?.username[0].toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-on-surface mb-1">{user?.name || 'User'}</h2>
                  <p className="text-sm text-on-surface-variant mb-8 font-mono">{user?.username}</p>
                  
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-surface-container-high group transition-all hover:border-primary/20">
                      <Smartphone size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Device</p>
                        <p className="text-xs text-on-surface truncate font-medium">{user?.device_info || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-surface-container-high group transition-all hover:border-primary/20">
                      <MapPin size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Location</p>
                        <p className="text-xs text-on-surface font-medium">{user?.location || 'Kenya'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.clear();
                      navigate('/login');
                    }}
                    className="w-full mt-8 py-4 bg-error/5 text-error rounded-2xl text-sm font-bold hover:bg-error/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Logout Account
                  </button>
                </div>
              </motion.div>

              <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10">
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={20} className="text-primary" />
                  <h4 className="font-bold text-primary text-sm">Security Note</h4>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Your iTax credentials are encrypted and stored locally. We never share your password with third parties. Automation is performed directly on your device.
                </p>
              </div>
            </div>

            {/* Right Column: Forms */}
            <div className="lg:col-span-8 space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-10 rounded-[40px] border border-surface-container-high shadow-xl shadow-black/5"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Fingerprint size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-on-surface">iTax Credentials</h3>
                      <p className="text-xs text-on-surface-variant">Used for automated portal tasks</p>
                    </div>
                  </div>
                  {isPinSet && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Verified</span>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
                        KRA PIN
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                        <input
                          type="text"
                          value={creds.pin}
                          readOnly={isPinSet}
                          onChange={(e) => setCreds({ ...creds, pin: e.target.value.toUpperCase() })}
                          placeholder="A00XXXXXXXXZ"
                          className={cn(
                            "w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none font-mono font-bold",
                            isPinSet ? "opacity-60 cursor-not-allowed bg-surface-container-low" : "hover:border-primary/30"
                          )}
                        />
                      </div>
                      {isPinSet && (
                        <p className="mt-2 text-[10px] text-on-surface-variant flex items-center gap-1.5 px-1">
                          <ShieldAlert size={12} /> PIN cannot be changed once set.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
                        iTax Password
                      </label>
                      <div className="relative group">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={creds.password}
                          onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none hover:border-primary/30"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSaveCreds}
                      disabled={isSaving}
                      className={cn(
                        "w-full py-5 rounded-2xl text-lg font-bold shadow-xl transition-all flex items-center justify-center gap-3",
                        saveSuccess 
                          ? "bg-success text-white shadow-success/30" 
                          : "bg-primary text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : saveSuccess ? (
                        <>
                          <CheckCircle2 size={24} />
                          <span>Saved Successfully</span>
                        </>
                      ) : (
                        <>
                          <Save size={24} />
                          <span>Update Credentials</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface-container-low p-8 rounded-[32px] border border-surface-container-high flex flex-col md:flex-row items-center gap-6"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-surface-container-high">
                  <Database size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-lg font-serif font-bold text-on-surface mb-1">Local Database Storage</h4>
                  <p className="text-sm text-on-surface-variant">
                    All your data is stored in a secure SQLite database on this server instance. No cloud syncing is enabled for your private keys.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
