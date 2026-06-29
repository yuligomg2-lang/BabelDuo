import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, auth, signOut } from './firebase';
import { UserProfile, Room } from './types';
import { api } from './services/apiService';
import { Auth } from './components/Auth';
import { RoomList } from './components/RoomList';
import { ChatRoom } from './components/ChatRoom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Globe, MessageSquare, Users, Settings, Terminal, Code } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // Persistence: Room selection
  useEffect(() => {
    if (selectedRoom) {
      const id = selectedRoom.id || (selectedRoom as any)._id;
      if (id) {
        localStorage.setItem('babel_duo_room_id', id);
        console.log("Room persisted:", id);
      }
    }
  }, [selectedRoom]);

  useEffect(() => {
    // Global Audio Unlock for mobile browsers
    const unlockAudio = () => {
      const audio = new Audio();
      audio.play().catch(() => {});
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      console.log("Audio system unlocked");
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Initial user restoration
    const cachedUser = localStorage.getItem('babel_duo_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && typeof parsed === 'object' && parsed.uid) {
          
          // CHECK EXPIRY FOR GUESTS
          if (parsed.isGuest && parsed.createdAt) {
            const age = Date.now() - new Date(parsed.createdAt).getTime();
            if (age > 24 * 60 * 60 * 1000) {
              console.log("Cached guest expired, clearing...");
              localStorage.removeItem('babel_duo_user');
              localStorage.removeItem('babel_duo_room_id');
              signOut(auth);
              return;
            }
          }

          setUser(parsed);
          
          // Try restoring room immediately if we have cached user
          const lastRoomId = localStorage.getItem('babel_duo_room_id');
          if (lastRoomId) {
            api.getRooms(parsed.uid).then(rooms => {
              const found = rooms.find(r => (r.id || (r as any)._id) === lastRoomId);
              if (found) {
                setSelectedRoom(found);
                console.log("Restored room from cache for user:", parsed.uid);
              }
            }).catch(console.error);
          }
        }
      } catch (e) {
        localStorage.removeItem('babel_duo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setSelectedRoom(null);
        localStorage.removeItem('babel_duo_user');
        localStorage.removeItem('babel_duo_room_id');
        setLoading(false);
        return;
      }

      try {
        // Sync with MongoDB backend
        const savedUser = await api.updateUser(firebaseUser.uid, {
           uid: firebaseUser.uid,
           displayName: firebaseUser.displayName || 'Usuario',
           photoURL: firebaseUser.photoURL || undefined,
           isGuest: firebaseUser.isAnonymous
        });
        
        // Final check on saved user in case backend says it's new but fireauth had it old
        if (savedUser.isGuest && savedUser.createdAt) {
          const age = Date.now() - new Date(savedUser.createdAt).getTime();
          if (age > 24 * 60 * 60 * 1000) {
            console.warn("Guest session expired on sync");
            signOut(auth);
            return;
          }
        }

        setUser(savedUser);
        localStorage.setItem('babel_duo_user', JSON.stringify(savedUser));

        // Restore room if not already restored by local cache logic
        const lastRoomId = localStorage.getItem('babel_duo_room_id');
        if (lastRoomId && !selectedRoom) {
          try {
            const rooms = await api.getRooms(firebaseUser.uid);
            const found = rooms.find(r => (r.id || (r as any)._id) === lastRoomId);
            if (found) setSelectedRoom(found);
          } catch (e) {
            console.error("Error restoring room in auth change:", e);
          }
        }
      } catch (error) {
        console.error("Backend sync error:", error);
        // Keep firebase basic info to prevent sudden logout
        if (!user) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Usuario',
            photoURL: firebaseUser.photoURL || undefined,
            language: 'es',
            interests: [],
            isGuest: firebaseUser.isAnonymous
          });
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Unauthorized API call detected, signing out...");
      signOut(auth);
      alert("Tu sesión de invitado ha expirado (límite de 24 horas).");
    };

    window.addEventListener('unauthorized-api-call', handleUnauthorized);
    return () => window.removeEventListener('unauthorized-api-call', handleUnauthorized);
  }, []);

  const handleBack = React.useCallback(() => setSelectedRoom(null), []);

  if (loading && !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-16 h-16 border-4 border-[#0a3d70] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium animate-pulse">Conectando a los servicios...</p>
      </div>
    );
  }

  // Not logged in view: clean full screen layout
  if (!user) {
    return (
      <ErrorBoundary>
        <div className="min-h-[100dvh] w-full bg-[#f8f9fa] flex items-center justify-center p-4 overflow-y-auto">
          <Auth user={user} onUserUpdate={setUser} />
        </div>
      </ErrorBoundary>
    );
  }

  // Logged in view: gorgeous WhatsApp Web desktop frame layout
  return (
    <ErrorBoundary>
      <div className="h-[100dvh] w-full bg-[#f0f2f5] md:bg-[#d1d7db] flex items-center justify-center overflow-hidden fixed inset-0 font-sans">
        {/* Header Accent Band behind the app (WhatsApp Web visual signature) using Babel Duo Navy */}
        <div className="hidden md:block absolute top-0 left-0 right-0 h-[127px] bg-[#0a3d70] z-0" />

        {/* Database Whitelist Connection Error Overlay */}
        {user === null && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-bottom-5">
            <h4 className="font-bold mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Error de Conexión
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              No se pudo sincronizar tu sesión de base de datos. Asegúrate de tener conexión estable.
            </p>
          </div>
        )}

        {/* Outer Desktop Framing Container */}
        <div className="w-full h-full md:h-[95vh] md:w-[98vw] md:max-w-[1420px] md:rounded-lg md:shadow-2xl overflow-hidden bg-white flex flex-row relative z-10 border border-gray-205/20">
          
          {/* Left column: User actions + search + Chat list (Roster) */}
          <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[380px] border-r border-gray-205/30 flex-col h-full overflow-hidden bg-white shrink-0`}>
            {/* Header: User settings and info (WhatsApp Web style dark/gray tint) */}
            <div className="p-3 bg-[#f0f2f5] border-b border-gray-205/30">
              <Auth user={user} onUserUpdate={setUser} />
            </div>
            
            {/* Contact list flow */}
            <RoomList 
              user={user} 
              onSelectRoom={setSelectedRoom} 
              selectedRoomId={selectedRoom?.id || (selectedRoom as any)?._id} 
            />
          </div>

          {/* Right column: Chat active dialog / Empty landing view */}
          <div className={`${!selectedRoom ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full overflow-hidden bg-[#efeae2]/10 relative`}>
            {selectedRoom ? (
              <ChatRoom room={selectedRoom} user={user} onBack={handleBack} onUserUpdate={setUser} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f8f9fa] relative border-l border-gray-200/30">
                {/* Decorative background watermark */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-gray-50/50 pointer-events-none" />
                
                <div className="relative p-8 max-w-md flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0a3d70]/5 to-[#ff6000]/5 flex items-center justify-center mb-6 border border-gray-100/40 shadow-inner">
                    <Globe className="w-12 h-12 text-[#0a3d70]/25 animate-pulse duration-[7s]" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-800 tracking-tight">Babel Duo para Escritorio</h2>
                  <p className="text-xs text-gray-400 leading-relaxed mt-2 max-w-sm">
                    Envía y recibe mensajes en tiempo real con traducción instantánea. Habla en tu idioma nativo y deja que la IA se encargue de la barrera idiomática.
                  </p>
                  
                  <div className="w-full h-[1px] bg-gray-100 my-8" />
                  
                  <p className="text-[10px] text-gray-400 flex items-center gap-1.5 opacity-85">
                    🛡️ Conexión segura e intérprete inteligente integrado
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </ErrorBoundary>
  );
}
