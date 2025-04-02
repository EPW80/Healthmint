// src/services/transactionService.js
/**
 * Transaction Service
 * 
 * Simulates blockchain transactions for health data purchases
 * and maintains a transaction history
 */

// Store transaction history in localStorage
const STORAGE_KEY = 'healthmint_transactions';

/**
 * Get all transactions from storage
 * @returns {Array} Array of transaction objects
 */
const getTransactions = () => {
  try {
    const storedTransactions = localStorage.getItem(STORAGE_KEY);
    return storedTransactions ? JSON.parse(storedTransactions) : [];
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    return [];
  }
};

/**
 * Save transactions to storage
 * @param {Array} transactions - Array of transaction objects to save
 */
const saveTransactions = (transactions) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving transactions:', error);
  }
};

/**
 * Generate a mock Ethereum transaction hash
 * @returns {string} A mock transaction hash
 */
const generateTransactionHash = () => {
  const characters = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return hash;
};

/**
 * Simulate a blockchain transaction with configurable success rate
 * @param {Object} options - Transaction options
 * @param {string} options.from - Sender address
 * @param {string} options.to - Recipient address
 * @param {string|number} options.value - Amount to transfer
 * @param {number} options.successRate - Probability of success (0-1)
 * @param {function} options.onProgress - Progress callback function
 * @returns {Promise<Object>} Transaction result
 */
const simulateTransaction = async (options = {}) => {
  const {
    from = '0x0000000000000000000000000000000000000000',
    to = '0x0000000000000000000000000000000000000000',
    value = '0',
    successRate = 0.95,  // 95% success rate by default
    delayMs = 2500,      // Simulate network delay
    onProgress          // Optional progress callback
  } = options;

  // Simulate blockchain call
  return new Promise((resolve, reject) => {
    // Initial progress
    if (onProgress) onProgress(0);
    
    setTimeout(() => {
      // Middle progress
      if (onProgress) onProgress(50);
      
      setTimeout(() => {
        // Final progress
        if (onProgress) onProgress(100);
        
        // Determine if transaction succeeds based on success rate
        const isSuccessful = Math.random() < successRate;
        
        if (isSuccessful) {
          const transactionHash = generateTransactionHash();
          const timestamp = new Date().toISOString();
          
          // Create transaction record
          const transaction = {
            hash: transactionHash,
            from,
            to,
            value,
            timestamp,
            status: 'confirmed',
            blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
            gasUsed: Math.floor(Math.random() * 100000) + 50000,
          };
          
          // Add to transaction history
          const transactions = getTransactions();
          transactions.push(transaction);
          saveTransactions(transactions);
          
          resolve({
            success: true,
            transaction
          });
        } else {
          // Simulate random failure reasons
          const errorTypes = [
            'Transaction underpriced',
            'Insufficient funds for gas * price + value',
            'User rejected transaction',
            'Transaction timeout'
          ];
          
          const errorMessage = errorTypes[Math.floor(Math.random() * errorTypes.length)];
          
          reject(new Error(errorMessage));
        }
      }, delayMs / 2);
    }, delayMs / 2);
  });
};

/**
 * Create a purchase transaction for a health dataset
 * @param {Object} purchaseData - Purchase details
 * @param {string} purchaseData.datasetId - ID of the dataset being purchased
 * @param {string} purchaseData.buyerAddress - Buyer's wallet address
 * @param {string} purchaseData.sellerAddress - Seller's wallet address
 * @param {string|number} purchaseData.price - Price in ETH
 * @param {function} purchaseData.onProgress - Optional progress callback
 * @returns {Promise<Object>} Transaction result
 */
const purchaseDataset = async (purchaseData) => {
  const {
    datasetId,
    buyerAddress,
    sellerAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', // Default contract address
    price,
    onProgress
  } = purchaseData;
  
  if (!datasetId || !buyerAddress || !price) {
    throw new Error('Missing required purchase information');
  }
  
  try {
    // Simulate blockchain transaction
    const result = await simulateTransaction({
      from: buyerAddress,
      to: sellerAddress,
      value: price,
      onProgress
    });
    
    // Add dataset-specific metadata to the transaction
    const transactions = getTransactions();
    const transactionIndex = transactions.findIndex(tx => tx.hash === result.transaction.hash);
    
    if (transactionIndex >= 0) {
      transactions[transactionIndex].metadata = {
        type: 'DATASET_PURCHASE',
        datasetId,
        purchaseDate: new Date().toISOString()
      };
      
      saveTransactions(transactions);
    }
    
    return {
      success: true,
      transactionHash: result.transaction.hash,
      timestamp: result.transaction.timestamp,
      datasetId
    };
  } catch (error) {
    console.error('Dataset purchase failed:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed'
    };
  }
};

/**
 * Get transaction history for a specific wallet address
 * @param {string} walletAddress - The wallet address to filter transactions for
 * @returns {Array} Filtered transaction history
 */
const getTransactionHistory = (walletAddress) => {
  if (!walletAddress) return [];
  
  const transactions = getTransactions();
  return transactions.filter(tx => 
    tx.from.toLowerCase() === walletAddress.toLowerCase() || 
    tx.to.toLowerCase() === walletAddress.toLowerCase()
  );
};

/**
 * Get purchased datasets for a wallet address
 * @param {string} walletAddress - The wallet address to check
 * @returns {Array<string>} Array of purchased dataset IDs
 */
const getPurchasedDatasets = (walletAddress) => {
  if (!walletAddress) return [];
  
  const transactions = getTransactions();
  
  // Filter successful purchases made by this wallet
  const purchases = transactions.filter(tx => 
    tx.from.toLowerCase() === walletAddress.toLowerCase() &&
    tx.status === 'confirmed' &&
    tx.metadata?.type === 'DATASET_PURCHASE'
  );
  
  // Extract dataset IDs
  return purchases.map(tx => tx.metadata.datasetId);
};

/**
 * Check if a dataset has been purchased by a specific wallet
 * @param {string} datasetId - The dataset ID to check
 * @param {string} walletAddress - The wallet address to check
 * @returns {boolean} True if the dataset has been purchased
 */
const isDatasetPurchased = (datasetId, walletAddress) => {
  if (!datasetId || !walletAddress) return false;
  
  const purchasedDatasets = getPurchasedDatasets(walletAddress);
  return purchasedDatasets.includes(datasetId);
};

/**
 * Get receipt details for a specific transaction
 * @param {string} transactionHash - The transaction hash to look up
 * @returns {Object|null} Transaction receipt or null if not found
 */
const getTransactionReceipt = (transactionHash) => {
  if (!transactionHash) return null;
  
  const transactions = getTransactions();
  const transaction = transactions.find(tx => tx.hash === transactionHash);
  
  if (!transaction) return null;
  
  // Create a receipt-like object with additional information
  return {
    transactionHash: transaction.hash,
    from: transaction.from,
    to: transaction.to,
    blockNumber: transaction.blockNumber,
    status: transaction.status === 'confirmed' ? '0x1' : '0x0', // 0x1 = success, 0x0 = failure
    gasUsed: transaction.gasUsed,
    effectiveGasPrice: '0x' + (Math.floor(Math.random() * 100) + 20).toString(16) + '000000000',
    logs: [],
    contractAddress: null,
    timestamp: transaction.timestamp,
    value: transaction.value,
    metadata: transaction.metadata || {}
  };
};

// Create a named object before exporting it
const transactionService = {
  purchaseDataset,
  getTransactions,
  getTransactionHistory,
  getPurchasedDatasets,
  isDatasetPurchased,
  getTransactionReceipt
};

// Export the named object as default
export default transactionService;