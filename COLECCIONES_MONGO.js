/**
 * ESPECIFICACIÓN DE COLECCIONES EN MONGODB (Mongoose Schemas)
 * Proyecto: "Babel Dúo" — Plataforma de Chat Multilingüe en Tiempo Real con Inteligencia Artificial
 * 
 * Este archivo contiene los esquemas de Mongoose listos para producción para las tres colecciones 
 * principales: 'users', 'rooms' y 'messages'. Incluye validaciones, índices para rendimiento,
 * y un script demostrativo de inserción (seed) para inicializar bases de datos de prueba.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ==========================================
// 1. ESQUEMA DE LA COLECCIÓN 'users'
// ==========================================
const UserSchema = new Schema({
  uid: { 
    type: String, 
    required: [true, 'El UID del usuario (de Firebase Auth u OAuth) es obligatorio'], 
    unique: true, 
    index: true 
  },
  displayName: { 
    type: String, 
    required: [true, 'El nombre en pantalla es requerido'], 
    trim: true,
    maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
  },
  photoURL: { 
    type: String, 
    default: "https://api.dicebear.com/7.x/bottts/svg" 
  },
  language: { 
    type: String, 
    required: [true, 'El idioma predeterminado es obligatorio'], 
    enum: {
      values: ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
      message: '{VALUE} no es un idioma admitido'
    },
    default: 'es' 
  },
  interests: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.every(ins => ins.length <= 30);
      },
      message: 'Cada etiqueta de interés no debe superar los 30 caracteres.'
    }
  },
  isGuest: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // Agrega automático 'createdAt' y 'updatedAt'
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);


// ==========================================
// 2. ESQUEMA DE LA COLECCIÓN 'rooms'
// ==========================================
const RoomSchema = new Schema({
  roomId: { 
    type: String, 
    required: [true, 'El ID único de la sala es obligatorio'], 
    unique: true, 
    index: true 
  },
  name: { 
    type: String, 
    required: [true, 'El nombre de la sala es obligatorio'], 
    maxlength: [80, 'El nombre de la sala no puede superar los 80 caracteres'],
    trim: true 
  },
  description: { 
    type: String, 
    maxlength: [250, 'La descripción de la sala no puede superar los 250 caracteres'],
    default: ""
  },
  theme: { 
    type: String, 
    default: "bg-slate-50" // Clase Tailwind para la estética
  },
  languages: {
    type: [String],
    enum: ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
    default: ['es']
  },
  createdBy: { 
    type: String, 
    required: [true, 'El UID del creador de la sala es obligatorio']
  },
  isPrivate: { 
    type: Boolean, 
    default: false 
  },
  inviteCode: { 
    type: String, 
    required: [true, 'El código de invitación de 6 caracteres es obligatorio'],
    minlength: 6,
    maxlength: 6,
    uppercase: true
  },
  members: {
    type: [String], // Array de UIDs de usuarios que pertenecen a la sala
    default: []
  },
  typing: {
    type: Map,
    of: String,
    default: {},
    // Ejemplo: { "uid_juan": "Juan Perez" } cuando 'Juan Perez' está editando
  },
  expiresAt: { 
    type: Date, 
    default: null // Opcional para salas de invitados temporales
  }
}, {
  timestamps: true
});

// Índice de búsqueda de texto en campos nombre y descripción
RoomSchema.index({ name: 'text', description: 'text' });

const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);


// ==========================================
// 3. ESQUEMA DE LA COLECCIÓN 'messages'
// ==========================================
const MessageSchema = new Schema({
  messageId: { 
    type: String, 
    required: [true, 'El ID único del mensaje es obligatorio'], 
    unique: true, 
    index: true 
  },
  roomId: { 
    type: String, 
    required: [true, 'El ID de la sala es obligatorio'], 
    index: true // Indexado para velocidad al recuperar hilos de conversación
  },
  senderId: { 
    type: String, 
    required: [true, 'El UID del remitente es obligatorio'] 
  },
  senderName: { 
    type: String, 
    required: [true, 'El nombre en pantalla del remitente es obligatorio'] 
  },
  senderLanguage: { 
    type: String, 
    required: true,
    enum: ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko']
  },
  text: { 
    type: String, 
    required: [true, 'El contenido del mensaje original es obligatorio'],
    maxlength: [2000, 'El mensaje es demasiado largo']
  },
  translations: {
    type: Map,
    of: String,
    default: {},
    // Ejemplo: { "en": "Hello", "ja": "こんにちは" }
  },
  audioURL: {
    type: String,
    default: "" // URL o secuencia base64 del audio si es nota de voz
  },
  isAudio: {
    type: Boolean,
    default: false
  },
  readBy: {
    type: [String], // Array de UIDs de usuarios que leyeron este mensaje
    default: []
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true // Indexado para ordenar cronológicamente con fluidez
  }
}, {
  timestamps: true
});

// Índice compuesto optimizado para recuperar mensajes de una sala ordenados por tiempo
MessageSchema.index({ roomId: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);


// ==========================================
// 4. SCRIPT DE INSERCIÓN EJEMPLO (SEED SCRIPT)
// ==========================================
/**
 * Inserta documentos prototipo en MongoDB como ejemplo ilustrativo de datos.
 * Útil para pruebas, simulaciones y estructuración de la persistencia de Babel Dúo.
 */
async function seedBabelDuoDatabase(connectionUri) {
  try {
    console.log("Conectándose a Base de Datos NoSQL MongoDB...");
    await mongoose.connect(connectionUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conexión Establecida.");

    // Limpieza previa (Opcional, sólo en entornos de desarrollo / pruebas)
    await User.deleteMany({});
    await Room.deleteMany({});
    await Message.deleteMany({});
    console.log("Colecciones anteriores limpiadas.");

    // --- A. CREAR USUARIOS DE EJEMPLO ---
    console.log("Insertando Usuarios...");
    const usuario1 = await User.create({
      uid: "google-oauth2|10528418936468",
      displayName: "Yuliko Gómez",
      photoURL: "https://lh3.googleusercontent.com/a/ACg8ocL_example",
      language: "es",
      interests: ["Desarrollo Software", "Aprender Japonés", "Cloud Compute"],
      isGuest: false
    });

    const usuario2 = await User.create({
      uid: "github|7788992211",
      displayName: "Kenji Sato",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Kenji",
      language: "ja",
      interests: ["Machine Learning", "Intercambio de Idiomas", "React"],
      isGuest: false
    });

    const usuario3 = await User.create({
      uid: "guest_ef90ab22",
      displayName: "Aventurero Babel 99",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Guest99",
      language: "en",
      interests: ["Pruebas de Sistema"],
      isGuest: true
    });

    // --- B. CREAR SALA DE CHAT DE EJEMPLO ---
    console.log("Creando Sala de Conversación...");
    const salaChat = await Room.create({
      roomId: "room_tokio_madrid_2026",
      name: "Club de Idiomas Tokio-Madrid 🌐",
      description: "Sala oficial bilingüe para intercambiar conceptos, modismos y practicar con soporte de IA.",
      theme: "bg-gradient-to-br from-[#0a3d70]/10 to-[#ff6000]/10",
      languages: ["es", "ja", "en"],
      createdBy: usuario1.uid,
      isPrivate: false,
      inviteCode: "TOKESP",
      members: [usuario1.uid, usuario2.uid, usuario3.uid],
      typing: {}
    });

    // --- C. CREAR HISTORIAL DE MENSAJES CON TRADUCCIONES ---
    console.log("Registrando Mensajes con buffers de traducción (Google Gemini)...");
    
    // Mensaje 1 (Enviado por Kenji en Japonés)
    const mensaje1 = await Message.create({
      messageId: "msg_90001",
      roomId: salaChat.roomId,
      senderId: usuario2.uid,
      senderName: usuario2.displayName,
      senderLanguage: usuario2.language,
      text: "みなさん、こんにちは！Babel Dúoへようこそ。調子はいかがですか？",
      translations: {
        "ja": "みなさん、こんにちは！Babel Dúoへようこそ。調子はいかがですか？",
        "es": "¡Hola a todos! Bienvenidos a Babel Dúo. ¿Cómo están?",
        "en": "Hello everyone! Welcome to Babel Dun. How are you doing?",
        "fr": "Bonjour à tous! Bienvenue sur Babel Duo. Comment allez-vous?",
        "de": "Hallo allerseits! Willkommen bei Babel Duo. Wie geht es euch?"
      },
      isAudio: false,
      readBy: [usuario1.uid, usuario2.uid]
    });

    // Mensaje 2 (Enviado por Yuliko en Español - Nota de Audio transcrita y traducida)
    const mensaje2 = await Message.create({
      messageId: "msg_90002",
      roomId: salaChat.roomId,
      senderId: usuario1.uid,
      senderName: usuario1.displayName,
      senderLanguage: usuario1.language,
      text: "[Audio Transcrito]: ¡Hola Kenji! Un placer saludarte. El traductor de Gemini me está mostrando tu mensaje de forma instantánea.",
      translations: {
        "es": "¡Hola Kenji! Un placer saludarte. El traductor de Gemini me está mostrando tu mensaje de forma instantánea.",
        "ja": "こんにちはケンジ！ お会いできて嬉し。 Gemini翻訳者があなたのメッセージを瞬時に表示してくれます。",
        "en": "Hello Kenji! Dynamic greeting. The Gemini translator is showing me your message instantly.",
        "fr": "Bonjour Kenji! Un plaisir de vous saluer. Le traducteur Gemini m'affiche instantanément votre message."
      },
      audioURL: "data:audio/webm;base64,GkXfo69ChoEBQveBAULygQRC64EIQoKEd...", // Simulación de base64 binario
      isAudio: true,
      readBy: [usuario1.uid, usuario2.uid, usuario3.uid]
    });

    console.log("Base de datos de prueba (Seed Data) sembrada correctamente.");
    return { success: true };
  } catch (error) {
    console.error("Error sembrando la base de datos:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("Desconectado de MongoDB.");
  }
}

module.exports = {
  User,
  Room,
  Message,
  seedBabelDuoDatabase
};
