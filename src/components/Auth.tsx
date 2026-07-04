import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from '../firebase';
import { api } from '../services/apiService';
import { UserProfile, LANGUAGES } from '../types';
import { 
  Globe, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Mail, 
  Lock, 
  UserPlus, 
  ArrowLeft, 
  ArrowRight,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  user: UserProfile | null;
  onUserUpdate: (user: UserProfile | null) => void;
}

// Crisp, high-fidelity vector representation of the custom Babel Duo logo
export const BabelDuoLogo: React.FC<{ className?: string }> = ({ className = "w-44 h-32" }) => {
  return (
    <svg 
      viewBox="0 0 500 320" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Babel Duo Logo"
    >
      <defs>
        {/* Clip paths to achieve the split-color globe down the exact center line (X=250) */}
        <clipPath id="left-clip">
          <rect x="0" y="0" width="250" height="320" />
        </clipPath>
        <clipPath id="right-clip">
          <rect x="250" y="0" width="250" height="320" />
        </clipPath>
      </defs>

      {/* Left Chat Bubble (Blue) */}
      <path 
        d="M 160,78 A 96,96 0 0,0 82,232 L 57,279 C 55,283 59,287 63,285 L 107,260 A 96,96 0 1,0 160,78 Z" 
        fill="white" 
        stroke="#0a3d70" 
        strokeWidth="20" 
        strokeLinejoin="round" 
      />

      {/* Right Chat Bubble (Orange) */}
      <path 
        d="M 340,78 A 96,96 0 0,1 418,232 L 443,279 C 445,283 441,287 437,285 L 393,260 A 96,96 0 1,0 340,78 Z" 
        fill="white" 
        stroke="#ff6000" 
        strokeWidth="20" 
        strokeLinejoin="round" 
      />

      {/* Styled letter 'B' (inside Blue bubble) */}
      <path 
        d="M 124,136 C 124,128 130,122 138,122 L 158,122 C 172,122 181,130 181,142 C 181,152 174,158 163,160 C 175,162 183,170 183,184 C 183,198 172,206 158,206 L 138,206 C 130,206 124,200 124,192 Z M 144,139 L 144,155 L 155,155 C 160,155 163,152 163,147 C 163,142 160,139 155,139 Z M 144,171 L 144,189 L 157,189 C 162,189 165,185 165,180 C 165,175 162,171 157,171 Z" 
        fill="#0a3d70" 
        fillRule="evenodd" 
      />

      {/* Stylized letter 'd' (inside Orange bubble) */}
      <path 
        d="M 342,149 C 328,149 318,161 318,178 C 318,195 328,207 342,207 C 352,207 360,199 363,187 L 363,206 L 377,206 L 377,122 L 363,122 L 363,162 C 360,154 352,149 342,149 Z M 346,161 C 353,161 363,166 363,178 C 363,190 353,195 346,195 C 339,195 332,190 332,178 C 332,166 339,161 346,161 Z" 
        fill="#ff6000" 
        fillRule="evenodd" 
      />

      {/* Globe central mask to hide overlapping speech bubble outlines */}
      <circle cx="250" cy="168" r="54" fill="white" />

      {/* Left clipped portion of the globe grid (Blue) */}
      <g clipPath="url(#left-clip)" stroke="#0a3d70" strokeWidth="8" strokeLinecap="round">
        <circle cx="250" cy="168" r="54" fill="none" />
        <line x1="250" y1="114" x2="250" y2="222" />
        <line x1="196" y1="168" x2="304" y2="168" />
        <ellipse cx="250" cy="168" rx="35" ry="54" fill="none" />
        <ellipse cx="250" cy="168" rx="17" ry="54" fill="none" />
      </g>

      {/* Right clipped portion of the globe grid (Orange) */}
      <g clipPath="url(#right-clip)" stroke="#ff6000" strokeWidth="8" strokeLinecap="round">
        <circle cx="250" cy="168" r="54" fill="none" />
        <line x1="250" y1="114" x2="250" y2="222" />
        <line x1="196" y1="168" x2="304" y2="168" />
        <ellipse cx="250" cy="168" rx="35" ry="54" fill="none" />
        <ellipse cx="250" cy="168" rx="17" ry="54" fill="none" />
      </g>
    </svg>
  );
};

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

export const Auth: React.FC<AuthProps> = ({ user, onUserUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(user?.language || 'es');
  const [interests, setInterests] = useState(user?.interests?.join(', ') || '');
  
  // Custom authentication routing (default to login as requested)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
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
      const savedUser = await api.updateUser(result.user.uid, newUser);
      onUserUpdate(savedUser);
    } catch (err: any) {
      console.error("Código:", err.code);
      console.error("Mensaje:", err.message);
      console.error(err);
      setError(`${err.code}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
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
      setError(err.message || 'Error al ingresar como invitado.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      const newUser: UserProfile = {
        uid: result.user.uid,
        displayName: displayName,
        language: 'es',
        interests: [],
        isGuest: false,
      };
      const savedUser = await api.updateUser(result.user.uid, newUser);
      onUserUpdate(savedUser);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Este correo electrónico ya está registrado.");
      } else if (err.code === 'auth/weak-password') {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (err.code === 'auth/invalid-email') {
        setError("El correo electrónico no es válido.");
      } else {
        setError(err.message || "Error al registrar la cuenta.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const newUser: UserProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'Usuario',
        language: 'es',
        interests: [],
        isGuest: false,
      };
      const savedUser = await api.updateUser(result.user.uid, newUser);
      onUserUpdate(savedUser);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Correo electrónico o contraseña incorrectos.");
      } else if (err.code === 'auth/invalid-email') {
        setError("El correo electrónico no es válido.");
      } else {
        setError(err.message || "Error al iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.");
      setAuthMode('login');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError("No existe una cuenta registrada con este correo.");
      } else if (err.code === 'auth/invalid-email') {
        setError("El correo electrónico no es válido.");
      } else {
        setError(err.message || "Error al enviar el correo de recuperación.");
      }
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
    setAuthMode('login');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMessage(null);
  };

  if (!user) {
    return (
      <div className="w-full flex items-center justify-center min-h-[100dvh] md:min-h-0 py-6 px-4">
        {/* Main Double-Panel Rounded Card Layout: Always highly aesthetic 50-50 layout side-by-side */}
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-row min-h-[540px] border border-gray-100/90">
          
          {/* Left panel: Logo and Title Column (Premium Modern Dark-Navy Cosmic Gradient, 50% width) */}
          <div className="w-1/2 bg-[#071324] bg-gradient-to-br from-[#071324] via-[#0b1e38] to-[#142e54] p-4 sm:p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden border-r border-[#152a47]/30">
            {/* Dynamic modern glowing spotlights for premium depth */}
            <div className="absolute top-[-40px] left-[-40px] w-60 h-60 rounded-full bg-[#ff6000]/12 blur-[70px] pointer-events-none animate-pulse duration-[6s]" />
            <div className="absolute bottom-[-30px] right-[-30px] w-72 h-72 rounded-full bg-[#1e4f8a]/20 blur-[90px] pointer-events-none animate-pulse duration-[8s]" />
            
            {/* Custom Interactive Logo - beautifully scaled and styled */}
            <div className="relative group transition-transform duration-500 hover:scale-105">
              <div className="absolute inset-x-0 -bottom-2 bg-[#ff6000]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 h-10" />
              <BabelDuoLogo className="w-20 h-15 xs:w-24 xs:h-18 sm:w-36 sm:h-28 md:w-48 md:h-36 relative z-10 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]" />
            </div>

            <h1 className="text-xl sm:text-2.5xl md:text-4xl font-black text-white tracking-tight font-display mt-4 mb-2 sm:mt-5 drop-shadow-md">
              Babel Duo
            </h1>
            <p className="text-[#a5b9cc] text-[10px] sm:text-xs md:text-sm max-w-[280px] leading-relaxed font-semibold mt-1">
              Communicate without barriers. Real-time translation for your conversations.
            </p>
          </div>

          {/* Right panel: Authentication Forms Column (Symmetrical 50-50, elegant padding) */}
          <div className="w-1/2 bg-white p-4 sm:p-8 md:p-12 flex flex-col justify-center relative min-h-[460px]">
            <AnimatePresence mode="wait">
              {/* Login Form view */}
              {authMode === 'login' && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a3d70] tracking-tight font-display mb-1 text-left">Welcome Back</h2>
                  <p className="text-xs text-gray-400 mb-6 font-medium text-left">Sign in to your account below.</p>

                  <form onSubmit={handleEmailSignIn} className="flex flex-col w-full text-left">
                    {/* Success notification overlay */}
                    {successMessage && (
                      <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    {/* Error notification overlay */}
                    {error && (
                      <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl flex items-center gap-2 font-semibold animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="relative mb-3.5">
                      <Mail className="w-4.5 h-4.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full pl-12 pr-5 py-3 bg-white border border-gray-200/80 rounded-full text-xs sm:text-sm outline-none focus:border-[#0a3d70] focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 font-medium placeholder-gray-400 shadow-sm hover:border-gray-300"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="relative">
                      <Lock className="w-4.5 h-4.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-12 pr-5 py-3 bg-white border border-gray-200/80 rounded-full text-xs sm:text-sm outline-none focus:border-[#0a3d70] focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 font-medium placeholder-gray-400 shadow-sm hover:border-gray-300"
                        required
                        disabled={loading}
                      />
                    </div>

                    {/* Forgot password link */}
                    <div className="flex justify-end mt-2.5 mb-5">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setError(null); setSuccessMessage(null); }}
                        className="text-xs font-bold text-[#ff6000] hover:text-[#e05300] hover:underline cursor-pointer transition-colors"
                        disabled={loading}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#0a3d70] text-white font-bold rounded-full text-xs sm:text-sm hover:bg-[#082a4d] active:scale-[0.98] transition-all shadow-md shadow-[#0a3d70]/15 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? "Logging in..." : "Login"}
                    </button>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                      </div>
                      <span className="relative px-3 bg-white text-[10px] text-gray-400 font-bold uppercase tracking-wider">or</span>
                    </div>

                    {/* Google Login button */}
                    <button 
                      type="button"
                      onClick={handleGoogleSignIn} 
                      disabled={loading} 
                      className="w-full py-2.5 bg-white border border-gray-200/95 text-gray-600 rounded-full font-bold flex items-center justify-center gap-2.5 hover:bg-gray-50 active:scale-[0.98] transition-all text-xs sm:text-sm shadow-sm cursor-pointer hover:border-gray-300"
                    >
                      <GoogleIcon /> Continue with Google
                    </button>

                    {/* Guest Login button */}
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={handleGuestSignIn}
                        disabled={loading}
                        className="text-xs font-semibold text-gray-500 hover:text-[#0a3d70] hover:underline cursor-pointer transition-colors"
                      >
                        Continue as Guest
                      </button>
                    </div>

                    {/* Swap to Sign up */}
                    <div className="text-center mt-5">
                      <p className="text-xs text-gray-400 font-semibold direct-action">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => { setAuthMode('register'); setError(null); setSuccessMessage(null); }}
                          className="text-[#ff6000] font-bold hover:text-[#e05300] hover:underline transition-all cursor-pointer"
                          disabled={loading}
                        >
                          Create an account
                        </button>
                      </p>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Registration Form view */}
              {authMode === 'register' && (
                <motion.div
                  key="register-form"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a3d70] tracking-tight font-display mb-1 text-left">Create Account</h2>
                  <p className="text-xs text-gray-400 mb-6 font-medium text-left">Join Babel Duo to bridge languages seamlessly.</p>

                  <form onSubmit={handleEmailSignUp} className="flex flex-col w-full text-left">
                    {error && (
                      <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="relative mb-3.5">
                      <UserIcon className="w-4.5 h-4.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name or username"
                        className="w-full pl-12 pr-5 py-3 bg-white border border-gray-200/90 rounded-full text-xs sm:text-sm outline-none focus:border-[#0a3d70] focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 font-medium placeholder-gray-400 shadow-sm hover:border-gray-300"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="relative mb-3.5">
                      <Mail className="w-4.5 h-4.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full pl-12 pr-5 py-3 bg-white border border-gray-200/90 rounded-full text-xs sm:text-sm outline-none focus:border-[#0a3d70] focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 font-medium placeholder-gray-400 shadow-sm hover:border-gray-300"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="relative mb-5">
                      <Lock className="w-4.5 h-4.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-12 pr-5 py-3 bg-white border border-gray-200/90 rounded-full text-xs sm:text-sm outline-none focus:border-[#0a3d70] focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 font-medium placeholder-gray-400 shadow-sm hover:border-gray-300"
                        required
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#0a3d70] text-white font-bold rounded-full text-xs sm:text-sm hover:bg-[#082a4d] active:scale-[0.98] transition-all shadow-md shadow-[#0a3d70]/15 flex items-center justify-center gap-2"
                    >
                      {loading ? "Creating account..." : "Register"}
                    </button>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                      </div>
                      <span className="relative px-3 bg-white text-[10px] text-gray-400 font-bold uppercase tracking-wider">or</span>
                    </div>

                    {/* Google fallback on registration */}
                    <button 
                      type="button"
                      onClick={handleGoogleSignIn} 
                      disabled={loading} 
                      className="w-full py-2.5 bg-white border border-gray-200/95 text-gray-600 rounded-full font-bold flex items-center justify-center gap-2.5 hover:bg-gray-50 active:scale-[0.98] transition-all text-xs sm:text-sm shadow-sm cursor-pointer hover:border-gray-300"
                    >
                      <GoogleIcon /> Continue with Google
                    </button>

                    {/* Swap to Login */}
                    <div className="text-center mt-5">
                      <p className="text-xs text-gray-400 font-semibold animate-fade-in">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => { setAuthMode('login'); setError(null); setSuccessMessage(null); }}
                          className="text-[#ff6000] font-bold hover:text-[#e05300] hover:underline transition-all cursor-pointer"
                          disabled={loading}
                        >
                          Login
                        </button>
                      </p>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Password Recovery view */}
              {authMode === 'forgot' && (
                <motion.div
                  key="forgot-form"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a3d70] tracking-tight font-display mb-1 text-left">Recover Password</h2>
                  <p className="text-xs text-gray-400 mb-6 font-medium text-left">Enter your email below to receive reset instructions.</p>

                  <form onSubmit={handleForgotPassword} className="flex flex-col w-full text-left">
                    {error && (
                      <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="relative mb-5">
                      <Mail className="w-4.5 h-4.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full pl-12 pr-5 py-3 bg-white border border-gray-200/90 rounded-full text-xs sm:text-sm outline-none focus:border-[#0a3d70] focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 font-medium placeholder-gray-400 shadow-sm hover:border-gray-300"
                        required
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#0a3d70] text-white font-bold rounded-full text-xs sm:text-sm hover:bg-[#082a4d] active:scale-[0.98] transition-all shadow-md shadow-[#0a3d70]/15 flex items-center justify-center gap-2"
                    >
                      {loading ? "Sending..." : "Send Recovery Details"}
                    </button>

                    <div className="text-center mt-6">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setError(null); setSuccessMessage(null); }}
                        className="text-xs font-bold text-[#ff6000] hover:text-[#e05300] hover:underline transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        disabled={loading}
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    );
  }

  // Logged-in Header segment (styled coherently with the corporate identity colors)
  return (
    <div className="relative">
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200/60 shadow-sm transition-shadow hover:shadow-md">
        <img 
          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=0a3d70&color=ffffff`} 
          className="w-9 h-9 rounded-xl border border-gray-100 object-cover" 
          alt={user.displayName}
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-gray-900 truncate">{user.displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] bg-[#edf3f8] text-[#0a3d70] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              {user.language}
            </span>
            {user.isGuest && (
              <span className="text-[9px] bg-[#fff0eb] text-[#ff6000] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                Guest
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="p-1.5 text-gray-400 hover:text-[#0a3d70] transition-colors rounded-lg hover:bg-gray-50"
          aria-label="Toggle user settings"
        >
          <SettingsIcon className="w-4.5 h-4.5" />
        </button>
        <button 
          onClick={handleSignOut} 
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          aria-label="Sign out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute top-full right-0 mt-2.5 w-68 bg-white rounded-2xl shadow-xl border border-gray-200/80 p-4.5 z-50 text-left"
          >
            <h3 className="font-extrabold text-[#0a3d70] font-display text-sm mb-3">Configuración de Perfil</h3>
            
            <div className="flex flex-col gap-3.5 mb-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Idioma de preferencia</label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)} 
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:bg-white focus:outline-none focus:border-[#0a3d70] font-semibold text-gray-700"
                >
                   {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Intereses (Separados por coma)</label>
                <input 
                  type="text" 
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Tecnología, Cine, Viajes..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:border-[#0a3d70] font-semibold text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowSettings(false)} 
                className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-full text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all cursor-pointer text-center block"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveSettings} 
                disabled={loading} 
                className="flex-1 py-2 bg-[#0a3d70] text-white rounded-full text-xs font-bold hover:bg-[#082a4d] active:scale-95 transition-all cursor-pointer text-center block disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
