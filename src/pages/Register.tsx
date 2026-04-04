import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle, MapPin, Smartphone, Fingerprint, KeyRound } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    kraPin: '',
    itaxPassword: '',
    deviceInfo: navigator.userAgent,
    location: 'Kenya'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
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

        navigate('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 mx-auto mb-6">
            <img src="https://flagcdn.com/w40/ke.png" alt="Kenya" className="w-10 h-6 object-cover rounded-sm" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-on-surface mb-2">Create Account</h1>
          <p className="text-on-surface-variant">Join the future of KRA automation</p>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[40px] border border-surface-container-high shadow-xl shadow-black/5">
          {error && (
            <div className="mb-6 p-4 bg-error/5 border border-error/10 rounded-xl flex items-center gap-3 text-error text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary px-1">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Imran Mat"
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-on-surface"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                    App Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. imran254"
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-on-surface"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                  App Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-surface-container-high">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary px-1">iTax Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                    KRA PIN
                  </label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="text"
                      required
                      value={formData.kraPin}
                      onChange={(e) => setFormData({ ...formData, kraPin: e.target.value.toUpperCase() })}
                      placeholder="A00XXXXXXXXZ"
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-on-surface font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                    iTax Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="password"
                      required
                      value={formData.itaxPassword}
                      onChange={(e) => setFormData({ ...formData, itaxPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-on-surface"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-surface rounded-2xl border border-surface-container-high flex items-center gap-3">
                <Smartphone size={18} className="text-on-surface-variant" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Device</p>
                  <p className="text-xs text-on-surface truncate">Auto-detected</p>
                </div>
              </div>
              <div className="p-4 bg-surface rounded-2xl border border-surface-container-high flex items-center gap-3">
                <MapPin size={18} className="text-on-surface-variant" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Location</p>
                  <p className="text-xs text-on-surface truncate">Kenya</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-surface-container-high text-center">
            <p className="text-on-surface-variant text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline transition-all">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
