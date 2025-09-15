import api from './api';

class UserService {
  async getProfile() {
    const response = await api.get('/users/profile');
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  }

  async calculateMacros() {
    const response = await api.post('/users/calculate-macros');
    return response.data;
  }

  async getDailyIntake() {
    const response = await api.get('/users/daily-intake');
    return response.data;
  }

  async addToDailyIntake(mealData) {
    const response = await api.post('/users/daily-intake', mealData);
    return response.data;
  }

  async updateDailyIntake(mealId, mealData) {
    const response = await api.put(`/users/daily-intake/${mealId}`, mealData);
    return response.data;
  }

  async removeFromDailyIntake(mealId) {
    const response = await api.delete(`/users/daily-intake/${mealId}`);
    return response.data;
  }

  async resetDailyIntake() {
    const response = await api.post('/users/daily-intake/reset');
    return response.data;
  }

  async getIntakeHistory(params = {}) {
    const response = await api.get('/users/intake-history', { params });
    return response.data;
  }

  async getUserStats() {
    const response = await api.get('/users/stats');
    return response.data;
  }

  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/users/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async deleteAccount() {
    const response = await api.delete('/users/account');
    return response.data;
  }
}

export const userService = new UserService();