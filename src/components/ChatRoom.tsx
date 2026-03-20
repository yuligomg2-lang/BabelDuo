import React, { useState, useEffect, useRef } from 'react';
import { db, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import { Room, UserProfile, Message } from '../types';
import { translateMessage } from '../services/geminiService';
import { Send, ChevronLeft, Globe, User as UserIcon, Clock, Sparkles, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatRoomProps {
  room: Room;
  user: UserProfile;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ room, user, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null);
    const q = query(
      collection(db, 'rooms', room.id, 'messages')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      // Sort in memory to avoid index issues
      const sortedMsgs = msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });
      setMessages(sortedMsgs);
    }, (err) => {
      console.error("ChatRoom snapshot error:", err);
      setError("Error al cargar los mensajes. Verifica tus permisos.");
    });
    return () => unsubscribe();
  }, [room.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText('');
    setLoading(true);

    const path = `rooms/${room.id}/messages`;
    try {
      const sendPromise = addDoc(collection(db, path), {
        roomId: room.id,
        senderId: user.uid,
        senderName: user.displayName,
        text: text,
        translations: {},
        createdAt: serverTimestamp()
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
      const lastMsg = messages[messages.length - 1];
      // Only translate if it's from someone else, hasn't been translated to our language,
      // and we're not already translating it.
      if (lastMsg.senderId !== user.uid && 
          (!lastMsg.translations || !lastMsg.translations[user.language]) && 
          translatingId !== lastMsg.id) {
        getTranslation(lastMsg);
      }
    }
  }, [messages.length, user.language, translatingId]);

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
      "Olá! Esta é uma mensagem de teste em português para testar a tradução."
    ];
    const randomMsg = testMessages[Math.floor(Math.random() * testMessages.length)];
    
    const path = `rooms/${room.id}/messages`;
    try {
      await addDoc(collection(db, path), {
        roomId: room.id,
        senderId: 'babel-bot',
        senderName: 'Babel Bot 🤖',
        text: randomMsg,
        translations: {},
        createdAt: serverTimestamp()
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
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 border-bottom border-gray-100 flex items-center gap-4 shadow-sm z-10">
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
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleSimulateMessage}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-100"
            title="Simular mensaje en otro idioma para probar traducción"
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
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 text-center animate-in fade-in slide-in-from-top-1">
            <p className="mb-1">{error}</p>
            <button 
              onClick={() => (window as any).openDiagnostics?.()}
              className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
            >
              Ver detalles técnicos
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            const translation = msg.translations[user.language];

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-4">
                    {msg.senderName}
                  </span>
                )}
                <div className={`max-w-[80%] group relative`}>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    
                    {translation && translation !== msg.text && (
                      <div className={`mt-3 pt-3 border-t ${isMe ? 'border-indigo-500/50' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className={`w-3 h-3 ${isMe ? 'text-indigo-200' : 'text-indigo-500'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${isMe ? 'text-indigo-200' : 'text-indigo-500'}`}>
                            Traducción ({user.language})
                          </span>
                        </div>
                        <p className={`text-sm italic ${isMe ? 'text-indigo-50' : 'text-gray-600'}`}>
                          {translation}
                        </p>
                      </div>
                    )}
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
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                  <Clock className="w-3 h-3 text-gray-300" />
                  <span className="text-[9px] text-gray-400 font-medium">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
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
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
