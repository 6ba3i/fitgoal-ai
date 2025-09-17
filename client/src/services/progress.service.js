import api from './api';

class ProgressService {
  async getProgress(params = {}) {
    const response = await api.get('/progress', { params });
    return response.data;
  }

  async getProgressSummary() {
    const response = await api.get('/progress/summary');
    return response.data;
  }

  async getProgressTrends() {
    const response = await api.get('/progress/trends');
    return response.data;
  }

  async addProgress(progressData) {
    const response = await api.post('/progress', progressData);
    return response.data;
  }

  async updateProgress(progressId, progressData) {
    const response = await api.put(`/progress/${progressId}`, progressData);
    return response.data;
  }

  async deleteProgress(progressId) {
    const response = await api.delete(`/progress/${progressId}`);
    return response.data;
  }

  async getProgressById(progressId) {
    const response = await api.get(`/progress/${progressId}`);
    return response.data;
  }

  async getProgressByDateRange(startDate, endDate) {
    const response = await api.get('/progress/range', {
      params: { startDate, endDate }
    });
    return response.data;
  }

  async getLatestProgress() {
    const response = await api.get('/progress/latest');
    return response.data;
  }

  async getProgressStats(period = '30') {
    const response = await api.get('/progress/stats', {
      params: { period }
    });
    return response.data;
  }

  async analyzeProgress() {
    const response = await api.post('/progress/analyze');
    return response.data;
  }

  async exportProgress(format = 'csv') {
    const response = await api.get('/progress/export', {
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json'
    });
    return response.data;
  }

  async importProgress(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/progress/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async getWeightPrediction(days = 30) {
    const response = await api.post('/progress/predict', { days });
    return response.data;
  }

  async detectPlateau() {
    const response = await api.get('/progress/plateau-detection');
    return response.data;
  }
}

export const progressService = new ProgressService();