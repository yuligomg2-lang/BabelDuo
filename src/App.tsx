import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, auth, db, doc, getDoc, getDocFromServer, handleFirestoreError, OperationType, signOut, updateDoc, arrayUnion, collection, query, where, getDocs, limit, setDoc, serverTimestamp } from './firebase';
import { UserProfile, Room } from './types';
import { Auth } from './components/Auth';
import { RoomList } from './components/RoomList';
import { ChatRoom } from './components/ChatRoom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Globe, MessageSquare, Users, Settings, Terminal } from 'lucide-react';
import { DiagnosticPanel } from './components/DiagnosticPanel';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Iniciando...');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingStatus('Verificando sesión...');
    
    // Safety timeout to ensure loading screen eventually clears
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth initialization safety timeout reached");
        setLoadingStatus('La conexión está tardando demasiado. Mostrando pantalla de inicio...');
        setLoading(false);
      }
    }, 12000);

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
        // Use getDocFromServer to bypass cache if it's stuck or if we're in a weird state
        // Add a local timeout for this specific call
        const userDocPromise = getDocFromServer(doc(db, 'users', firebaseUser.uid));
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout al cargar perfil")), 8000)
        );

        const userDoc = await Promise.race([userDocPromise, timeoutPromise]) as any;

        if (isMounted) {
          if (userDoc.exists()) {
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
      if (inviteCode) {
        try {
          const q = query(collection(db, 'rooms'), where('inviteCode', '==', inviteCode.toUpperCase()), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const roomDoc = snapshot.docs[0];
            const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
            if (!roomData.members.includes(user.uid)) {
              await updateDoc(doc(db, 'rooms', roomDoc.id), {
                members: arrayUnion(user.uid)
              });
            }
            setSelectedRoom(roomData);
            // Clear URL param without reload
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error("Auto-join error:", error);
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
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        {/* Sidebar / Navigation (Desktop) */}
        <div className="hidden md:flex w-20 bg-white border-r border-gray-100 flex-col items-center py-8 gap-8 z-20">
          <div 
            className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100"
            style={{ backgroundColor: '#4f46e5' }}
          >
            <Globe className="text-white w-6 h-6" />
          </div>
          <nav className="flex flex-col gap-6">
            <button className="p-3 text-indigo-600 bg-indigo-50 rounded-xl transition-colors">
              <MessageSquare className="w-6 h-6" />
            </button>
            <button className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
              <Users className="w-6 h-6" />
            </button>
            <button className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
              <Settings className="w-6 h-6" />
            </button>
            <div className="mt-auto mb-4">
              <button 
                onClick={() => {
                  // We can trigger a fake error or just rely on the panel being there
                  // Let's just make sure the panel can be opened. 
                  // I'll add a global function to open it.
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

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-[100dvh] md:h-screen overflow-hidden relative">
          {!user ? (
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <Auth user={user} onUserUpdate={setUser} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
              {/* Sidebar List */}
              <div className={`w-full md:w-96 bg-white border-r border-gray-100 flex flex-col min-h-0 ${selectedRoom ? 'hidden md:flex' : 'flex-1 md:flex'}`}>
                <div className="flex-shrink-0 p-4 border-b border-gray-50">
                  <Auth user={user} onUserUpdate={setUser} />
                </div>
                <div className="flex-1 overflow-hidden min-h-0">
                  <RoomList user={user} onSelectRoom={setSelectedRoom} />
                </div>
              </div>

              {/* Chat Area */}
              <div className={`flex-1 flex flex-col min-h-0 relative ${!selectedRoom ? 'hidden md:flex' : 'flex h-full'}`}>
                {selectedRoom ? (
                  <ChatRoom 
                    room={selectedRoom} 
                    user={user} 
                    onBack={() => setSelectedRoom(null)} 
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
                    <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                      <MessageSquare className="w-10 h-10 text-gray-200" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Selecciona una sala</h2>
                    <p className="text-gray-400 text-sm max-w-xs">
                      Elige una sala de la lista o crea una nueva para empezar a chatear con traducción automática.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <DiagnosticPanel />

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
