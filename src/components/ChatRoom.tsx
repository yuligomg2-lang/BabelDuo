import React, { useState, useEffect, useRef } from 'react';
import { Room, UserProfile, Message, LANGUAGES } from '../types';
import socket from '../lib/socket';
import { api } from '../services/apiService';
import { gemini } from '../services/geminiService';
import { ChevronLeft, Globe, Send, Clock, Check, CheckCheck, Mic, Square, Loader2, X, Share2, Trash2, LogOut, Sparkles, Copy, Play, Volume2, AlertCircle, Phone, Video, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatRoomProps {
  room: Room;
  user: UserProfile;
  onBack: () => void;
  onUserUpdate?: (user: UserProfile) => void;
}

const getFlag = (langCode: string) => {
  const flags: Record<string, string> = {
    en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷'
  };
  return flags[langCode] || '🏳️';
};

const COLOR_MAP = {
  rose: { hex: '#f43f5e', bg: 'bg-rose-500' },
  emerald: { hex: '#10b981', bg: 'bg-emerald-500' },
  sky: { hex: '#0ea5e9', bg: 'bg-sky-500' },
  amber: { hex: '#f59e0b', bg: 'bg-amber-500' },
  violet: { hex: '#8b5cf6', bg: 'bg-violet-500' },
};

const getUserColor = (userId: string) => {
  const keys = Object.keys(COLOR_MAP);
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  const key = keys[Math.abs(hash) % keys.length] as keyof typeof COLOR_MAP;
  return COLOR_MAP[key];
};

export const ChatRoom: React.FC<ChatRoomProps> = ({ room: initialRoom, user, onBack, onUserUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState<string | null>(null); // messageId
  const [ttsReadyMap, setTtsReadyMap] = useState<Record<string, string>>({}); // messageId -> blobUrl
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  
  // Custom right sidebar and aesthetic styling states modeled after your Canva mock
  const [themeMode, setThemeMode] = useState<'classic' | 'modern'>('classic');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedCodeFeedback, setCopiedCodeFeedback] = useState(false);
  const [isUpdatingLang, setIsUpdatingLang] = useState(false);

  const handleUpdateUserLanguage = async (newCode: string) => {
    if (isUpdatingLang) return;
    setIsUpdatingLang(true);
    try {
      const updated = await api.updateUser(user.uid, { ...user, language: newCode });
      if (onUserUpdate) {
        onUserUpdate(updated);
      }
    } catch (err) {
      console.error("Failed to update user language:", err);
    } finally {
      setIsUpdatingLang(false);
    }
  };
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Audio Unlocker for browser policies
    const unlockAudio = () => {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFWm51bQAAAAADAAEAQO8AAEAfAABAAgAAAgAAAA==';
      audio.play().then(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }).catch(() => {});
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const roomId = initialRoom.id || (initialRoom as any)._id;
  const isOwner = initialRoom.createdBy === user.uid;

  useEffect(() => {
    const isInIframe = window.self !== window.top;
    console.log("Mic system initialized. Context:", isInIframe ? "Iframe" : "Main Tab");
    
    if (navigator.permissions && (navigator.permissions as any).query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((permissionStatus) => {
          setMicStatus(permissionStatus.state as any);
          console.log("Mic status initial state:", permissionStatus.state);
          permissionStatus.onchange = () => {
            console.log("Mic status changed to:", permissionStatus.state);
            setMicStatus(permissionStatus.state as any);
          };
        })
        .catch((e) => {
          console.warn("navigator.permissions.query failed:", e);
          // Don't set to denied automatically, let's keep it unknown
          setMicStatus('unknown');
        });
    }
  }, []);

  const requestMicPermissionManually = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicStatus('granted');
      alert("✅ Micrófono activado con éxito.");
    } catch (err: any) {
      console.error("Manual permission request failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('denied');
        alert("❌ El permiso fue denegado. Por favor, actívalo en los ajustes de tu navegador.");
      } else {
        alert("❌ No se pudo activar el micrófono: " + err.message);
      }
    }
  };

  useEffect(() => {
    if (!roomId) return;

    // Load initial messages
    api.getMessages(roomId).then(msgs => {
      // Robust deduplication even on load
      setMessages(prev => {
        const combined = [...prev, ...msgs];
        const unique = combined.filter((msg, index, self) => 
          index === self.findIndex((m) => (m.id || (m as any)._id) === (msg.id || (msg as any)._id))
        );
        return unique;
      });
    }).catch(console.error);

    // Socket listeners
    socket.emit('join-room', roomId);

    socket.on('new-message', (msg: Message) => {
      setMessages(prev => {
        const msgId = msg.id || (msg as any)._id;
        if (prev.some(m => (m.id || (m as any)._id) === msgId)) return prev;
        return [...prev, msg];
      });
      
      // Auto-translate if it's not from me and doesn't have a translation for my language yet
      if (msg.senderId !== user.uid && (!msg.translations || !msg.translations[user.language])) {
        getTranslation(msg);
      }
    });

    socket.on('message-updated', (updatedMsg: Message) => {
      const updatedId = updatedMsg.id || (updatedMsg as any)._id;
      setMessages(prev => prev.map(m => (m.id || (m as any)._id) === updatedId ? updatedMsg : m));
    });

    socket.on('user-typing', ({ userId, userName, isTyping }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) next[userId] = userName;
        else delete next[userId];
        return next;
      });
    });

    return () => {
      socket.off('new-message');
      socket.off('message-updated');
      socket.off('user-typing');
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId) return;

    socket.emit('send-message', {
      roomId: roomId,
      senderId: user.uid,
      senderName: user.displayName,
      senderLanguage: user.language,
      text: inputText
    });

    setInputText('');
    socket.emit('typing', { roomId: roomId, userId: user.uid, userName: user.displayName, isTyping: false });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (roomId) {
      socket.emit('typing', { roomId: roomId, userId: user.uid, userName: user.displayName, isTyping: e.target.value.length > 0 });
    }
  };

  const getTranslation = async (msg: Message) => {
    try {
      const messageId = (msg as any)._id || msg.id;
      const translatedText = await gemini.translate(msg.text, user.language);
      await api.saveTranslation(messageId, user.language, translatedText);
      // The message will be updated via the socket 'message-updated' event broadcasted by the server
    } catch (err) {
      console.error("Translation failed:", err);
      alert("No se pudo traducir el mensaje.");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(initialRoom.inviteCode);
    // Visual feedback handled by state or just keep simple for now
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const startRecording = async () => {
    const isInIframe = window.self !== window.top;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Tu navegador no soporta la grabación de audio o está bloqueada por la configuración de seguridad. Asegúrate de estar en un entorno seguro (HTTPS).");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Smart mimeType detection for Safari/iOS compatibility
      const mimeTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac'];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || 'audio/webm' });
        handleAudioSend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic access denied:", err);
      
      const isSecurityError = err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.name === 'PermissionDeniedError';
      if (isSecurityError) setMicStatus('denied');

      if (isInIframe && isSecurityError) {
        // We stay silent here because the UI already shows a prominent "OPEN IN NEW TAB" warning component for iframes
        console.warn("Recording blocked by iframe security policy.");
      } else if (isSecurityError) {
        setError("Acceso al micrófono denegado. Por favor, revisa los permisos del navegador (icono del candado 🔒).");
        setTimeout(() => setError(null), 5000);
      } else {
        alert("No se pudo acceder al micrófono: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleAudioSend = async (blob: Blob) => {
    setLoadingAction(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64withPrefix = reader.result as string;
        const base64 = base64withPrefix.split(',')[1];
        const mimeType = blob.type;

        // Transcription with Gemini
        const transcription = await gemini.transcribe(base64, mimeType);

        socket.emit('send-message', {
          roomId: roomId,
          senderId: user.uid,
          senderName: user.displayName,
          senderLanguage: user.language,
          text: transcription,
          audioData: base64withPrefix,
          isAudioTranscription: true
        });
        setLoadingAction(false);
      };
    } catch (err) {
      console.error("Audio processing failed:", err);
      alert("Error al procesar el audio.");
      setLoadingAction(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSpeak = async (text: string, messageId: string) => {
    // If already ready, just play
    if (ttsReadyMap[messageId]) {
      playReadyAudio(messageId);
      return;
    }

    if (isTTSLoading) return;
    setIsTTSLoading(messageId);
    let audioUrl = '';

    try {
      audioUrl = await gemini.speak(text);
      setTtsReadyMap(prev => ({ ...prev, [messageId]: audioUrl }));
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsTTSLoading(null);
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsTTSLoading(null);
      };

      try {
        await audio.play();
      } catch (playErr: any) {
        if (playErr.name === 'NotAllowedError') {
          console.warn("Autoplay blocked, showing manual play button for gesture-less context.");
          setIsTTSLoading(null);
          // Return early without throwing so the outer catch doesn't show an error
          return;
        }
        throw playErr;
      }
    } catch (err) {
      console.error("TTS failed:", err);
      setIsTTSLoading(null);
    }
  };

  const playReadyAudio = (messageId: string) => {
    const url = ttsReadyMap[messageId];
    if (!url) return;
    
    const audio = new Audio(url);
    audio.play().catch(err => {
      console.error("Manual play failed:", err);
      if (err.name === 'NotAllowedError') {
        alert("Haz clic una vez en la página y vuelve a intentar el sonido.");
      }
    });
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta sala? Esta acción no se puede deshacer.')) return;

    setLoadingAction(true);
    try {
      await api.deleteRoom(initialRoom.id, user.uid);
      onBack();
      // Optimization: we might want to tell other users if they are in the room, 
      // but for now simple delete is fine as it's a prototype.
    } catch (err) {
      alert('Error al eliminar la sala');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm('¿Estás seguro de que deseas salir de esta sala? Ya no tendrás acceso a menos que uses el código de invitación de nuevo.')) return;

    setLoadingAction(true);
    try {
      await api.deleteRoom(initialRoom.id, user.uid);
      onBack();
    } catch (err: any) {
      console.error("Error leaving room:", err);
      alert('Error al salir de la sala');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSendInviteCodeToChat = () => {
    if (!roomId) return;
    socket.emit('send-message', {
      roomId: roomId,
      senderId: user.uid,
      senderName: user.displayName,
      senderLanguage: user.language,
      text: `🎟️ ¡SALA DE CHAT! El código de invitación para unirse a esta conversación es: ${initialRoom.inviteCode || initialRoom.id}. Compártelo con quienes quieras traducir en tiempo real.`,
    });
  };

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden bg-white">
      {/* Central panel holding the Active Chat Dialog */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <AnimatePresence>
          {isShareModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#0a3d70]/5 to-[#ff6000]/5 rounded-2xl flex items-center justify-center">
                      <Share2 className="w-8 h-8 text-[#0a3d70]" />
                    </div>
                    <button onClick={() => setIsShareModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Compartir Sala</h3>
                  <p className="text-gray-500 text-sm mb-6">Cualquiera con este código puede unirse a la conversación.</p>
                  
                  <div className="bg-gray-50/70 border border-gray-100/50 rounded-2xl p-6 flex flex-col items-center gap-4 relative group">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Código de Invitación</span>
                    <div className="text-4xl font-black text-gray-900 tracking-wider">
                      {initialRoom.inviteCode}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 w-full mt-2">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(initialRoom.inviteCode);
                          const btn = document.getElementById('copy-btn');
                          if (btn) btn.innerText = '¡Copiado!';
                          setTimeout(() => { if(btn) btn.innerText = 'Copiar Código'; }, 2000);
                        }}
                        id="copy-btn"
                        className="py-3 bg-white border border-gray-200/50 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copiar Código
                      </button>

                      <button 
                        onClick={() => {
                          handleSendInviteCodeToChat();
                          setIsShareModalOpen(false);
                        }}
                        className="py-3 bg-[#0a3d70] hover:bg-[#082a4d] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5 fill-white text-white" />
                        Enviar al Chat
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                     <button 
                      onClick={() => {
                          const text = `¡Únete a mi sala "${initialRoom.name}" en BabelDuo!\nCódigo: ${initialRoom.inviteCode}\n${window.location.origin}`;
                          navigator.clipboard.writeText(text);
                          setIsShareModalOpen(false);
                          alert('Enlace e invitación completos copiados.');
                      }}
                      className="w-full bg-[#0a3d70] text-white rounded-2xl py-3.5 text-xs font-bold shadow-lg shadow-sky-100 hover:bg-[#082a4d] transition-all active:scale-95"
                     >
                      Copiar Invitación Completa
                     </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Header (with WhatsApp mock Phone, Video, Share, Exit/Delete, and Sidebar toggle Info button styled in deep green/teal) */}
        <div className="p-3 bg-[#f0f2f5] border-b border-gray-205/30 flex items-center justify-between pointer-events-auto select-none">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-1 text-gray-500 hover:text-[#0a3d70] outline-none transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            
            {/* Symmetrical room identification resembling WhatsApp contact picture */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#005c53]/10 to-[#ff6000]/10 flex items-center justify-center font-bold text-[#005c53] text-xs shrink-0 select-none">
              {initialRoom.name ? initialRoom.name.slice(0, 2).toUpperCase() : 'BD'}
            </div>
            
            <div className="min-w-0">
              <h2 className="font-bold text-gray-800 leading-tight text-sm flex items-center gap-2 truncate">
                {initialRoom.name}
                {isOwner && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
              </h2>
              <p className="text-[11px] text-[#005c53] font-bold">online</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-1 md:pr-2">
            <button 
              type="button"
              title="Iniciar llamada (Simulación)"
              onClick={() => alert(`Simulando llamada con los integrantes de la sala "${initialRoom.name}"`)}
              className="p-1.5 text-[#005c53] hover:bg-gray-200/40 rounded-lg transition-all"
            >
              <Phone className="w-[18px] h-[18px] stroke-[2]" />
            </button>
            <button 
              type="button"
              title="Iniciar videollamada (Simulación)"
              onClick={() => alert(`Simulando videollamada con los integrantes de la sala "${initialRoom.name}"`)}
              className="p-1.5 text-[#005c53] hover:bg-gray-200/40 rounded-lg transition-all"
            >
              <Video className="w-[20px] h-[20px] stroke-[2]" />
            </button>
            <div className="w-[1px] h-4 bg-gray-300 mx-1" />

            {/* Restored share button in header */}
            <button 
              type="button"
              title="Compartir sala (Código de invitación)"
              onClick={handleShare}
              className="p-1.5 text-[#005c53] hover:bg-gray-200/40 rounded-lg transition-all"
            >
              <Share2 className="w-[18px] h-[18px] stroke-[2]" />
            </button>

            {/* Restored delete/leave button in header */}
            {isOwner ? (
              <button 
                type="button"
                title="Eliminar Sala"
                onClick={handleDeleteRoom}
                disabled={loadingAction}
                className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
              >
                {loadingAction ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Trash2 className="w-[18px] h-[18px] stroke-[2]" />}
              </button>
            ) : (
              <button 
                type="button"
                title="Salir de la Sala"
                onClick={handleLeaveRoom}
                disabled={loadingAction}
                className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
              >
                {loadingAction ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <LogOut className="w-[18px] h-[18px] stroke-[2]" />}
              </button>
            )}

            <div className="w-[1px] h-4 bg-gray-300 mx-1 hidden md:block" />
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title={isSidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
              className={`p-1.5 rounded-lg transition-all hidden md:block ${
                isSidebarOpen ? 'text-[#005c53] bg-[#005c53]/5' : 'text-gray-500 hover:bg-gray-200/40'
              }`}
            >
              <Info className="w-[19px] h-[19px] stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Messages Scroll Area with classic Doodle Wallpaper or modern minimalist backdrops */}
        <div 
          ref={scrollRef} 
          className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative transition-colors duration-300 ${
            themeMode === 'classic' ? 'bg-[#efeae2]/85' : 'bg-[#f4f3f0]'
          }`}
          style={
            themeMode === 'classic' ? {
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%239a8f82' fill-opacity='0.08'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z'/%3E%3C/g%3E%3C/svg%3E")`,
            } : undefined
          }
        >
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            const color = getUserColor(msg.senderId);
            const translation = msg.translations?.[user.language];

            return (
              <motion.div 
                key={msg.id || (msg as any)._id} 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* WhatsApp-style Dialogue Bubbles with high contrast and neat shadows */}
                <div 
                  className={`px-3 py-2 rounded-xl text-gray-800 max-w-[85%] sm:max-w-[70%] shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] relative ${
                    isMe 
                      ? 'bg-[#d9fdd3] rounded-tr-none' 
                      : 'bg-white rounded-tl-none'
                  }`}
                  style={{ minWidth: '110px' }}
                >
                  {/* Sender identification */}
                  <div className="flex items-center justify-between gap-6 mb-1 font-medium select-none">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isMe ? 'text-[#005c4b]' : 'text-[#0a3d70]'}`}>
                      {isMe ? 'Tú' : msg.senderName}
                    </span>
                    <span className="text-xs shrink-0">{getFlag(msg.senderLanguage || 'es')}</span>
                  </div>
                  
                  {/* Main message text */}
                  <p className="text-[13px] font-medium leading-relaxed text-gray-800 pr-5 break-words">
                    {msg.text}
                  </p>
                  
                  {/* Direct audio recording player inside bubble */}
                  {msg.audioData && (
                    <div className="mt-2.5 bg-gray-50/80 rounded-lg p-2 flex items-center gap-3.5 border border-gray-100">
                      <button 
                        type="button"
                        onClick={() => {
                          const audio = new Audio(msg.audioData);
                          audio.play();
                        }}
                        className="p-2 bg-white hover:bg-gray-100 rounded-full border border-gray-200 transition-colors group shrink-0"
                        title="Reproducir audio"
                      >
                        <Play className="w-3.5 h-3.5 fill-[#0a3d70]/90 text-[#0a3d70] group-active:scale-90 transition-transform" />
                      </button>
                      <div className="flex-1 flex flex-col gap-1 min-w-[110px]">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0a3d70]/40 w-full" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-tight text-gray-400 flex items-center gap-1">
                          <Volume2 className="w-2.5 h-2.5" /> Mensaje de voz
                        </span>
                      </div>
                    </div>
                  )}

                  {msg.isAudioTranscription && (
                    <div className="mt-1 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-gray-400 select-none">
                      <Mic className="w-2.5 h-2.5 text-[#ff6000]" /> Transcrito por IA
                    </div>
                  )}

                  {/* Sub-card speech synthesis player */}
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => handleSpeak(msg.text, msg.id || (msg as any)._id)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border select-none ${
                        ttsReadyMap[msg.id || (msg as any)._id] 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600/25' 
                          : 'bg-gray-100/90 hover:bg-gray-200/90 text-gray-600 border-gray-200/50'
                      }`}
                    >
                      {isTTSLoading === (msg.id || (msg as any)._id) ? (
                        <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                      ) : ttsReadyMap[msg.id || (msg as any)._id] ? (
                        <Play className="w-3 h-3 fill-current text-white" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-gray-500" />
                      )}
                      {ttsReadyMap[msg.id || (msg as any)._id] ? 'Reproducir' : 'Escuchar'}
                    </button>
                  </div>

                  {/* Translate sub-section with divider line */}
                  {translation && translation !== msg.text && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200/60 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase font-extrabold text-[#ff6000]">
                          <Globe className="w-3 h-3" /> Traducción ({user.language})
                        </div>
                        <button 
                          onClick={() => handleSpeak(translation, (msg.id || (msg as any)._id) + '-tl')}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider flex items-center gap-1 transition-colors border select-none ${
                            ttsReadyMap[(msg.id || (msg as any)._id) + '-tl'] 
                              ? 'bg-amber-500 text-white border-amber-500/30' 
                              : 'bg-gray-155/80 hover:bg-gray-200/80 text-gray-500 border-gray-200'
                          }`}
                        >
                           {isTTSLoading === ((msg.id || (msg as any)._id) + '-tl') ? (
                            <Loader2 className="w-2 h-2 animate-spin text-gray-450" />
                          ) : ttsReadyMap[(msg.id || (msg as any)._id) + '-tl'] ? (
                            <Play className="w-2.5 h-2.5 fill-current" />
                          ) : (
                            <Volume2 className="w-2.5 h-2.5" />
                          )}
                          {ttsReadyMap[(msg.id || (msg as any)._id) + '-tl'] ? 'Reproducir' : 'Oír'}
                        </button>
                      </div>
                      <p className="text-[13px] italic text-gray-700 leading-relaxed pr-2 break-words font-medium">{translation}</p>
                    </div>
                  )}

                  {/* Compact, bottom right nested Timestamp */}
                  <div className="text-[9px] text-gray-400 font-medium float-right mt-1 ml-4 select-none flex items-center gap-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                  </div>
                </div>
                
                {/* Optional inline Translate prompt if translation not loaded */}
                {!translation && !isMe && (
                  <div className="mt-1 ml-2 text-[10px] text-gray-400 select-none">
                    <button onClick={() => getTranslation(msg)} className="text-[#0a3d70] hover:underline font-bold">Traducir mensaje</button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Typing Indicator */}
        <AnimatePresence>
          {Object.keys(typingUsers).length > 0 && (
            <motion.div className="px-6 py-1 bg-white/70 backdrop-blur-sm text-[10px] text-gray-500 italic select-none">
              {Object.values(typingUsers).join(', ')} está escribiendo...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Input Drawer styled like WhatsApp Input Dock */}
        <div className="p-3 bg-[#f0f2f5] border-t border-gray-205/30 safe-area-bottom">
          {window.self !== window.top ? (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-2 p-2.5 bg-[#e1f3ff] border border-sky-100 rounded-xl flex items-start gap-2.5 text-sky-950 text-xs"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#0a3d70]" />
              <div className="flex-1">
                <p className="font-bold mb-0.5">Casi listo para traducir voz...</p>
                <p className="leading-relaxed mb-1.5 opacity-80 text-[10px]">
                  Los navegadores bloquean el micrófono en previsualizaciones. Abre la app en su propia pestaña para hablar:
                </p>
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0a3d70] hover:bg-[#082a4d] text-white rounded-lg font-bold transition-all text-[9px]"
                >
                  <Share2 className="w-2.5 h-2.5" />
                  ABRIR EN PESTAÑA NUEVA
                </button>
              </div>
            </motion.div>
          ) : micStatus === 'denied' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-2 p-2.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-950 text-xs"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="font-bold mb-0.5">Permiso del Micrófono Denegado</p>
                <p className="leading-relaxed opacity-80 text-[10px] mb-2">
                  Desbloquea pulsando el candado 🔒 en tu navegador y permite el micrófono.
                </p>
                <button 
                  onClick={requestMicPermissionManually}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all text-[10px]"
                >
                  Reintentar
                </button>
              </div>
            </motion.div>
          )}

          {isRecording ? (
            <div className="flex items-center justify-between bg-red-50 border border-red-100 p-1.5 rounded-xl animate-pulse">
              <div className="flex items-center gap-2 px-2 select-none">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs font-bold text-red-600 animate-pulse">Grabando audio... {formatDuration(recordDuration)}</span>
              </div>
              <button 
                onClick={stopRecording}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center">
              <button 
                type="button"
                onClick={startRecording}
                title="Grabar mensaje de voz con traducción automática"
                className="p-2.5 bg-white text-gray-500 rounded-full hover:bg-gray-100 hover:text-[#ff6000] border border-gray-200/50 transition-all shrink-0"
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
              
              <input
                type="text"
                value={inputText}
                onChange={handleTyping}
                className="flex-1 bg-white border border-gray-200/60 rounded-full px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#0a3d70]/30 transition-shadow text-gray-800"
                placeholder="Escribe un mensaje..."
                disabled={loadingAction}
              />
              
              <button 
                type="submit" 
                disabled={!inputText.trim() || loadingAction}
                className="p-2.5 bg-[#0a3d70] text-white rounded-full hover:bg-[#082a4d] transition-transform disabled:opacity-40 disabled:hover:bg-[#0a3d70] disabled:scale-100 shrink-0 shadow-sm"
              >
                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 fill-white" />}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Sidebar Widget Frame (100% styled match to Canva design screenshot) */}
      {isSidebarOpen && (
        <div className="hidden md:flex w-[320px] lg:w-[345px] border-l border-gray-200/25 bg-white flex-col h-full overflow-y-auto shrink-0 animate-in slide-in-from-right-10 duration-200 shadow-sm">
          {/* Header of details sidebar corresponding to Canva clean theme */}
          <div className="p-4 bg-[#f0f2f5] border-b border-gray-200/25 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-gray-700 font-sans tracking-wide">Información y Ajustes</span>
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-1 rounded hover:bg-gray-200/40"
            >
              Cerrar
            </button>
          </div>

          <div className="p-5 flex flex-col gap-6">
            
            {/* Widget 1: Theme Toggle (Sleek minimalist toggle) */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Theme</span>
              <div className="flex items-center justify-between p-3.5 bg-gray-50/70 border border-gray-100 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800">Doodle clásico</span>
                  <span className="text-[10px] text-gray-400 font-medium font-sans">Fondo estilo WhatsApp</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setThemeMode(prev => prev === 'classic' ? 'modern' : 'classic')}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative shrink-0 ${
                    themeMode === 'classic' ? 'bg-[#005c53]' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform duration-200 ${
                    themeMode === 'classic' ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Widget 2: Translation Language Select Dropdown */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Translation Language</span>
              <div className="relative">
                <select
                  value={user.language}
                  onChange={(e) => handleUpdateUserLanguage(e.target.value)}
                  disabled={isUpdatingLang}
                  className="w-full bg-white border border-gray-200/80 text-gray-800 text-xs rounded-xl px-3.5 py-3 h-[45px] outline-none focus:ring-1 focus:ring-[#005c53] font-semibold cursor-pointer transition-shadow shadow-sm"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
                {isUpdatingLang && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-450" />
                  </div>
                )}
              </div>
            </div>

            {/* Widget 3: Room Information Profile box */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Room Information</span>
              <div className="p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#005c53] flex items-center justify-center font-black text-white text-xs select-none shadow-inner shrink-0 leading-none">
                  YOU
                </div>
                <div className="min-w-0 select-text">
                  <p className="font-bold text-gray-800 text-xs truncate leading-normal">{user.displayName || 'Tú (Perfil)'}</p>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse duration-[1.5s]" />
                    Online
                  </p>
                </div>
              </div>
            </div>

            {/* Widget 4: Room Code with elegant Copy border button */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Room Code</span>
              <div className="flex flex-col gap-2.5">
                <div className="bg-gray-50 border border-gray-150/50 rounded-xl p-3 text-center select-all font-mono font-bold text-[12px] tracking-wider text-gray-600 shadow-inner">
                  {initialRoom.inviteCode || initialRoom.id}
                </div>
                
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(initialRoom.inviteCode);
                      setCopiedCodeFeedback(true);
                      setTimeout(() => setCopiedCodeFeedback(false), 2000);
                    }}
                    className={`w-full py-2.5 border rounded-xl font-bold text-xs transition-all active:scale-[0.98] select-none flex items-center justify-center gap-1.5 ${
                      copiedCodeFeedback 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'border-gray-200/50 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedCodeFeedback ? 'Copiado' : 'Copiar'}
                  </button>

                  <button 
                    type="button"
                    onClick={handleSendInviteCodeToChat}
                    className="w-full py-2.5 bg-[#0a3d70] hover:bg-[#082a4d] text-white rounded-xl font-bold text-xs transition-all active:scale-[0.98] select-none flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3 h-3 fill-white text-white" />
                    Enviar al Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Symmetrical divider line */}
            <div className="w-full h-[1px] bg-gray-100/30 my-1" />

            {/* Additional custom Actions section (moved sharing features to sidebar clean integration) */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Ajustes de Sala</span>
              <div className="flex flex-col gap-2">
                <button 
                  type="button"
                  onClick={handleShare}
                  className="w-full py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-gray-200/20"
                >
                  <Share2 className="w-4 h-4 text-gray-500" />
                  Compartir Invitación
                </button>
                
                {isOwner ? (
                  <button 
                    type="button"
                    onClick={handleDeleteRoom}
                    disabled={loadingAction}
                    className="w-full py-2.5 px-3 border border-red-150 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loadingAction ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                    Eliminar Sala
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleLeaveRoom}
                    disabled={loadingAction}
                    className="w-full py-2.5 px-3 border border-red-100 bg-red-55/10 hover:bg-red-50 text-red-550 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loadingAction ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <LogOut className="w-4 h-4" />}
                    Salir del Grupo / Sala
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
