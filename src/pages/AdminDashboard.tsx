import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  Shield, 
  LogOut, 
  Trash2, 
  Power, 
  Smartphone, 
  MapPin, 
  Search, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Save,
  Key,
  Bot,
  Database,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import CustomDialog from '../components/CustomDialog';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'database'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>({
    api_key: '',
    model: 'gemini-3-flash-preview'
  });
  const [dbConfig, setDbConfig] = useState<any>({
    type: 'sqlite',
    sqlitePath: 'kra_agent.db',
    pgConfig: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '',
      database: 'kra_agent'
    }
  });
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [usersRes, settingsRes, dbRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/database-config', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (usersRes.ok && settingsRes.ok && dbRes.ok) {
        setUsers(await usersRes.json());
        const settings = await settingsRes.json();
        setAdminSettings({
          api_key: settings.api_key || '',
          model: settings.model || 'gemini-3-flash-preview'
        });
        const dbData = await dbRes.json();
        setDbConfig(dbData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDbConfig = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/database-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(dbConfig)
      });
      const data = await res.json();
      if (data.success) {
        setDialog({
          isOpen: true,
          title: 'Success',
          message: 'Database configuration updated successfully!',
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: 'Error: ' + data.error,
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err) {
      console.error(err);
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save database configuration',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutUser = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/users/${userId}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setDialog({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchData();
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(err);
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        Object.entries(adminSettings).map(([key, value]) =>
          fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ key, value })
          })
        )
      );
      setDialog({
        isOpen: true,
        title: 'Success',
        message: 'Settings saved successfully!',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 bg-surface-container-low border-b border-surface-container-high flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Shield className="text-primary" size={24} />
          <span className="font-serif font-bold text-on-surface">Admin Panel</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-on-surface-variant hover:bg-white/50 rounded-lg transition-all"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Admin Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-surface-container-low border-r border-surface-container-high flex flex-col p-6 z-50 transition-transform duration-300 lg:translate-x-0 lg:static lg:block",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-on-surface">Admin Panel</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">KRA AI Agent</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-on-surface-variant">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-white/50'
            }`}
          >
            <Users size={20} />
            <span className="font-bold">User Management</span>
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-white/50'
            }`}
          >
            <Settings size={20} />
            <span className="font-bold">System Settings</span>
          </button>
          <button
            onClick={() => { setActiveTab('database'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'database' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-white/50'
            }`}
          >
            <Database size={20} />
            <span className="font-bold">Database Config</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-surface-container-high space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-on-surface-variant hover:bg-white/50 transition-all"
          >
            <ArrowLeft size={20} />
            <span className="font-bold">Back to App</span>
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-error hover:bg-error/5 transition-all"
          >
            <LogOut size={20} />
            <span className="font-bold">Logout Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'users' ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-on-surface mb-2">User Management</h2>
                  <p className="text-sm text-on-surface-variant">Monitor and manage all system users</p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-primary" size={40} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:gap-6">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white p-4 lg:p-6 rounded-3xl border border-surface-container-high shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-surface rounded-2xl flex items-center justify-center text-primary font-bold text-lg lg:text-xl shrink-0">
                          {user.name?.[0] || user.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-on-surface truncate">{user.name || 'Anonymous User'}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {user.role}
                            </span>
                            {user.status === 'active' ? (
                              <span className="flex items-center gap-1 text-[10px] text-success font-bold uppercase tracking-wider">
                                <CheckCircle2 size={10} /> Online
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                                <XCircle size={10} /> Offline
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant truncate">{user.username}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant uppercase font-bold">
                            <Smartphone size={12} />
                            <span className="truncate max-w-[100px] lg:max-w-[150px]">{user.device_info || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant uppercase font-bold">
                            <MapPin size={12} />
                            <span>{user.location || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          <button
                            onClick={() => handleLogoutUser(user.id)}
                            className="p-2 lg:p-3 text-on-surface-variant hover:bg-surface rounded-xl transition-all"
                            title="Force Logout"
                          >
                            <Power size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 lg:p-3 text-error hover:bg-error/5 rounded-xl transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-serif font-bold text-on-surface mb-2">System Settings</h2>
                <p className="text-on-surface-variant">Configure global AI parameters and API keys</p>
              </div>

              <div className="space-y-8 bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-surface-container-high shadow-sm">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                      type="password"
                      value={adminSettings.api_key}
                      onChange={(e) => setAdminSettings({ ...adminSettings, api_key: e.target.value })}
                      placeholder="Enter your Google AI Studio API Key"
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-on-surface-variant px-1 italic">
                    This key will be used globally for all user interactions.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
                    Default Model
                  </label>
                  <div className="relative">
                    <Bot className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <select
                      value={adminSettings.model}
                      onChange={(e) => setAdminSettings({ ...adminSettings, model: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none appearance-none"
                    >
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Smart)</option>
                      <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash TTS</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full py-4 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <>Save Configuration <Save size={20} /></>}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="database"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl"
            >
              <div className="mb-10">
                <h2 className="text-2xl lg:text-3xl font-serif font-bold text-on-surface mb-2">Database Configuration</h2>
                <p className="text-sm text-on-surface-variant">Switch between SQLite and PostgreSQL</p>
              </div>

              <div className="space-y-8 bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-surface-container-high shadow-sm">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
                    Database Type
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setDbConfig({ ...dbConfig, type: 'sqlite' })}
                      className={`flex-1 py-4 rounded-2xl border font-bold transition-all ${
                        dbConfig.type === 'sqlite' ? 'bg-primary text-white border-primary' : 'bg-surface border-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      SQLite
                    </button>
                    <button
                      onClick={() => setDbConfig({ ...dbConfig, type: 'postgres' })}
                      className={`flex-1 py-4 rounded-2xl border font-bold transition-all ${
                        dbConfig.type === 'postgres' ? 'bg-primary text-white border-primary' : 'bg-surface border-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      PostgreSQL
                    </button>
                  </div>
                </div>

                {dbConfig.type === 'sqlite' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
                      SQLite File Path
                    </label>
                    <input
                      type="text"
                      value={dbConfig.sqlitePath}
                      onChange={(e) => setDbConfig({ ...dbConfig, sqlitePath: e.target.value })}
                      className="w-full px-4 py-4 bg-surface rounded-2xl border border-surface-container-high focus:border-primary transition-all outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Host</label>
                        <input
                          type="text"
                          value={dbConfig.pgConfig.host}
                          onChange={(e) => setDbConfig({ ...dbConfig, pgConfig: { ...dbConfig.pgConfig, host: e.target.value } })}
                          className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Port</label>
                        <input
                          type="number"
                          value={dbConfig.pgConfig.port}
                          onChange={(e) => setDbConfig({ ...dbConfig, pgConfig: { ...dbConfig.pgConfig, port: parseInt(e.target.value) } })}
                          className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">User</label>
                        <input
                          type="text"
                          value={dbConfig.pgConfig.user}
                          onChange={(e) => setDbConfig({ ...dbConfig, pgConfig: { ...dbConfig.pgConfig, user: e.target.value } })}
                          className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Password</label>
                        <input
                          type="password"
                          value={dbConfig.pgConfig.password}
                          onChange={(e) => setDbConfig({ ...dbConfig, pgConfig: { ...dbConfig.pgConfig, password: e.target.value } })}
                          className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">Database Name</label>
                      <input
                        type="text"
                        value={dbConfig.pgConfig.database}
                        onChange={(e) => setDbConfig({ ...dbConfig, pgConfig: { ...dbConfig.pgConfig, database: e.target.value } })}
                        className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-container-high focus:border-primary transition-all outline-none text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] text-primary font-bold uppercase leading-relaxed">
                    Note: Switching databases will re-initialize the connection. Make sure the target database is accessible.
                  </p>
                </div>

                <button
                  onClick={handleSaveDbConfig}
                  disabled={isSaving}
                  className="w-full py-4 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <>Update Database <Save size={20} /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

export default AdminDashboard;
