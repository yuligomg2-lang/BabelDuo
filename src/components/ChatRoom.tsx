import React, { useState, useEffect, useRef } from 'react';
import { db, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, handleFirestoreError, OperationType, arrayUnion, deleteField, deleteDoc, arrayRemove } from '../firebase';
import { Room, UserProfile, Message } from '../types';
import { translateMessage, transcribeAudio } from '../services/geminiService';
import { Send, ChevronLeft, Globe, User as UserIcon, Clock, Sparkles, Share2, Copy, Check, CheckCheck, Trash2, LogOut, Mic, Square, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatRoomProps {
  room: Room;
  user: UserProfile;
  onBack: () => void;
}

const getFlag = (langCode: string) => {
  const flags: Record<string, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    zh: '🇨🇳',
    ja: '🇯🇵',
    ko: '🇰🇷'
  };
  return flags[langCode] || '🏳️';
};

const COLOR_MAP = {
  rose: { bg: 'bg-rose-500', hex: '#f43f5e', text: 'text-rose-600', border: 'border-rose-500' },
  emerald: { bg: 'bg-emerald-500', hex: '#10b981', text: 'text-emerald-600', border: 'border-emerald-500' },
  sky: { bg: 'bg-sky-500', hex: '#0ea5e9', text: 'text-sky-600', border: 'border-sky-500' },
  amber: { bg: 'bg-amber-500', hex: '#f59e0b', text: 'text-amber-600', border: 'border-amber-500' },
  violet: { bg: 'bg-violet-500', hex: '#8b5cf6', text: 'text-violet-600', border: 'border-violet-500' },
  fuchsia: { bg: 'bg-fuchsia-500', hex: '#d946ef', text: 'text-fuchsia-600', border: 'border-fuchsia-500' },
  cyan: { bg: 'bg-cyan-500', hex: '#06b6d4', text: 'text-cyan-600', border: 'border-cyan-500' },
  orange: { bg: 'bg-orange-500', hex: '#f97316', text: 'text-orange-600', border: 'border-orange-500' },
};

const COLOR_KEYS = Object.keys(COLOR_MAP) as Array<keyof typeof COLOR_MAP>;

const getUserColorInfo = (userId: string) => {
  if (userId === 'babel-bot') return COLOR_MAP.amber;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const key = COLOR_KEYS[Math.abs(hash) % COLOR_KEYS.length];
  return COLOR_MAP[key];
};

export const ChatRoom: React.FC<ChatRoomProps> = ({ room: initialRoom, user, onBack }) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to room updates for typing status
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'rooms', initialRoom.id), (snapshot) => {
      if (snapshot.exists()) {
        setRoom({ id: snapshot.id, ...snapshot.data() } as Room);
      } else {
        onBack();
      }
    }, (err) => {
      console.error("Room snapshot error:", err);
      onBack();
    });
    return () => unsubscribe();
  }, [initialRoom.id, onBack]);

  useEffect(() => {
    if (navigator.permissions && (navigator.permissions as any).query) {
      (navigator.permissions as any).query({ name: 'microphone' })
        .then((status: any) => {
          if (status.state === 'denied') {
            setError("El acceso al micrófono está bloqueado. Por favor, habilítalo en la configuración de tu navegador.");
          }
          status.onchange = () => {
            if (status.state === 'denied') {
              setError("El acceso al micrófono está bloqueado.");
            } else if (status.state === 'granted') {
              setError(null);
            }
          };
        });
    }
  }, []);

  useEffect(() => {
    setError(null);
    const q = query(
      collection(db, 'rooms', room.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          text: data.text || ''
        } as Message;
      });
      setMessages(msgs);

      // Mark unread messages as read
      msgs.forEach(async (msg) => {
        if (msg.senderId !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) {
          try {
            await updateDoc(doc(db, 'rooms', room.id, 'messages', msg.id), {
              readBy: arrayUnion(user.uid)
            });
          } catch (e) {
            console.warn("Error marking message as read:", e);
          }
        }
      });
    }, (err) => {
      console.error("ChatRoom snapshot error:", err);
      setError("Error al cargar los mensajes. Verifica tus permisos.");
    });
    return () => unsubscribe();
  }, [room.id, user.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!window.visualViewport) return;
    
    const handleResize = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // Handle typing status
  const updateTypingStatus = async (isTyping: boolean) => {
    try {
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        [`typing.${user.uid}`]: isTyping ? user.displayName : deleteField()
      });
    } catch (e) {
      console.warn("Error updating typing status:", e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Update typing status
    if (!typingTimeoutRef.current) {
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText('');
    
    // Clear typing status immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    updateTypingStatus(false);

    setLoading(true);

    const path = `rooms/${room.id}/messages`;
    try {
      const sendPromise = addDoc(collection(db, path), {
        roomId: room.id,
        senderId: user.uid,
        senderName: user.displayName,
        senderLanguage: user.language,
        text: text,
        translations: {},
        createdAt: serverTimestamp(),
        readBy: [user.uid]
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("El envío del mensaje tardó demasiado. Revisa tu conexión.")), 10000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
    } catch (error: any) {
      console.error("Send message error:", error);
      setError("No se pudo enviar el mensaje. Verifica tu conexión.");
      
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (e) {
        console.warn("Firestore error logged but caught locally to prevent app crash");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      // Find all messages that need translation for the current user's language
      const untranslatedMessages = messages.filter(msg => 
        msg.senderId !== user.uid && 
        (!msg.translations || !msg.translations[user.language]) &&
        translatingId !== msg.id
      );

      if (untranslatedMessages.length > 0) {
        // Translate the first one found (they will be processed sequentially as the state updates)
        getTranslation(untranslatedMessages[0]);
      }
    }
  }, [messages, user.language, translatingId]);

  const getTranslation = async (message: Message) => {
    if (message.translations[user.language]) return;
    
    setTranslatingId(message.id);
    try {
      const translated = await translateMessage(message.text, user.language);
      const path = `rooms/${room.id}/messages/${message.id}`;
      const msgRef = doc(db, path);
      await updateDoc(msgRef, {
        [`translations.${user.language}`]: translated
      });
    } catch (error) {
      console.error("Translation error:", error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}/messages/${message.id}`);
      } catch (e) {
        console.warn("Firestore error logged but caught locally to prevent app crash");
      }
    } finally {
      setTranslatingId(null);
    }
  };

  const handleSimulateMessage = async () => {
    const testMessages = [
      "Hello! This is a test message in English to check the translation feature.",
      "Bonjour! C'est un message de test en français pour verificar la traducción.",
      "Ciao! Questo è un messaggio di prova in italiano per testare la traduzione.",
      "Hallo! Dies ist eine Testnachricht auf Deutsch, um die Übersetzung zu testen.",
      "Olá! Esta é uma mensagem de teste em português para testar a traduzione."
    ];
    const randomMsg = testMessages[Math.floor(Math.random() * testMessages.length)];
    const randomLangs = ['en', 'fr', 'it', 'de', 'pt'];
    const randomLang = randomLangs[Math.floor(Math.random() * randomLangs.length)];
    
    const path = `rooms/${room.id}/messages`;
    try {
      await addDoc(collection(db, path), {
        roomId: room.id,
        senderId: 'babel-bot',
        senderName: 'Babel Bot 🤖',
        senderLanguage: randomLang,
        text: randomMsg,
        translations: {},
        createdAt: serverTimestamp(),
        readBy: ['babel-bot']
      });
    } catch (error) {
      console.error("Simulate message error:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (e) {
        console.warn("Firestore error logged but caught locally to prevent app crash");
      }
    }
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${room.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteRoom = async () => {
    try {
      await deleteDoc(doc(db, 'rooms', room.id));
      onBack();
    } catch (error: any) {
      console.error("Delete room error:", error);
      setError("No se pudo eliminar la sala.");
      try {
        handleFirestoreError(error, OperationType.DELETE, `rooms/${room.id}`);
      } catch (e) {}
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        members: arrayRemove(user.uid)
      });
      onBack();
    } catch (error: any) {
      console.error("Leave room error:", error);
      setError("No se pudo salir de la sala.");
      try {
        handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
      } catch (e) {}
    }
  };

  const startRecording = async () => {
    setRecordingError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta la grabación de audio o está bloqueada por seguridad.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Better MIME type detection for mobile
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) { // Too small, probably silence or error
          setError("El audio grabado es demasiado corto o no contiene datos.");
          setIsProcessingAudio(false);
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (audioBlob.size > 1000000) { // 1MB limit for Firestore docs
          setError("El audio es demasiado pesado. Intenta grabar menos de 20 segundos.");
          setIsProcessingAudio(false);
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        await processAudioMessage(audioBlob, mimeType);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 25) { // Limit to 25 seconds for safety
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      let msg = "";
      const isInIframe = window.self !== window.top;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        msg = "El acceso al micrófono fue denegado o bloqueado.";
        if (isInIframe) {
          msg += " Por seguridad, los navegadores bloquean el micrófono dentro de visores. Por favor, abre la app en una pestaña nueva.";
        }
      } else {
        msg = "No se pudo activar el micrófono: " + (err.message || "Error desconocido");
      }
      setRecordingError(msg);
      setError(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const processAudioMessage = async (blob: Blob, mimeType: string) => {
    setIsProcessingAudio(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const fullBase64 = reader.result as string;
        
        // Use Gemini to transcribe and translate
        const result = await transcribeAudio(base64Audio, mimeType, user.language);
        
        if (result.transcription) {
          // Send as a message
          const path = `rooms/${room.id}/messages`;
          await addDoc(collection(db, path), {
            roomId: room.id,
            senderId: user.uid,
            senderName: user.displayName,
            senderLanguage: user.language,
            text: result.transcription,
            audioData: fullBase64, // Store audio data for playback
            translations: {
              [user.language]: result.translation
            },
            createdAt: serverTimestamp(),
            readBy: [user.uid],
            isAudioTranscription: true
          });
        } else {
          setError("No se pudo transcribir el audio. Asegúrate de hablar claro y que no haya mucho ruido.");
        }
      };
    } catch (err) {
      console.error("Error processing audio:", err);
      setError("Error al procesar el audio.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const typingUsers = room.typing ? Object.entries(room.typing)
    .filter(([uid]) => uid !== user.uid)
    .map(([_, name]) => name) : [];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden h-full max-h-full md:max-h-screen relative overscroll-none" style={{ height: '100%', maxHeight: '-webkit-fill-available' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white p-4 border-b border-gray-100 flex items-center gap-4 shadow-sm z-10">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{room.name}</h2>
          <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">{room.theme}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShare(true)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="Compartir código de invitación"
            style={{ color: '#9ca3af' }}
          >
            <Share2 className="w-5 h-5" />
          </button>
          
          {room.createdBy === user.uid ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Eliminar conversación"
              style={{ color: '#9ca3af' }}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Salir de la conversación"
              style={{ color: '#9ca3af' }}
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleSimulateMessage}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-100"
            title="Simular mensaje en otro idioma para probar traducción"
            style={{ backgroundColor: '#fffbeb', color: '#d97706' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Probar Traducción
          </button>
          <div className="flex -space-x-2">
            {room.languages.map(lang => (
              <div key={lang} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-indigo-600 uppercase">
                {lang}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 space-y-4 md:space-y-6 custom-scrollbar min-h-0 overscroll-contain"
      >
        {error && (
          <div className="p-5 bg-red-50 border border-red-100 rounded-3xl text-xs text-red-600 text-center animate-in fade-in slide-in-from-top-2 relative shadow-md max-w-sm mx-auto my-4">
            <button 
              onClick={() => setError(null)}
              className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1.5 bg-white rounded-full shadow-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shadow-inner">
                <Mic className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-red-700">Problema con el Micrófono</p>
                <p className="text-red-600/80 leading-relaxed">{error}</p>
              </div>
              
              <div className="flex flex-col gap-3 w-full pt-2">
                <button 
                  onClick={() => {
                    setError(null);
                    startRecording();
                  }}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
                >
                  Reintentar Grabación
                </button>
                
                <a 
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-indigo-600 border-2 border-indigo-600 px-6 py-3 rounded-2xl font-bold uppercase tracking-wider hover:bg-indigo-50 transition-all text-center shadow-sm active:scale-95"
                >
                  Abrir en Pestaña Nueva
                </a>
                
                <p className="text-[10px] text-gray-400 font-medium px-4">
                  Recomendado para móviles y para evitar bloqueos de seguridad del navegador.
                </p>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            const translation = msg.translations?.[user.language];
            const isRead = msg.readBy && msg.readBy.length > 1;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col mb-5 ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[80%] group relative`}>
                  <div 
                    className={`p-4 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : `${getUserColorInfo(msg.senderId).bg} text-white rounded-tl-none`
                    }`}
                    style={isMe ? { backgroundColor: '#4f46e5', color: '#ffffff' } : { backgroundColor: getUserColorInfo(msg.senderId).hex, color: '#ffffff' }}
                  >
                    {/* Sender Name and Language inside the bubble - Distinct Color */}
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[120px] ${isMe ? 'text-indigo-200' : 'text-amber-200'}`}>
                          {isMe ? 'Tú' : msg.senderName}
                        </span>
                      </div>
                      {(isMe ? user.language : msg.senderLanguage) && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/10`}>
                          <span className="text-[10px]">{getFlag(isMe ? user.language : msg.senderLanguage!)}</span>
                          <span className="text-[8px] font-black uppercase opacity-90">
                            {isMe ? user.language : msg.senderLanguage}
                          </span>
                        </div>
                      )}
                    </div>

                    {msg.audioData && (
                      <div className="mb-3 flex items-center gap-2 bg-black/10 rounded-xl p-2">
                        <audio 
                          src={msg.audioData} 
                          controls 
                          className={`w-full max-w-[180px] h-8 ${isMe ? 'invert brightness-200' : ''}`}
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-3">
                      <p className="text-sm leading-relaxed font-medium">
                        {msg.text || <span className="italic opacity-50">Enviando...</span>}
                      </p>
                      
                      {translation && translation !== msg.text && (
                        <div className={`pt-3 border-t ${isMe ? 'border-indigo-500/50' : 'border-white/20'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className={`w-3 h-3 ${isMe ? 'text-indigo-200' : 'text-white/70'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isMe ? 'text-indigo-200' : 'text-white/70'}`}>
                              Traducción ({user.language})
                            </span>
                          </div>
                          <p className={`text-sm italic ${isMe ? 'text-indigo-50' : 'text-white/90'}`}>
                            {translation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {!translation && (
                    <button
                      onClick={() => getTranslation(msg)}
                      disabled={translatingId === msg.id}
                      className={`absolute -right-10 top-0 p-2 transition-colors opacity-0 group-hover:opacity-100 ${
                        translatingId === msg.id ? 'text-indigo-400 animate-pulse' : 'text-gray-300 hover:text-indigo-600'
                      }`}
                      title="Traducir"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 mt-2 ${isMe ? 'mr-1' : 'ml-1'}`}>
                  <Clock className="w-3 h-3 text-gray-300" />
                  <span className="text-[9px] text-gray-400 font-medium">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </span>
                  {isMe && (
                    <div className="flex items-center ml-0.5">
                      {isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-6 py-2 bg-white/80 backdrop-blur-sm border-t border-gray-50 flex items-center gap-2"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-[10px] font-medium text-gray-500 italic">
              {typingUsers.length === 1 
                ? `${typingUsers[0]} está escribiendo...` 
                : `${typingUsers.length} personas están escribiendo...`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100 z-50 sticky bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex-1 flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono font-bold text-red-600 flex-1">
                Grabando... {formatTime(recordingTime)}
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={isProcessingAudio ? "Procesando audio..." : "Escribe un mensaje..."}
                  disabled={isProcessingAudio}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50"
                />
                {isProcessingAudio && (
                  <div className="absolute right-4">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  </div>
                )}
              </div>
              
              {!inputText.trim() ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isProcessingAudio}
                  className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex-shrink-0"
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none flex-shrink-0"
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </form>
      </div>
      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Invitar Amigos</h3>
              <p className="text-sm text-gray-500 mb-6">Comparte este código para que otros se unan a la conversación.</p>
              
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-4 mb-6">
                <span className="text-4xl font-mono font-bold text-indigo-600 tracking-[0.5em] ml-[0.5em]">
                  {room.inviteCode}
                </span>
                <button
                  onClick={handleCopyInvite}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar Código'}
                </button>
              </div>

              <button
                onClick={() => setShowShare(false)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                style={{ backgroundColor: '#111827', color: '#ffffff' }}
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">¿Eliminar conversación?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Esta acción eliminará la sala y todos sus mensajes para todos los participantes. No se puede deshacer.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">¿Salir del grupo?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                ¿Deseas salir de este grupo de conversación? Ya no podrás ver ni enviar mensajes.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100"
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
