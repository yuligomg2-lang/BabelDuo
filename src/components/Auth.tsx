import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInAnonymously, signOut, db, doc, setDoc, getDoc, handleFirestoreError, OperationType, serverTimestamp } from '../firebase';
import { UserProfile, LANGUAGES } from '../types';
import { Globe, LogIn, LogOut, User as UserIcon } from 'lucide-react';

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

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("La conexión está tardando demasiado. Por favor, intenta de nuevo.");
    }, 15000);
    
    let path = 'users';
    try {
      const result = await signInWithPopup(auth, googleProvider);
      path = `users/${result.user.uid}`;
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (userDoc.exists()) {
        onUserUpdate(userDoc.data() as UserProfile);
      } else {
        const newUser: UserProfile = {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Usuario',
          photoURL: result.user.photoURL || undefined,
          language: 'es',
          interests: [],
          isGuest: false,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
        onUserUpdate(newUser);
        setShowSettings(true);
      }
      localStorage.removeItem('babel_duo_guest');
    } catch (err: any) {
      console.error("Sign in error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Cerraste la ventana de Google antes de terminar. Intenta de nuevo.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("Este dominio no está autorizado en tu consola de Firebase. Ve a Authentication > Settings > Authorized domains y añade: " + window.location.hostname);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("El inicio de sesión con Google no está habilitado en tu consola de Firebase. Actívalo en Authentication > Sign-in method.");
      } else if (err.code === 'auth/admin-restricted-operation') {
        setError("Operación restringida por el administrador. Verifica en la Consola de Firebase: 1. Que el 'Public-facing name' esté configurado en Project Settings. 2. Que el método Google esté habilitado.");
      } else {
        setError(`Error (${err.code || 'desconocido'}): ${err.message || 'No se pudo iniciar sesión'}`);
      }
      
      if (err.code !== 'auth/popup-closed-by-user') {
        try {
          handleFirestoreError(err, OperationType.WRITE, path);
        } catch (e) {
          console.warn("Firestore error logged but caught locally");
        }
      }
    } finally {
      setLoading(false);
      clearTimeout(timeout);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("La conexión está tardando demasiado. Por favor, intenta de nuevo.");
    }, 15000);

    try {
      const result = await signInAnonymously(auth);
      const guestUser: UserProfile = {
        uid: result.user.uid,
        displayName: `Invitado_${result.user.uid.slice(0, 4)}`,
        language: 'es',
        interests: [],
        isGuest: true,
        createdAt: serverTimestamp()
      };
      
      const path = `users/${result.user.uid}`;
      try {
        await setDoc(doc(db, 'users', result.user.uid), guestUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      
      onUserUpdate(guestUser);
    } catch (err: any) {
      console.error('Error signing in anonymously:', err);
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        setError("El acceso para invitados (Anónimo) está restringido. En tu consola de Firebase: 1. Ve a Authentication > Sign-in method y activa 'Anonymous'. 2. Si no te deja guardar, ve a Project Settings y asegúrate de que el 'Public-facing name' esté configurado.");
      } else {
        setError(`Error (${err.code}): ${err.message}`);
      }
    } finally {
      setLoading(false);
      clearTimeout(timeout);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setLoading(true);
    const path = `users/${user.uid}`;
    try {
      const updatedUser: UserProfile = {
        ...user,
        language,
        interests: interests.split(',').map(i => i.trim()).filter(i => i !== '')
      };
      
      // Save to Firestore for both real and anonymous users to ensure rules pass
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      
      onUserUpdate(updatedUser);
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onUserUpdate(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
          <Globe className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Babel Dúo</h1>
        <p className="text-gray-500 mb-8 max-w-xs">
          Comunícate sin barreras. Traducción en tiempo real para tus conversaciones.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
            <p className="mb-2">{error}</p>
            <button 
              onClick={() => (window as any).openDiagnostics?.()}
              className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
            >
              Ver detalles técnicos
            </button>
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-3 bg-white border border-gray-200 px-6 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all font-medium text-gray-700 disabled:opacity-50 w-full max-w-xs"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn className="w-5 h-5 text-indigo-600" />
          )}
          Continuar con Google
        </button>

        <button
          onClick={handleGuestSignIn}
          className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          style={{ color: '#4f46e5' }}
        >
          Entrar como invitado
        </button>

        {auth.currentUser && (
          <button
            onClick={handleSignOut}
            className="mt-8 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            style={{ color: '#9ca3af' }}
          >
            Cerrar sesión actual y reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <img
          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
          alt={user.displayName}
          className="w-10 h-10 rounded-xl object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName}</p>
            {user.isGuest && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold uppercase rounded-md">
                Invitado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            {LANGUAGES.find(l => l.code === user.language)?.name}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <UserIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleSignOut}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute top-full right-0 mt-4 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Configuración</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Idioma Principal
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Intereses (separados por comas)
              </label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Tecnología, Viajes, Música..."
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
