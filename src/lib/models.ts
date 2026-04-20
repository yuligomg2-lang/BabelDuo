import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  senderId: string;
  senderName: string;
  senderLanguage: string;
  text: string;
  translations: Map<string, string>;
  audioData?: string;
  isAudioTranscription?: boolean;
  readBy: string[];
  createdAt: Date;
}

// Schema options to include virtuals in JSON output
const schemaOptions = {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
};

const MessageSchema: Schema = new Schema({
  roomId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderLanguage: { type: String, required: true },
  text: { type: String, required: true },
  translations: { type: Map, of: String, default: {} },
  audioData: { type: String },
  isAudioTranscription: { type: Boolean, default: false },
  readBy: [{ type: String }],
}, schemaOptions);

export default mongoose.model<IMessage>('Message', MessageSchema);

export interface IUser extends Document {
  uid: string;
  displayName: string;
  photoURL?: string;
  language: string;
  interests: string[];
  isGuest: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  uid: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  photoURL: { type: String },
  language: { type: String, default: 'es' },
  interests: [{ type: String }],
  isGuest: { type: Boolean, default: false },
}, schemaOptions);

export const User = mongoose.model<IUser>('User', UserSchema);

export interface IRoom extends Document {
  name: string;
  theme: string;
  languages: string[];
  createdBy: string;
  isPrivate: boolean;
  inviteCode: string;
  members: string[];
  typing: Map<string, string>;
  createdAt: Date;
}

const RoomSchema: Schema = new Schema({
  name: { type: String, required: true },
  theme: { type: String, required: true },
  languages: [{ type: String }],
  createdBy: { type: String, required: true },
  isPrivate: { type: Boolean, default: true },
  inviteCode: { type: String, required: true, unique: true },
  members: [{ type: String }],
  typing: { type: Map, of: String, default: {} },
}, schemaOptions);

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
