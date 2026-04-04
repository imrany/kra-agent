import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Bot, ArrowRight } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-surface selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-surface-container-high">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <img src="https://flagcdn.com/w40/ke.png" alt="Kenya" className="w-6 h-4 object-cover rounded-sm" />
            </div>
            <span className="text-xl font-serif font-bold text-on-surface">KRA Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/register" className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-on-surface mb-6 tracking-tight">
              Automate your <span className="text-primary italic">KRA Tasks</span> <br /> with AI precision.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
              The first intelligent automation agent for the iTax portal. File returns, check compliance, and manage your taxes without the headache.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-full text-lg font-bold shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                Start Automating <ArrowRight size={20} />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white border border-surface-container-high text-on-surface rounded-full text-lg font-bold hover:bg-surface-container-low transition-all">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* Hero Image / UI Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full -z-10" />
            <div className="bg-white rounded-3xl border border-surface-container-high shadow-2xl overflow-hidden max-w-5xl mx-auto">
              <img 
                src="https://picsum.photos/seed/kra-ui/1200/800" 
                alt="App Preview" 
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Instant Nil Returns", desc: "File your Nil returns in under 60 seconds with our automated crawler." },
              { icon: ShieldCheck, title: "Compliance Monitoring", desc: "Stay ahead of penalties with real-time compliance checks and alerts." },
              { icon: Bot, title: "AI Tax Assistant", desc: "Ask any tax-related question and get instant, accurate answers based on KRA guidelines." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white rounded-3xl border border-surface-container-high shadow-sm"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-3">{feature.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-surface-container-high">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <img src="https://flagcdn.com/w40/ke.png" alt="Kenya" className="w-5 h-3 object-cover rounded-sm" />
            </div>
            <span className="font-serif font-bold text-on-surface">KRA Agent</span>
          </div>
          <p className="text-sm text-on-surface-variant">© 2024 KRA AI Agent. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
