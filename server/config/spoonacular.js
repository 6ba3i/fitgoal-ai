const axios = require('axios');
const crypto = require('crypto');

class SpoonacularConfig {
  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY;
    this.apiSecret = process.env.SPOONACULAR_API_SECRET;
    this.baseURL = process.env.SPOONACULAR_BASE_URL || 'https://api.spoonacular.com';
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Spoonacular API key and secret are required. Please set SPOONACULAR_API_KEY and SPOONACULAR_API_SECRET in your .env file');
    }

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include API key
    this.client.interceptors.request.use(
      (config) => {
        // Add API key to all requests
        config.params = {
          ...config.params,
          apiKey: this.apiKey
        };

        // Add signature if using premium endpoints
        if (this.requiresSignature(config.url)) {
          const signature = this.generateSignature(config);
          config.params.signature = signature;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Handle rate limiting
          if (error.response.status === 402) {
            console.error('Spoonacular API quota exceeded');
            throw new Error('Recipe API quota exceeded. Please try again later.');
          }
          
          // Handle authentication errors
          if (error.response.status === 401) {
            console.error('Spoonacular API authentication failed');
            throw new Error('Recipe API authentication failed. Please check your API credentials.');
          }
        }
        
        throw error;
      }
    );
  }

  /**
   * Generate HMAC signature for premium endpoints
   */
  generateSignature(config) {
    const timestamp = Date.now();
    const message = `${config.method.toUpperCase()}${config.url}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
    
    return signature;
  }

  /**
   * Check if endpoint requires signature (premium features)
   */
  requiresSignature(url) {
    const premiumEndpoints = [
      '/mealplanner/generate',
      '/recipes/extract',
      '/food/menuItems/search'
    ];
    
    return premiumEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Get configured axios client
   */
  getClient() {
    return this.client;
  }

  /**
   * Check API quota status
   */
  async checkQuota() {
    try {
      const response = await this.client.get('/recipes/random', {
        params: { number: 1 }
      });
      
      return {
        pointsUsed: response.headers['x-api-quota-used'] || 'N/A',
        pointsLeft: response.headers['x-api-quota-left'] || 'N/A',
        requestsUsed: response.headers['x-api-quota-request'] || 'N/A'
      };
    } catch (error) {
      console.error('Failed to check API quota:', error);
      return null;
    }
  }

  /**
   * Validate API credentials
   */
  async validateCredentials() {
    try {
      const response = await this.client.get('/recipes/random', {
        params: { number: 1 }
      });
      return response.status === 200;
    } catch (error) {
      console.error('API credentials validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new SpoonacularConfig();