import api from './api';

class AuthService {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  }

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  }

  async googleAuth(idToken) {
    const response = await api.post('/auth/google', { idToken });
    return response.data;
  }

  async firebaseAuth(idToken) {
    const response = await api.post('/auth/firebase', { idToken });
    return response.data;
  }

  async logout() {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('authToken');
    return response.data;
  }

  async verifyToken() {
    const response = await api.get('/auth/verify-token');
    return response.data;
  }

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  }

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token, password) {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async refreshToken(token) {
    const response = await api.post('/auth/refresh-token', { token });
    return response.data;
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export const authService = new AuthService();