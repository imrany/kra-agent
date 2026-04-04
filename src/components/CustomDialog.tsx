import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, HelpCircle } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'alert' | 'confirm';
  onConfirm: () => void;
  onCancel?: () => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'alert',
  onConfirm,
  onCancel
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-surface-container-high w-full max-w-md pointer-events-auto overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'alert' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-600'}`}>
                    {type === 'alert' ? <AlertCircle size={20} /> : <HelpCircle size={20} />}
                  </div>
                  <h3 className="text-lg font-serif font-bold text-on-surface">{title}</h3>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {message}
                </p>
              </div>
              <div className="p-4 bg-surface-container-low flex justify-end gap-2 border-t border-surface-container-high">
                {type === 'confirm' && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={onConfirm}
                  className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  {type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomDialog;
