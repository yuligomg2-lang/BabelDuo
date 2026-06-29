import React, { useState, useEffect } from 'react';
import { Room, UserProfile } from '../types';
import { api } from '../services/apiService';
import { Hash, Plus, Key, Search, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomListProps {
  user: UserProfile;
  onSelectRoom: (room: Room) => void;
  selectedRoomId?: string;
}

export const RoomList: React.FC<RoomListProps> = ({ user, onSelectRoom, selectedRoomId }) => {
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
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {/* Compact Roster Header: Search and quick action icons on a single row */}
      <div className="p-3 bg-white border-b border-gray-155/35 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Buscar salas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f0f2f5] border-none rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#0a3d70]/30 transition-all text-gray-800 placeholder-gray-400 font-medium"
          />
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setIsJoinModalOpen(true)}
            title="Ingresar código de invitación"
            className="p-1.5 text-gray-500 hover:text-[#ff6000] hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
          >
            <Key className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            title="Crear nueva sala"
            className="p-1.5 bg-[#0a3d70] text-white rounded-lg hover:bg-[#082a4d] transition-colors active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Roster Rooms List (Full-Bleed layout like WhatsApp chats) */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5] bg-white custom-scrollbar">
        {filteredRooms.map(room => {
          const roomId = room.id || (room as any)._id;
          const isActive = roomId === selectedRoomId;
          const initials = room.name ? room.name.slice(0, 2).toUpperCase() : 'BD';
          
          return (
            <button
              key={roomId}
              onClick={() => onSelectRoom(room)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer group border-l-3 ${
                isActive 
                  ? 'bg-[#005c53] hover:bg-[#004e46] border-[#005c53]' 
                  : 'hover:bg-[#f5f6f6] focus:bg-[#f0f2f5] border-transparent focus:border-l-[#0a3d70]'
              }`}
            >
              {/* WhatsApp-style round group icon */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                isActive 
                  ? 'bg-white text-[#005c53] border-white/10' 
                  : 'bg-gradient-to-br from-[#0a3d70]/10 to-[#ff6000]/10 text-[#0a3d70] border-gray-100/50'
              }`}>
                {initials}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold truncate leading-tight transition-colors ${
                    isActive ? 'text-white' : 'text-gray-800 group-hover:text-[#0a3d70]'
                  }`}>
                    {room.name}
                  </p>
                  <span className={`text-[10px] font-medium whitespace-nowrap ml-1 shrink-0 px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-[#004d45] text-teal-100' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {room.theme || 'General'}
                  </span>
                </div>
                <p className={`text-xs truncate mt-1 ${
                  isActive ? 'text-[#c4eae6]' : 'text-gray-400'
                }`}>
                  Código de sala: <span className={`font-mono font-medium tracking-tight ${isActive ? 'text-white/90' : 'text-[#0a3d70]/75'}`}>{roomId || '---'}</span>
                </p>
              </div>
            </button>
          );
        })}
        
        {filteredRooms.length === 0 && !loading && (
          <div className="text-center py-16 px-4 bg-gray-50/50">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-gray-400">No se encontraron salas</p>
          </div>
        )}
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
