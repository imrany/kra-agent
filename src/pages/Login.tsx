import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import CustomDialog from '../components/CustomDialog';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          deviceInfo: navigator.userAgent,
          location: 'Kenya' // Simplified for demo
        })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 mx-auto mb-6">
            <img src="https://flagcdn.com/w40/ke.png" alt="Kenya" className="w-10 h-6 object-cover rounded-sm" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-on-surface mb-2">Welcome Back</h1>
          <p className="text-on-surface-variant">Log in to your KRA AI Agent account</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-surface-container-high shadow-xl shadow-black/5">
          {error && (
            <div className="mb-6 p-4 bg-error/5 border border-error/10 rounded-xl flex items-center gap-3 text-error text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                Username / KRA PIN
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. A001234567Z"
                  className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-on-surface"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={() => setDialog({
                    isOpen: true,
                    title: "Password Reset",
                    message: "For security, password resets must be performed by a system administrator. If you are the admin and forgot your password, please check the server logs for the registered admin username or reset the database.",
                    type: 'alert',
                    onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
                  })}
                  className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-on-surface"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Login <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-surface-container-high text-center">
            <p className="text-on-surface-variant text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

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

export default Login;
