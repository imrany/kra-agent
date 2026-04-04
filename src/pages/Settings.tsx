import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Credentials } from '../types';

const Settings = () => {
  const [creds, setCreds] = useState<Credentials>({ pin: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/credentials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(creds)
      });
      alert('Credentials updated successfully!');
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

  return (
    <div className="min-h-screen bg-surface p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-10 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Back to Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Profile Card */}
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white p-8 rounded-[40px] border border-surface-container-high shadow-xl shadow-black/5 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center text-primary font-bold text-3xl mx-auto mb-6">
                {user?.name?.[0] || user?.username[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-serif font-bold text-on-surface mb-1">{user?.name || 'User'}</h2>
              <p className="text-sm text-on-surface-variant mb-6">{user?.username}</p>
              
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 p-3 bg-surface rounded-2xl border border-surface-container-high">
                  <Smartphone size={14} className="text-on-surface-variant" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">{user?.device_info || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface rounded-2xl border border-surface-container-high">
                  <MapPin size={14} className="text-on-surface-variant" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{user?.location || 'Kenya'}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.clear();
                  navigate('/login');
                }}
                className="w-full mt-8 py-3 bg-error/5 text-error rounded-2xl text-sm font-bold hover:bg-error/10 transition-all"
              >
                Logout Account
              </button>
            </div>
          </div>

          {/* Settings Form */}
          <div className="flex-1 space-y-8">
            <div className="bg-white p-10 rounded-[40px] border border-surface-container-high shadow-xl shadow-black/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Database size={20} />
                </div>
                <h3 className="text-xl font-serif font-bold text-on-surface">iTax Credentials</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">KRA PIN</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="text"
                      value={creds.pin}
                      onChange={(e) => setCreds({ ...creds, pin: e.target.value })}
                      placeholder="A00XXXXXXXXZ"
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">iTax Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={creds.password}
                      onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveCreds}
                  disabled={isSaving}
                  className="w-full py-4 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <>Save Credentials <Save size={20} /></>}
                </button>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-surface-container-high shadow-xl shadow-black/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Shield size={20} />
                </div>
                <h3 className="text-xl font-serif font-bold text-on-surface">Security Status</h3>
              </div>
              <div className="flex items-center justify-between p-4 bg-success/5 rounded-2xl border border-success/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-success" size={20} />
                  <div>
                    <p className="text-sm font-bold text-on-surface">Encrypted Storage</p>
                    <p className="text-[10px] text-on-surface-variant">Your credentials are stored securely in a local SQLite database.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
