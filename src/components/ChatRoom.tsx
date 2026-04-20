import React, { useState, useEffect, useRef } from 'react';
import { Room, UserProfile, Message } from '../types';
import socket from '../lib/socket';
import { api } from '../services/apiService';
import { gemini } from '../services/geminiService';
import { ChevronLeft, Globe, Send, Clock, Check, CheckCheck, Mic, Square, Loader2, X, Share2, Trash2, LogOut, Sparkles, Copy, Play, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatRoomProps {
  room: Room;
  user: UserProfile;
  onBack: () => void;
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

export const ChatRoom: React.FC<ChatRoomProps> = ({ room: initialRoom, user, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState<string | null>(null); // messageId
  const [ttsReadyMap, setTtsReadyMap] = useState<Record<string, string>>({}); // messageId -> blobUrl
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  
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
    
    if (navigator.permissions && (navigator.permissions as any).query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((permissionStatus) => {
          // If we are in an iframe, we often get 'denied' or 'prompt' but it still fails.
          // We'll trust the native check but augment it with our iframe check.
          setMicStatus(permissionStatus.state as any);
          permissionStatus.onchange = () => {
            setMicStatus(permissionStatus.state as any);
          };
        })
        .catch(() => {
          if (isInIframe) setMicStatus('denied');
          else setMicStatus('unknown');
        });
    } else if (isInIframe) {
      // Fallback for browsers that don't support permission query (like Safari in some versions)
      setMicStatus('denied');
    }
  }, []);

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
      
      const isSecurityError = err.name === 'NotAllowedError' || err.name === 'SecurityError';
      if (isSecurityError) setMicStatus('denied');

      if (isInIframe && isSecurityError) {
        alert("⚠️ BLOQUEO DE SEGURIDAD: Los navegadores impiden el micrófono dentro de cuadros de previsualización. \n\nPASO 1: Pulsa el botón azul 'ABRIR EN PESTAÑA NUEVA' que acaba de aparecer.\nPASO 2: En la nueva pestaña, acepta los permisos cuando el navegador te lo pregunte.");
      } else if (isSecurityError) {
        alert("⚠️ PERMISO DENEGADO: El navegador tiene bloqueado el micrófono para este sitio.\n\nCÓMO ACTIVARLO:\n1. Busca el ICONO DEL CANDADO (o círculos) a la izquierda de la dirección web (URL) arriba.\n2. Pulsa en 'Permisos' o 'Configuración del sitio'.\n3. Cambia Micrófono a 'Permitir'.\n4. Refresca la página.");
      } else {
        alert("No se pudo acceder al micrófono. Revisa si otra aplicación lo está usando o si tu dispositivo tiene el hardware desactivado.");
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

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
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
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Share2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <button onClick={() => setIsShareModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Compartir Sala</h3>
                <p className="text-gray-500 text-sm mb-6">Cualquiera con este código puede unirse a la conversación.</p>
                
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col items-center gap-4 relative group">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Código de Invitación</span>
                  <div className="text-4xl font-black text-gray-900 tracking-wider">
                    {initialRoom.inviteCode}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(initialRoom.inviteCode);
                      // Simple feedback
                      const btn = document.getElementById('copy-btn');
                      if (btn) btn.innerText = '¡Copiado!';
                      setTimeout(() => { if(btn) btn.innerText = 'Copiar Código'; }, 2000);
                    }}
                    id="copy-btn"
                    className="mt-2 w-full py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Código
                  </button>
                </div>

                <div className="mt-8">
                   <button 
                    onClick={() => {
                        const text = `¡Únete a mi sala "${initialRoom.name}" en BabelDuo!\nCódigo: ${initialRoom.inviteCode}\n${window.location.origin}`;
                        navigator.clipboard.writeText(text);
                        setIsShareModalOpen(false);
                        alert('Enlace e invitación completos copiados.');
                    }}
                    className="w-full bg-indigo-600 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                   >
                    Copiar Invitación Completa
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-indigo-600 outline-none transition-colors"><ChevronLeft /></button>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
              {initialRoom.name}
              {isOwner && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
            </h2>
            <p className="text-[10px] text-indigo-500 uppercase font-black tracking-[0.2em]">{initialRoom.theme}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleShare}
            title="Compartir código"
            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
          
          {isOwner && (
            <button 
              onClick={handleDeleteRoom}
              disabled={loadingAction}
              title="Eliminar sala"
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
            >
              {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const color = getUserColor(msg.senderId);
          const translation = msg.translations?.[user.language];

          return (
            <motion.div key={msg.id || (msg as any)._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm text-white max-w-[80%] ${isMe ? 'bg-indigo-600 rounded-tr-none' : `${color.bg} rounded-tl-none`}`} style={{ backgroundColor: isMe ? '#4f46e5' : color.hex }}>
                <div className="flex items-center justify-between gap-4 mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{isMe ? 'Tú' : msg.senderName}</span>
                   <span className="text-xs">{getFlag(msg.senderLanguage || 'es')}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={() => handleSpeak(msg.text, msg.id || (msg as any)._id)}
                    className={`p-1 px-2 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${ttsReadyMap[msg.id || (msg as any)._id] ? 'bg-amber-500 text-white' : 'bg-white/10 text-white'}`}
                  >
                    {isTTSLoading === (msg.id || (msg as any)._id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : ttsReadyMap[msg.id || (msg as any)._id] ? (
                      <Play className="w-3 h-3 fill-current" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                    {ttsReadyMap[msg.id || (msg as any)._id] ? 'Reproducir' : 'Escuchar'}
                  </button>
                </div>

                {msg.audioData && (
                  <div className="mt-3 bg-white/10 rounded-xl p-2 flex items-center gap-3">
                    <button 
                      onClick={() => {
                        const audio = new Audio(msg.audioData);
                        audio.play();
                      }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors group"
                      title="Reproducir audio"
                    >
                      <Play className="w-4 h-4 fill-current group-active:scale-90 transition-transform" />
                    </button>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-full rounded-full opacity-50" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70 flex items-center gap-1">
                        <Volume2 className="w-2 h-2" /> Audio Mensaje
                      </span>
                    </div>
                  </div>
                )}

                {msg.isAudioTranscription && (
                  <div className="mt-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest opacity-60">
                    <Mic className="w-2 h-2" /> Transcrito por IA
                  </div>
                )}

                {translation && translation !== msg.text && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-1 mt-1">
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold opacity-70">
                        <Globe className="w-3 h-3" /> Traducción ({user.language})
                      </div>
                      <button 
                        onClick={() => handleSpeak(translation, (msg.id || (msg as any)._id) + '-tl')}
                        className={`p-1 px-2 hover:bg-white/20 rounded-lg text-[8px] font-bold tracking-wider flex items-center gap-1 transition-colors ${ttsReadyMap[(msg.id || (msg as any)._id) + '-tl'] ? 'bg-amber-500 text-white' : 'bg-white/10 text-white'}`}
                      >
                         {isTTSLoading === ((msg.id || (msg as any)._id) + '-tl') ? (
                          <Loader2 className="w-2 h-2 animate-spin" />
                        ) : ttsReadyMap[(msg.id || (msg as any)._id) + '-tl'] ? (
                          <Play className="w-2 h-2 fill-current" />
                        ) : (
                          <Volume2 className="w-2 h-2" />
                        )}
                        {ttsReadyMap[(msg.id || (msg as any)._id) + '-tl'] ? 'Reproducir' : 'Oír'}
                      </button>
                    </div>
                    <p className="text-sm italic text-white/90">{translation}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                <Clock className="w-3 h-3" />
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {!translation && !isMe && (
                   <button onClick={() => getTranslation(msg)} className="text-indigo-500 hover:underline">Traducir</button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Typing */}
      <AnimatePresence>
        {Object.keys(typingUsers).length > 0 && (
          <motion.div className="px-6 py-1 text-[10px] text-gray-400 italic">
            {Object.values(typingUsers).join(', ')} está escribiendo...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 bg-white border-t safe-area-bottom">
        {window.self !== window.top ? (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 text-indigo-900 text-xs"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600" />
            <div className="flex-1">
              <p className="font-bold mb-1">Casi listo para traducir voz...</p>
              <p className="leading-relaxed mb-2 opacity-80">
                Por seguridad, los navegadores bloquean el micrófono en previsualizaciones. Abre la app en su propia pestaña para activar el audio:
              </p>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all text-[10px] animate-pulse shadow-md"
              >
                <Share2 className="w-3 h-3" />
                ABRIR EN PESTAÑA NUEVA
              </button>
            </div>
          </motion.div>
        ) : micStatus === 'denied' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-900 text-xs"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-bold mb-1">Permiso del Micrófono Denegado</p>
              <p className="leading-relaxed opacity-80">
                Has bloqueado el micrófono en esta pestaña. Para activarlo: Pulsa el <b>icono del candado 🔒</b> a la izquierda de la dirección web arriba, activa el Micrófono y recarga la página.
              </p>
            </div>
          </motion.div>
        )}
        {isRecording ? (
          <div className="flex items-center justify-between bg-red-50 border border-red-100 p-2 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm font-bold text-red-600">Grabando... {formatDuration(recordDuration)}</span>
            </div>
            <button 
              onClick={stopRecording}
              className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <button 
              type="button"
              onClick={startRecording}
              className="p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={handleTyping}
              className="flex-1 bg-gray-50 border rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Escribe un mensaje..."
              disabled={loadingAction}
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || loadingAction}
              className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-100"
            >
              {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
