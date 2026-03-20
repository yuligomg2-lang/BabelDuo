import React, { useState, useEffect } from 'react';
import { addErrorListener, FirestoreErrorInfo } from '../firebase';
import { AlertCircle, X, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DiagnosticPanel: React.FC = () => {
  const [errors, setErrors] = useState<FirestoreErrorInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    const unsubscribe = addErrorListener((error) => {
      setErrors(prev => [error, ...prev].slice(0, 10)); // Keep last 10 errors
      setIsOpen(true);
      setIsMinimized(false);
    });

    // Expose global function to open panel manually
    (window as any).openDiagnostics = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    return () => {
      unsubscribe();
      delete (window as any).openDiagnostics;
    };
  }, []);

  if (errors.length === 0 && !isOpen) return null;

  return (
    <div className="fixed top-20 md:top-auto md:bottom-4 right-4 z-[100] max-w-sm w-full">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col"
            style={{ backgroundColor: '#111827', color: '#ffffff', opacity: 1 }}
          >
            {/* Header */}
            <div className="p-3 bg-gray-800 flex items-center justify-between border-b border-gray-700" style={{ backgroundColor: '#1f2937' }}>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Panel de Diagnóstico</span>
                <span className="bg-red-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {errors.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-red-500 rounded transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <div className="max-h-80 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {errors.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4 italic">
                    No se han detectado errores en esta sesión.
                  </p>
                ) : (
                  errors.map((err, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-300 uppercase mb-1">
                            Error en {err.operationType}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono break-all bg-black/30 p-1.5 rounded">
                            {err.path}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed mb-2" style={{ color: '#d1d5db' }}>
                        {err.error}
                      </p>
                      <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-700/50 pt-2">
                        <span>UID: {err.authInfo.userId?.slice(0, 8)}...</span>
                        <span>Anon: {err.authInfo.isAnonymous ? 'Sí' : 'No'}</span>
                      </div>
                    </div>
                  ))
                )}
                <button 
                  onClick={() => setErrors([])}
                  className="w-full py-2 text-[10px] text-gray-500 hover:text-white transition-colors uppercase font-bold tracking-widest"
                >
                  Limpiar historial
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button when closed but has errors */}
      {!isOpen && errors.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-all flex items-center justify-center"
        >
          <AlertCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-red-600">
            {errors.length}
          </span>
        </motion.button>
      )}
    </div>
  );
};
