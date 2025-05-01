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
        token: `mock_jwt_token_for_${address}`,
        user: {
          address,
          role: 'patient',
          name: `User ${address.substring(0, 6)}`,
        }
      };
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, signature, message }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Wallet connection failed: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }
}

export default new WalletService();