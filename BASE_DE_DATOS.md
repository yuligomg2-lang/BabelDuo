# Especificación y Estructura de Base de Datos NoSQL (MongoDB)
## Proyecto: "Babel Dúo" — Plataforma de Chat Multilingüe en Tiempo Real con IA

Este documento describe formalmente el modelado físico y conceptual de la base de datos en formato **NoSQL de Documentos**, mapeando las colecciones del sistema **Babel Dúo** mediante esquemas compatibles con **MongoDB / Mongoose** y proporcionando ejemplos representativos de documentos JSON reales.

---

## 1. Introducción al Modelo Documental de "Babel Dúo"

La arquitectura de **Babel Dúo** requiere una base de datos distribuida, de baja latencia y alta flexibilidad para soportar:
1. Perfiles de usuario con múltiples intereses dinámicos (`interests`) y soporte de lenguas nativas predeterminadas.
2. Salas de chat adaptables con metadatos de mensajería, control de miembros y un indicador dinámico de estado escribiendo (`typing`).
3. Mensajes instantáneos multilingües que alberguen un mapa anidado de traducciones generadas por Inteligencia Artificial y un registro de lectura (`readBy`).

En un entorno **MongoDB**, se modelan tres colecciones principales: **`users`**, **`rooms`** y **`messages`**. (En Firestore, `messages` se implementa como una subcolección dentro de cada documento de sala, lo que optimiza la segregación y el aislamiento continuo, pero en MongoDB se implementa de forma distribuida indexada por `roomId` para facilitar agregaciones extendidas.)

---

## 2. Colección: `users` (Gestión de Usuarios y Perfiles)

Almacena la información de identidad e intereses de los usuarios autenticados (locales, federados vía Google) y cuentas de invitado de Babel Dúo.

### 2.1 Esquema de Mongoose (MongoDB Schema)
```javascript
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  uid: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  displayName: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  photoURL: { 
    type: String, 
    default: "https://api.dicebear.com/7.x/bottts/svg" 
  },
  language: { 
    type: String, 
    required: true, 
    enum: ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
    default: 'es' 
  },
  interests: [{ 
    type: String, 
    maxlength: 30 
  }],
  isGuest: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export const User = mongoose.model('User', UserSchema);
```

### 2.2 Ejemplo de Documento JSON: Usuario Tradicional / Google
```json
{
  "_id": { "$oid": "6656ca89e28f11002cf7fe01" },
  "uid": "google-oauth2|10528418936468",
  "displayName": "Yuliko Gómez",
  "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocL...",
  "language": "es",
  "interests": ["Desarrollo Software", "Aprender Japonés", "IA"],
  "isGuest": false,
  "createdAt": { "$date": "2026-05-28T05:24:04Z" }
}
```

### 2.3 Ejemplo de Documento JSON: Usuario Invitado (Guest Account)
```json
{
  "_id": { "$oid": "6656cbcde28f11002cf7fe02" },
  "uid": "guest_fa9b8c7d",
  "displayName": "Aventurero Babel 405",
  "photoURL": "https://api.dicebear.com/7.x/bottts/svg?seed=Fa9b",
  "language": "en",
  "interests": ["Prueba Rápida"],
  "isGuest": true,
  "createdAt": { "$date": "2026-05-28T06:30:20Z" }
}
```

---

## 3. Colección: `rooms` (Gestión de Salas de Chat)

Sostiene los metadatos de las salas activas creadas por la comunidad, sus administradores, códigos de acceso restrictivo y el mapa dinámico de actividad en tiempo real.

### 3.1 Esquema de Mongoose (MongoDB Schema)
```javascript
import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  roomId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  name: { 
    type: String, 
    required: true, 
    maxlength: 80,
    trim: true 
  },
  description: { 
    type: String, 
    maxlength: 250 
  },
  theme: { 
    type: String, 
    default: "bg-slate-50" 
  },
  languages: [{ 
    type: String, 
    enum: ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'] 
  }],
  createdBy: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  isPrivate: { 
    type: Boolean, 
    default: false 
  },
  inviteCode: { 
    type: String, 
    required: true,
    minlength: 6,
    maxlength: 6
  },
  members: [{ 
    type: String, 
    description: "Lista de UIDs de usuarios autorizados"
  }],
  typing: {
    type: Map,
    of: String,
    default: {},
    description: "Mapa reactivo de UID -> displayName de usuarios escribiendo"
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    description: "Opcional para salas efímeras de invitados" 
  }
});

// Índice compuesto para velocidad de búsqueda en salas activas y accesos
RoomSchema.index({ isPrivate: 1, name: "text", description: "text" });

export const Room = mongoose.model('Room', RoomSchema);
```

### 3.1 Ejemplo de Documento JSON: Sala Pública de Diálogo
```json
{
  "_id": { "$oid": "6656ce12e28f11002cf7fe03" },
  "roomId": "room_pub_9a8b7c6d",
  "name": "Club de Conversación Tokio-Madrid",
  "description": "Sala libre para practicar e intercambiar vocabulario de manera directa y dinámica.",
  "theme": "bg-gradient-to-br from-[#0a3d70]/10 to-[#ff6000]/10",
  "languages": ["es", "ja"],
  "createdBy": "google-oauth2|10528418936468",
  "isPrivate": false,
  "inviteCode": "304910",
  "members": ["google-oauth2|10528418936468", "uid_tokio_2026", "guest_fa9b8c7d"],
  "typing": {
    "uid_tokio_2026": "Kenji Sato"
  },
  "createdAt": { "$date": "2026-05-28T05:25:30Z" }
}
```

### 3.2 Ejemplo de Documento JSON: Sala Privada Protegida
```json
{
  "_id": { "$oid": "6656ce8be28f11002cf7fe04" },
  "roomId": "room_priv_112233",
  "name": "Co-Working Global de Ingeniería",
  "description": "Acceso restringido para el equipo técnico multidisciplinar de desarrollo.",
  "theme": "bg-white",
  "languages": ["es", "en", "ko"],
  "createdBy": "uid_secret_lead",
  "isPrivate": true,
  "inviteCode": "GX7B2Y",
  "members": ["uid_secret_lead", "google-oauth2|10528418936468"],
  "typing": {},
  "createdAt": { "$date": "2026-05-28T10:00:00Z" }
}
```

---

## 4. Colección: `messages` (Mensajería Multilingüe con Traducción de IA)

Esta colección registra cada interacción escrita o por voz cursada. El elemento fundamental es el mapa de traducciones (`translations`) donde el API de Gemini escribe las adaptaciones automáticamente.

### 4.1 Esquema de Mongoose (MongoDB Schema)
```javascript
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  messageId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  roomId: { 
    type: String, 
    required: true, 
    index: true 
  },
  senderId: { 
    type: String, 
    required: true 
  },
  senderName: { 
    type: String, 
    required: true 
  },
  senderLanguage: { 
    type: String, 
    required: true,
    enum: ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko']
  },
  text: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  translations: {
    type: Map,
    of: String,
    default: {},
    description: "Estructura JSON mapeando el código de idioma con la traducción de Gemini (e.g. 'en' -> 'Hello')"
  },
  audioURL: {
    type: String,
    description: "URL opcional del archivo físico de audio o buffer de voz si el mensaje incluye nota de voz"
  },
  isAudio: {
    type: Boolean,
    default: false
  },
  readBy: [{ 
    type: String, 
    description: "Lista de UIDs de usuarios que leyeron este mensaje" 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Índice compuesto para despliegue cronológico acelerado por salas de chat
MessageSchema.index({ roomId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', MessageSchema);
```

### 4.2 Ejemplo de Documento JSON: Mensaje Traducido por IA (Texto)
```json
{
  "_id": { "$oid": "6656cf5ae28f11002cf7fe05" },
  "messageId": "msg_00a1b2c3d4e5",
  "roomId": "room_pub_9a8b7c6d",
  "senderId": "uid_tokio_2026",
  "senderName": "Kenji Sato",
  "senderLanguage": "ja",
  "text": "こんにちは、プロジェクトの進捗はいかがですか？",
  "translations": {
    "ja": "こんにちは、プロジェクトの進捗はいかがですか？",
    "es": "Hola, ¿cómo va el progreso del proyecto?",
    "en": "Hello, how is the project progress going?",
    "fr": "Bonjour, comment se déroule l'avancement du projet ?",
    "de": "Hallo, wie läuft der Projektfortschritt?"
  },
  "isAudio": false,
  "readBy": ["uid_tokio_2026", "google-oauth2|10528418936468"],
  "createdAt": { "$date": "2026-05-28T22:19:50Z" }
}
```

### 4.3 Ejemplo de Documento JSON: Nota de Voz Transcrita y Traducida por IA (Audio)
```json
{
  "_id": { "$oid": "6656cf9fe28f11002cf7fe06" },
  "messageId": "msg_aud_ff5522aa123b",
  "roomId": "room_pub_9a8b7c6d",
  "senderId": "google-oauth2|10528418936468",
  "senderName": "Yuliko Gómez",
  "senderLanguage": "es",
  "text": "[Transcripción de Notas de Voz]: Me parece genial. Mañana a primera hora subiremos todo a Cloud Run.",
  "translations": {
    "es": "Me parece genial. Mañana a primera hora subiremos todo a Cloud Run.",
    "ja": "素晴らしいと思います。 明日の朝一番にすべてをCloud Runにアップロードします。",
    "en": "I think it's great. Tomorrow first thing in the morning we will upload everything to Cloud Run."
  },
  "audioURL": "data:audio/webm;base64,GkXfo... [Contiene el binario ligero en Base64 para reproducción local]",
  "isAudio": true,
  "readBy": ["google-oauth2|10528418936468", "uid_tokio_2026"],
  "createdAt": { "$date": "2026-05-28T22:20:15Z" }
}
```

---

## 5. Índice de Integridad y Consultas Comunes en MongoDB

Para garantizar el cumplimiento de los Requisitos de Rendimiento (como tiempos inferiores a 1.0s en la obtención de feeds), se especifican las siguientes directrices y operaciones:

### 5.1 Query de Obtención de Feed de Chat con Traducción Dinámica
Cuando un usuario (por ejemplo, con idioma preferido `es`) entra a una sala (`room_pub_9a8b7c6d`), el sistema recupera los mensajes y proyecta únicamente la traducción respectiva o usa un fallback si no existe:

```javascript
// Consulta en MongoDB / Mongoose para recuperar los últimos 50 mensajes de una sala
const getRoomMessages = async (roomId, targetLanguage) => {
  return await Message.find({ roomId: roomId })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean()
    .then(messages => messages.map(msg => ({
      messageId: msg.messageId,
      senderName: msg.senderName,
      senderId: msg.senderId,
      isAudio: msg.isAudio,
      audioURL: msg.audioURL,
      createdAt: msg.createdAt,
      // Selección dinámica de la traducción idónea en base al perfil del lector
      visualText: msg.translations[targetLanguage] || msg.text,
      originalText: msg.text,
      senderLanguage: msg.senderLanguage
    })));
};
```

---

## 6. Mapeo Conceptal: MongoDB vs Firebase Firestore

| Concepto NoSQL | MongoDB | Firebase Firestore |
| :--- | :--- | :--- |
| **Contenedor Principal** | Base de Datos (Database) | Base de Datos Firestore (Database Instance) |
| **Agrupación de Datos** | Colección (Collection) | Colección (Collection) |
| **Unidad de Información** | Documento JSON (BSON Document) | Documento (Document) |
| **Sub-documentos** | Campos embebidos o Mapas (`Map`) | Mapas o Campos anidados (`Maps`) |
| **Suscripción en Tiempo Real** | Change Streams (`watch()`) | Snapshot Listeners (`onSnapshot()`) |
| **Mensajes en Babel Dúo** | Colección `messages` con `roomId` | Subcolección `/rooms/{roomId}/messages/{msgId}`|
