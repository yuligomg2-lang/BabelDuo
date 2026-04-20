import axios from 'axios';
import { Room, Message, UserProfile } from '../types';

const API_BASE = '/api';

const instance = axios.create({
  baseURL: API_BASE
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503) {
      console.error('DATABASE ERROR:', error.response.data.details);
      alert('Error de Base de Datos: ' + error.response.data.details);
    }
    return Promise.reject(error);
  }
);

export const api = {
  getRooms: async (userId: string): Promise<Room[]> => {
    const res = await instance.get(`/rooms`, { params: { userId } });
    return Array.isArray(res.data) ? res.data : [];
  },
  
  getMessages: async (roomId: string): Promise<Message[]> => {
    const res = await instance.get(`/rooms/${roomId}/messages`);
    return Array.isArray(res.data) ? res.data : [];
  },
  
  createRoom: async (data: any): Promise<Room> => {
    const res = await instance.post(`/rooms`, data);
    return res.data;
  },

  joinRoom: async (inviteCode: string, userId: string): Promise<Room> => {
    const res = await instance.post(`/rooms/join`, { inviteCode, userId });
    return res.data;
  },
  
  updateUser: async (uid: string, data: any): Promise<UserProfile> => {
    const res = await instance.post(`/users/${uid}`, data);
    return res.data;
  },
  
  deleteRoom: async (roomId: string, userId: string): Promise<any> => {
    const res = await instance.delete(`/rooms/${roomId}`, { params: { userId } });
    return res.data;
  },

  saveTranslation: async (messageId: string, language: string, text: string): Promise<Message> => {
    const res = await instance.post(`/messages/${messageId}/translations`, { language, text });
    return res.data;
  }
};
