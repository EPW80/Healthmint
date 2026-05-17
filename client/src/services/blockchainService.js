import api from './api';

const blockchainService = {
  // Get network information
  getNetworkInfo: async () => {
    try {
      const response = await api.get('/blockchain/network');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  },
  
  // Grant consent to a provider
  grantConsent: async (providerAddress, dataId, expiryTime) => {
    try {
      const response = await api.post('/blockchain/consent/process', {
        providerAddress,
        dataId,
        expiryTime,
        granted: true
      });
      return response.data;
    } catch (error) {
      console.error('Error granting consent:', error);
      throw error;
    }
  },
  
  // Revoke consent from a provider
  revokeConsent: async (providerAddress, dataId) => {
    try {
      const response = await api.post('/blockchain/consent/process', {
        providerAddress,
        dataId,
        granted: false
      });
      return response.data;
    } catch (error) {
      console.error('Error revoking consent:', error);
      throw error;
    }
  },
  
  // Register data on blockchain
  registerData: async (dataHash, metadata, price = 0) => {
    try {
      const response = await api.post('/blockchain/data/register-on-chain', {
        dataHash,
        metadata,
        price
      });
      return response.data;
    } catch (error) {
      console.error('Error registering data:', error);
      throw error;
    }
  }
};

export default blockchainService;