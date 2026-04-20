import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut,
} from '../firebase';
import { api } from '../services/apiService';
import { UserProfile, LANGUAGES } from '../types';
import { Globe, LogIn, LogOut, User as UserIcon, Mail, Lock, UserPlus } from 'lucide-react';

interface AuthProps {
  user: UserProfile | null;
  onUserUpdate: (user: UserProfile | null) => void;
}

export const Auth: React.FC<AuthProps> = ({ user, onUserUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(user?.language || 'es');
  const [interests, setInterests] = useState(user?.interests?.join(', ') || '');
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const newUser: UserProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'Usuario',
        photoURL: result.user.photoURL || undefined,
        language: 'es',
        interests: [],
        isGuest: false,
      };
      // Sync with MongoDB
      const savedUser = await api.updateUser(result.user.uid, newUser);
      onUserUpdate(savedUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      const guestUser: UserProfile = {
        uid: result.user.uid,
        displayName: `Invitado_${result.user.uid.slice(0, 4)}`,
        language: 'es',
        interests: [],
        isGuest: true,
      };
      const savedUser = await api.updateUser(result.user.uid, guestUser);
      onUserUpdate(savedUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedData = {
        language,
        interests: interests.split(',').map(i => i.trim()).filter(i => i !== '')
      };
      const savedUser = await api.updateUser(user.uid, updatedData);
      onUserUpdate(savedUser);
      setShowSettings(false);
    } catch (error) {
      setError("Error al guardar cambios");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem('babel_duo_user');
    localStorage.removeItem('babel_duo_room_id');
    onUserUpdate(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <Globe className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Babel Dúo MERN</h1>
        <p className="text-gray-500 mb-8 text-sm">Traducción mágica para tus conversaciones</p>
        
        <div className="flex flex-col gap-4 w-full">
           <button onClick={handleGoogleSignIn} disabled={loading} className="p-4 bg-white border rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm">
             <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-5 h-5 opacity-0 absolute" /> {/* Just to keep some spacing if needed */}
             <LogIn className="w-5 h-5 text-indigo-600" /> Continuar con Google
           </button>
           <button onClick={handleGuestSignIn} disabled={loading} className="p-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
             Entrar como Invitado
           </button>
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-left">
          <h4 className="text-amber-800 text-xs font-bold mb-1 flex items-center gap-2">
            <Globe className="w-3 h-3" /> Tip de Persistencia
          </h4>
          <p className="text-amber-700 text-[11px] leading-relaxed">
            Si notas que se cierra la sesión al recargar, intenta <strong>abrir la app en una pestaña nueva</strong>. Las previsualizaciones integradas a veces bloquean las cookies de sesión.
          </p>
        </div>

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border">
        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-9 h-9 rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user.displayName}</p>
          <p className="text-[10px] text-gray-500 uppercase">{user.language}</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 text-gray-400 hover:text-indigo-600"><UserIcon className="w-4 h-4" /></button>
        <button onClick={handleSignOut} className="p-1.5 text-gray-400 hover:text-red-600"><LogOut className="w-4 h-4" /></button>
      </div>

      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border p-4 z-50">
          <h3 className="font-bold mb-3">Configuración</h3>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full mb-3 p-2 border rounded-xl">
             {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <button onClick={handleSaveSettings} disabled={loading} className="w-full bg-indigo-600 text-white p-2 rounded-xl">Guardar</button>
        </div>
      )}
    </div>
  );
};
