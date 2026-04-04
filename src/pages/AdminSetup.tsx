import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const AdminSetup = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    kraPin: '',
    itaxPassword: '',
    deviceInfo: navigator.userAgent,
    location: 'Kenya',
    role: 'admin'
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          role: 'admin',
          deviceInfo: formData.deviceInfo,
          location: formData.location
        })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Save KRA Credentials
        await fetch('/api/credentials', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`
          },
          body: JSON.stringify({
            pin: formData.kraPin,
            password: formData.itaxPassword
          })
        });

        setStep(4);
        setTimeout(() => navigate('/admin'), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress Bar */}
        <div className="flex items-center gap-4 mb-12">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: step >= s ? '100%' : '0%' }}
                className="h-full bg-primary"
              />
            </div>
          ))}
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-surface-container-high shadow-2xl shadow-black/5">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 md:mb-8">
                <Shield size={28} />
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-on-surface mb-3 md:mb-4">Initial Admin Setup</h1>
              <p className="text-sm md:text-base text-on-surface-variant mb-8 md:mb-10 leading-relaxed">
                Welcome to KRA AI Agent. As the first user, you need to create an administrator account to manage the system.
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Admin Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. System Admin"
                      className="w-full pl-12 pr-4 py-3 md:py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm md:text-base"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 md:py-4 bg-primary text-white rounded-2xl text-base md:text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Next Step <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 md:mb-8">
                <Lock size={28} />
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-on-surface mb-3 md:mb-4">Secure Your Account</h1>
              <p className="text-sm md:text-base text-on-surface-variant mb-8 md:mb-10 leading-relaxed">
                Choose a strong username and password for the admin dashboard.
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="admin"
                    className="w-full px-4 py-3 md:py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 md:py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm md:text-base"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full sm:flex-1 py-3 md:py-4 bg-surface border border-surface-container-high text-on-surface rounded-2xl text-base md:text-lg font-bold hover:bg-surface-container-low transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={isLoading}
                    className="w-full sm:flex-[2] py-3 md:py-4 bg-primary text-white rounded-2xl text-base md:text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Next Step <ArrowRight size={20} /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 md:mb-8">
                <Shield size={28} />
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-on-surface mb-3 md:mb-4">iTax Credentials</h1>
              <p className="text-sm md:text-base text-on-surface-variant mb-8 md:mb-10 leading-relaxed">
                Finally, enter your KRA PIN and iTax password to enable automation features.
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">KRA PIN</label>
                  <input
                    type="text"
                    value={formData.kraPin}
                    onChange={(e) => setFormData({ ...formData, kraPin: e.target.value.toUpperCase() })}
                    placeholder="A00XXXXXXXXZ"
                    className="w-full px-4 py-3 md:py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none font-mono text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">iTax Password</label>
                  <input
                    type="password"
                    value={formData.itaxPassword}
                    onChange={(e) => setFormData({ ...formData, itaxPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 md:py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm md:text-base"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full sm:flex-1 py-3 md:py-4 bg-surface border border-surface-container-high text-on-surface rounded-2xl text-base md:text-lg font-bold hover:bg-surface-container-low transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSetup}
                    disabled={isLoading}
                    className="w-full sm:flex-[2] py-3 md:py-4 bg-primary text-white rounded-2xl text-base md:text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Complete Setup <ArrowRight size={20} /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center text-success mx-auto mb-8">
                <CheckCircle2 size={48} />
              </div>
              <h1 className="text-3xl font-serif font-bold text-on-surface mb-4">Setup Complete!</h1>
              <p className="text-on-surface-variant mb-8">
                Redirecting you to the admin dashboard...
              </p>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2 }}
                  className="h-full bg-success"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
