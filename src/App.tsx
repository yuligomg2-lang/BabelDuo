import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, auth, db, doc, getDoc, getDocFromServer, handleFirestoreError, OperationType, signOut, updateDoc, arrayUnion, collection, query, where, getDocs, limit, setDoc, serverTimestamp } from './firebase';
import { UserProfile, Room } from './types';
import { Auth } from './components/Auth';
import { RoomList } from './components/RoomList';
import { ChatRoom } from './components/ChatRoom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Globe, MessageSquare, Users, Settings, Terminal, Code, LogOut } from 'lucide-react';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { LayoutDiagram } from './components/LayoutDiagram';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Iniciando...');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLayoutMode, setShowLayoutMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingStatus('Verificando sesión...');
    
    // Safety timeout to ensure loading screen eventually clears
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth initialization safety timeout reached");
        const isInIframe = window.self !== window.top;
        const msg = isInIframe 
          ? 'La conexión está tardando. Si el inicio de sesión no persiste, intenta abrir la app en una pestaña nueva.'
          : 'La conexión está tardando demasiado. Mostrando pantalla de inicio...';
        setLoadingStatus(msg);
        setLoading(false);
      }
    }, 15000);

    const statusTimeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoadingStatus('La conexión está tardando más de lo esperado. Si estás en modo incógnito, asegúrate de permitir las cookies de terceros.');
      }
    }, 6000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        clearTimeout(statusTimeout);
        clearTimeout(safetyTimeout);
        return;
      }

      try {
        setLoadingStatus('Cargando perfil de usuario...');
        
        // Try local cache first, then server
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        } catch (e) {
          console.warn("Cache fetch failed, trying server...", e);
          const userDocPromise = getDocFromServer(doc(db, 'users', firebaseUser.uid));
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout al conectar con el servidor")), 8000)
          );
          userDoc = await Promise.race([userDocPromise, timeoutPromise]) as any;
        }

        if (isMounted) {
          if (userDoc && userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else if (firebaseUser.isAnonymous) {
            // AUTO-RECOVERY for guests: if signed in but no doc, create it
            const guestUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: `Invitado_${firebaseUser.uid.slice(0, 4)}`,
              language: 'es',
              interests: [],
              isGuest: true,
              createdAt: serverTimestamp()
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), guestUser);
              setUser(guestUser);
            } catch (err) {
              console.error("Error creating guest doc in recovery:", err);
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (error: any) {
        console.error("Error fetching user doc:", error);
        if (isMounted) {
          setAuthError(error.message || "Error al conectar con la base de datos");
          // If we can't load the user doc, we should still let the user see the Auth screen
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(statusTimeout);
          clearTimeout(safetyTimeout);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(statusTimeout);
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Separate effect for guest check and auto-join to avoid blocking initial load
  useEffect(() => {
    if (!user) return;

    // 1. Guest expiration check (24 hours)
    const checkGuestExpiration = async () => {
      if (user.isGuest && user.createdAt) {
        try {
          const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          const now = new Date();
          const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
          
          if (diffHours > 24) {
            await signOut(auth);
            setUser(null);
          }
        } catch (e) {
          console.error("Error checking guest expiration:", e);
        }
      }
    };

    // 2. Auto-join logic if invite code is in URL
    const handleAutoJoin = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');
      if (inviteCode && inviteCode.trim()) {
        const cleanCode = inviteCode.trim().toUpperCase();
        try {
          const q = query(collection(db, 'rooms'), where('inviteCode', '==', cleanCode), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const roomDoc = snapshot.docs[0];
            const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
            
            if (!roomData.members.includes(user.uid)) {
              await updateDoc(doc(db, 'rooms', roomDoc.id), {
                members: arrayUnion(user.uid)
              });
              // Update local members list for the room object
              roomData.members.push(user.uid);
            }
            
            setSelectedRoom(roomData);
            // Clear URL param without reload
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.warn("Auto-join: Room not found for code", cleanCode);
          }
        } catch (error) {
          console.error("Auto-join error:", error);
          try {
            handleFirestoreError(error, OperationType.LIST, 'rooms (auto-join)');
          } catch (e) {
            // Error already logged to diagnostic panel
          }
        }
      }
    };

    checkGuestExpiration();
    handleAutoJoin();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Babel Dúo</h2>
            <p className="text-sm text-gray-500 animate-pulse">{loadingStatus}</p>
            {authError && (
              <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
                {authError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 mt-4 w-full">
            <button 
              onClick={() => setLoading(false)}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-gray-50 transition-all shadow-sm"
              style={{ backgroundColor: '#ffffff', color: '#4f46e5' }}
            >
              Continuar de todos modos
            </button>
            <button 
              onClick={() => signOut(auth).then(() => window.location.reload())}
              className="w-full py-3 bg-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition-all"
              style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              Cerrar sesión y reintentar
            </button>
            <button 
              onClick={() => (window as any).openDiagnostics?.()}
              className="mt-2 text-[10px] text-gray-400 hover:text-indigo-600 uppercase tracking-widest font-bold transition-colors"
            >
              Ver Diagnóstico Técnico
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden overscroll-none" style={{ height: '100dvh' }}>
        {/* Sidebar / Navigation (Desktop Only) */}
        {user && !showLayoutMode && (
          <div className="hidden md:flex w-20 bg-white border-r border-gray-200 flex-col items-center py-8 gap-8 z-30 flex-shrink-0 shadow-sm">
            <div 
              className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200"
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Globe className="text-white w-6 h-6" />
            </div>
            <nav className="flex flex-col gap-6">
              <button className="p-3 text-indigo-600 bg-indigo-50 rounded-xl transition-all hover:scale-110 active:scale-95">
                <MessageSquare className="w-6 h-6" />
              </button>
              <button className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all hover:scale-110 active:scale-95">
                <Users className="w-6 h-6" />
              </button>
              <button className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all hover:scale-110 active:scale-95">
                <Settings className="w-6 h-6" />
              </button>
              <div className="h-px w-8 bg-gray-100 my-2" />
              <button 
                onClick={() => setShowLayoutMode(!showLayoutMode)}
                className={`p-3 rounded-xl transition-all hover:scale-110 active:scale-95 ${showLayoutMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Ver Maquetación"
              >
                <Code className="w-6 h-6" />
              </button>
              <div className="mt-auto mb-4">
                <button 
                  onClick={() => {
                    (window as any).openDiagnostics?.();
                  }}
                  className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                  title="Diagnóstico"
                >
                  <Terminal className="w-6 h-6" />
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
          {showLayoutMode ? (
            <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto flex items-start justify-center z-[100]">
              <div className="relative w-full max-w-6xl my-4 md:my-8">
                <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Modo Maquetación Activo</span>
                  </div>
                  <button 
                    onClick={() => setShowLayoutMode(false)}
                    className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2 hover:bg-gray-50 z-50 border border-gray-100 transition-all hover:scale-105 active:scale-95 group"
                  >
                    <LogOut className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">Volver a la App</span>
                  </button>
                </div>
                <div className="animate-in fade-in zoom-in-95 duration-500 shadow-2xl rounded-[48px] overflow-hidden">
                  <LayoutDiagram />
                </div>
              </div>
            </div>
          ) : !user ? (
            <div className="flex-1 flex items-center justify-center overflow-y-auto p-4 bg-gray-50">
              <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <Auth user={user} onUserUpdate={setUser} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-white">
              {/* Sidebar List (Rooms) */}
              <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] lg:w-[360px] xl:w-[420px] bg-white border-r border-gray-200 flex-col min-h-0 flex-shrink-0 z-10`}>
                <div className="flex-shrink-0 p-3 border-b border-gray-100 bg-white sticky top-0 z-20">
                  <Auth user={user} onUserUpdate={setUser} />
                </div>
                <div className="flex-1 overflow-hidden min-h-0 bg-white">
                  <RoomList user={user} onSelectRoom={setSelectedRoom} />
                </div>
              </div>

              {/* Chat Area */}
              <div className={`${!selectedRoom ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col min-h-0 relative h-full bg-white z-0`}>
                {selectedRoom ? (
                  <ChatRoom 
                    room={selectedRoom} 
                    user={user} 
                    onBack={() => setSelectedRoom(null)} 
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-[30px] md:rounded-[40px] flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                      <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-gray-200" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Selecciona una sala</h2>
                    <p className="text-gray-400 text-sm max-w-xs px-4">
                      Elige una sala de la lista o crea una nueva para empezar a chatear con traducción automática.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Diagnostic Panel - Hidden on mobile */}
      <div className="hidden lg:block">
        <DiagnosticPanel />
      </div>

      <style>{`
        body {
          overscroll-behavior: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </ErrorBoundary>
  );
}
