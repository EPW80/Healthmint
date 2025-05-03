class WalletService {
  constructor() {
    this.apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
    this.mockMode = process.env.NODE_ENV !== 'production' || !process.env.REACT_APP_API_URL;
  }
  
  async connectWallet(address, signature, message) {
    if (this.mockMode) {
      console.log('Using mock wallet service in development mode');
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        token: `mock_jwt_token_for_${address.substring(0, 10)}`,
        user: {
          address,
          role: 'patient',
          name: `User ${address.substring(0, 6)}`,
        }
      };
    }
    
    try {
      console.log(`Attempting to connect wallet at ${this.apiBaseUrl}/auth/wallet/connect`);
      const response = await fetch(`${this.apiBaseUrl}/auth/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, signature, message }),
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 100));
        
        // In development, fallback to mock
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Falling back to mock wallet connection');
          return {
            success: true,
            token: `mock_jwt_token_for_${address.substring(0, 10)}`,
            user: {
              address,
              role: 'patient',
              name: `User ${address.substring(0, 6)} (Mock)`,
            }
          };
        }
        
        throw new Error(`API returned non-JSON response: ${text.substring(0, 50)}...`);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Wallet connection failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Wallet connection error:', error);
      
      // Fallback to mock in development
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Falling back to mock wallet connection due to error');
        return {
          success: true,
          token: `mock_jwt_token_for_${address.substring(0, 10)}`,
          user: {
            address,
            role: 'patient',
            name: `User ${address.substring(0, 6)} (Mock Fallback)`,
          }
        };
      }
      
      throw error;
    }
  }
}

export default new WalletService();