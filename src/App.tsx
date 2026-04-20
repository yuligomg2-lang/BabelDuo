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
    // Check for cached user in localStorage to avoid initial login screen flash
    const cachedUser = localStorage.getItem('babel_duo_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && typeof parsed === 'object' && parsed.uid) {
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

  const handleBack = React.useCallback(() => setSelectedRoom(null), []);

  if (loading && !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium animate-pulse">Conectando a los servicios...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-[100dvh] w-full bg-white flex flex-col md:flex-row overflow-hidden">
        {/* Connection Warning Overlay */}
        {user === null && !loading && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-bottom-5">
            <h4 className="font-bold mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Error de Base de Datos
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              No se pudo conectar con MongoDB. Por favor, asegúrate de que la IP de este servidor esté en la lista blanca de Atlas (Whitelist 0.0.0.0/0).
            </p>
          </div>
        )}
        {user && (
          <div className="hidden md:flex w-20 bg-white border-r flex-col items-center py-8 gap-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Globe className="text-white w-6 h-6" />
            </div>
            <nav className="flex flex-col gap-6">
              <button className="p-3 text-indigo-600 bg-indigo-50 rounded-xl"><MessageSquare className="w-6 h-6" /></button>
              <button className="p-3 text-gray-400 hover:text-indigo-600"><Users className="w-6 h-6" /></button>
              <button className="p-3 text-gray-400 hover:text-indigo-600"><Settings className="w-6 h-6" /></button>
            </nav>
          </div>
        )}

        <main className="flex-1 flex flex-col h-full bg-white relative">
          {!user ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
              <Auth user={user} onUserUpdate={setUser} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row h-full">
              <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] border-r flex-col`}>
                <div className="p-3 border-b"><Auth user={user} onUserUpdate={setUser} /></div>
                <RoomList user={user} onSelectRoom={setSelectedRoom} />
              </div>

              <div className={`${!selectedRoom ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full`}>
                {selectedRoom ? (
                  <ChatRoom room={selectedRoom} user={user} onBack={handleBack} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
                    <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
                    <h2 className="text-xl font-bold">Selecciona una sala para comenzar</h2>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
