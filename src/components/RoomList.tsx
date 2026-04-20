import React, { useState, useEffect } from 'react';
import { Room, UserProfile } from '../types';
import { api } from '../services/apiService';
import { Hash, Plus, Key, Search, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomListProps {
  user: UserProfile;
  onSelectRoom: (room: Room) => void;
}

export const RoomList: React.FC<RoomListProps> = ({ user, onSelectRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', theme: '' });

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await api.getRooms(user.uid);
      setRooms(data);
    } catch (err) {
      setError('Error al cargar salas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user.uid]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;

    try {
      setLoading(true);
      const createdRoom = await api.createRoom({
        name: newRoom.name,
        theme: newRoom.theme || 'General',
        members: [user.uid],
        createdBy: user.uid
      });
      setRooms(prev => [createdRoom, ...prev]);
      setIsModalOpen(false);
      setNewRoom({ name: '', theme: '' });
      onSelectRoom(createdRoom);
    } catch (err) {
      alert('Error al crear la sala');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setLoading(true);
      const room = await api.joinRoom(joinCode, user.uid);
      setRooms(prev => {
        if (prev.find(r => (r.id || (r as any)._id) === (room.id || (room as any)._id))) return prev;
        return [room, ...prev];
      });
      setIsJoinModalOpen(false);
      setJoinCode('');
      onSelectRoom(room);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al unirse a la sala');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = Array.isArray(rooms) ? rooms.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.theme?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Mis Salas</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              title="Ingresar código"
              className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
            >
              <Key className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              title="Crear sala"
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar salas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="space-y-3">
          {filteredRooms.map(room => (
            <button
              key={room.id || (room as any)._id}
              onClick={() => onSelectRoom(room)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl text-left hover:bg-gray-50 transition-all group"
            >
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white">
                <Hash className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{room.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{room.theme}</p>
              </div>
            </button>
          ))}
          
          {filteredRooms.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400 text-sm">No se encontraron salas</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleJoinRoom} className="p-8">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                  <Key className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Unirse a una Sala</h3>
                <p className="text-gray-500 text-sm mb-6">Introduce el código de invitación que te compartieron.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Código de Invitación</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      placeholder="Ej: AB12CD"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-center text-2xl font-black tracking-widest focus:ring-2 focus:ring-amber-500 transition-all uppercase"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="flex-1 px-6 py-4 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !joinCode.trim()}
                    className="flex-[2] bg-amber-600 text-white rounded-2xl px-6 py-4 text-sm font-bold shadow-lg shadow-amber-100 hover:bg-amber-700 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {loading ? 'Buscando...' : 'Unirse ahora'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleCreateRoom} className="p-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Nueva Sala</h3>
                <p className="text-gray-500 text-sm mb-6">Crea un espacio para chatear y traducir en tiempo real.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Nombre de la sala</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      placeholder="Ej: Desarrollo Web"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newRoom.name}
                      onChange={e => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Tema o Propósito</label>
                    <input 
                      type="text"
                      placeholder="Ej: Feedback de UI/UX"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newRoom.theme}
                      onChange={e => setNewRoom(prev => ({ ...prev, theme: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !newRoom.name.trim()}
                    className="flex-[2] bg-indigo-600 text-white rounded-2xl px-6 py-4 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {loading ? 'Creando...' : 'Crear Sala'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
