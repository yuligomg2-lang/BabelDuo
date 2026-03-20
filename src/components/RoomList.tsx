import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, addDoc, setDoc, serverTimestamp, handleFirestoreError, OperationType, where, getDocs, limit, updateDoc, doc, arrayUnion } from '../firebase';
import { Room, UserProfile, LANGUAGES } from '../types';
import { Hash, Plus, Sparkles, MessageSquare, Search, Link as LinkIcon, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomListProps {
  user: UserProfile;
  onSelectRoom: (room: Room) => void;
}

export const RoomList: React.FC<RoomListProps> = ({ user, onSelectRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', theme: '', languages: [user.language] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user.uid) return;
    
    // Simplified query to avoid composite index requirement
    const q = query(
      collection(db, 'rooms'), 
      where('members', 'array-contains', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      // Sort in memory instead of Firestore to avoid index issues
      const sortedRooms = roomsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setRooms(sortedRooms);
    }, (err) => {
      console.error("RoomList snapshot error:", err);
      setError("Error al cargar las salas. Por favor, intenta de nuevo.");
    });
    return () => unsubscribe();
  }, [user.uid]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.isGuest) {
      setError("Los invitados no pueden crear salas. Por favor, inicia sesión con Google.");
      return;
    }
    if (!newRoom.name || !newRoom.theme) return;
    setLoading(true);
    setError(null);
    
    const roomId = doc(collection(db, 'rooms')).id;
    const path = `rooms/${roomId}`;
    
    try {
      // Add a timeout to the creation process
      const createPromise = setDoc(doc(db, 'rooms', roomId), {
        id: roomId,
        name: newRoom.name,
        theme: newRoom.theme,
        languages: newRoom.languages,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        isPrivate: true,
        inviteCode: generateInviteCode(),
        members: [user.uid]
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("La creación de la sala tardó demasiado. Revisa tu conexión.")), 10000)
      );

      await Promise.race([createPromise, timeoutPromise]);
      
      setShowCreate(false);
      setNewRoom({ name: '', theme: '', languages: [user.language] });
    } catch (err: any) {
      console.error("Create room error:", err);
      setError(err.message || "No se pudo crear la sala. Verifica tu conexión o permisos.");
      
      // We catch the error from handleFirestoreError to prevent the ErrorBoundary from catching it
      // and reloading the whole app, which is what the user described as "vuelve a este chat"
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (e) {
        console.warn("Firestore error logged but caught locally to prevent app crash");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    setLoading(true);
    setError(null);
    const path = 'rooms';
    try {
      const q = query(collection(db, 'rooms'), where('inviteCode', '==', inviteCode.toUpperCase()), limit(1));
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("La búsqueda de la sala tardó demasiado. Revisa tu conexión.")), 10000)
      );

      const snapshot = await Promise.race([getDocs(q), timeoutPromise]) as any;
      
      if (snapshot.empty) {
        setError('Código de invitación no válido');
        setLoading(false);
        return;
      }

      const roomDoc = snapshot.docs[0];
      const roomData = roomDoc.data() as Room;

      if (!roomData.members.includes(user.uid)) {
        try {
          await updateDoc(doc(db, 'rooms', roomDoc.id), {
            members: arrayUnion(user.uid)
          });
        } catch (updateErr) {
          handleFirestoreError(updateErr, OperationType.UPDATE, `rooms/${roomDoc.id}`);
        }
      }

      onSelectRoom({ id: roomDoc.id, ...roomData });
      setShowJoin(false);
      setInviteCode('');
    } catch (err: any) {
      console.error("Join room error:", err);
      setError(err.message || "No se pudo unir a la sala. Intenta de nuevo.");
      
      // If it's already a FirestoreErrorInfo (from the inner catch), don't wrap it again
      if (!err.message.includes('operationType')) {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (e) {
          console.warn("Firestore error logged but caught locally to prevent app crash");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.theme.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Mis Conversaciones</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoin(true)}
              className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
              title="Unirse con código"
            >
              <Key className="w-5 h-5" />
            </button>
            {!user.isGuest && (
              <button
                onClick={() => setShowCreate(true)}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                title="Crear nueva sala"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en mis salas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chats Activos</h3>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 animate-in fade-in slide-in-from-top-1">
            <p className="mb-1">{error}</p>
            <button 
              onClick={() => (window as any).openDiagnostics?.()}
              className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
            >
              Ver detalles técnicos
            </button>
          </div>
        )}
        
        <div className="grid gap-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-sm text-gray-500 mb-2">No tienes chats activos</p>
              <p className="text-xs text-gray-400">Crea una sala o únete con un código</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl text-left hover:bg-gray-50 transition-all group"
              >
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                  <Hash className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{room.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 truncate">{room.theme}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Nueva Sala Privada</h3>
              <form onSubmit={handleCreateRoom} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre de la sala</label>
                  <input
                    type="text"
                    required
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Chat Familiar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</label>
                  <input
                    type="text"
                    required
                    value={newRoom.theme}
                    onChange={(e) => setNewRoom({ ...newRoom, theme: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Conversaciones privadas"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Sala'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showJoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Unirse a Sala</h3>
              <form onSubmit={handleJoinRoom} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Código de Invitación</label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 uppercase font-mono tracking-widest"
                    placeholder="ABCDEF"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJoin(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {loading ? 'Uniéndose...' : 'Unirse'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
