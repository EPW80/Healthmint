import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractInfo from '../../contractInfo.json';
import MarketplaceABI from '../../contracts/MarketplaceABI.json';

const MarketplaceInteractionTest = () => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [setSigner] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Marketplace data
  const [listingCount, setListingCount] = useState(null);
  const [recentListings] = useState([]);
  const [userRole, setUserRole] = useState(null);
  
  // Transaction state
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);

  const connectWallet = async () => {
    try {
      setConnectionStatus('Connecting...');
      setErrorMessage(null);
      
      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const account = accounts[0];
      setAccount(account);
      
      // Setup provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      setSigner(signer);
      
      // Check network
      const network = await provider.getNetwork();
      const requiredChainId = contractInfo.marketplace.chainId;
      
      if (network.chainId !== requiredChainId) {
        setErrorMessage(`Please switch to ${contractInfo.marketplace.network} network`);
        return;
      }
      
      // Connect to contract
      const contract = new ethers.Contract(
        contractInfo.marketplace.address,
        MarketplaceABI,
        signer
      );
      
      setContract(contract);
      setConnectionStatus('Connected');
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
      });
      
      // Fetch initial data
      fetchMarketplaceData(contract, account);
      
    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(error.message);
      setConnectionStatus('Connection failed');
    }
  };

  const fetchMarketplaceData = async (contractInstance) => {
    if (!contractInstance) return;
    
    try {
      // These function calls should match your actual contract functions
      // Replace with actual functions from your marketplace contract
      
      // Example: Get listing count
      // const count = await contractInstance.getTotalListings();
      // setListingCount(count.toString());
      
      // Example: Get user role or status
      // const role = await contractInstance.getUserRole(userAccount);
      // setUserRole(role);
      
      // Example: Get recent listings
      // const listings = await contractInstance.getRecentListings(5);
      // setRecentListings(listings);
      
      // For demo purposes only
      setListingCount("Demo Mode - Replace with actual contract calls");
      setUserRole("Demo Mode - Replace with actual contract calls");
      
    } catch (error) {
      console.error("Error fetching marketplace data:", error);
      setErrorMessage(`Data fetch error: ${error.message}`);
    }
  };

  // Example marketplace interaction - customize for your contract
  const createTestListing = async () => {
    if (!contract || !account) return;
    
    try {
      setTransactionStatus('Preparing');
      setTransactionHash(null);
      
      // Example values - replace with your actual contract function
      const dataId = "test-" + Date.now().toString();
      const price = ethers.utils.parseEther("0.01");
      const metadata = {
        title: "Test Health Data",
        description: "Sample data for testing marketplace",
        category: "Test",
        timestamp: new Date().toISOString()
      };
      
      // Replace this with your actual contract function for creating a listing
      setTransactionStatus('Awaiting approval');
      const tx = await contract.createDataListing(
        dataId,
        price,
        JSON.stringify(metadata),
        { gasLimit: 300000 }
      );
      
      setTransactionStatus('Mining');
      setTransactionHash(tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      setTransactionStatus('Completed');
      
      // Refresh data
      fetchMarketplaceData(contract, account);
      
    } catch (error) {
      console.error("Transaction error:", error);
      setTransactionStatus('Failed');
      setErrorMessage(`Transaction failed: ${error.message}`);
    }
  };

  useEffect(() => {
    // Check if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only want to run this once on component mount

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Marketplace Contract Interaction Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={connectWallet}
          disabled={connectionStatus === 'Connected'}
          style={{ 
            padding: '10px 15px', 
            fontSize: '16px',
            backgroundColor: connectionStatus === 'Connected' ? '#4CAF50' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {connectionStatus === 'Connected' ? 'Connected ✓' : 'Connect Wallet'}
        </button>
        
        {contract && account && (
          <button
            onClick={() => fetchMarketplaceData(contract, account)}
            style={{ 
              padding: '10px 15px', 
              fontSize: '16px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Data
          </button>
        )}
        
        <p>Status: <strong>{connectionStatus}</strong></p>
        {errorMessage && <p style={{ color: 'red' }}>Error: {errorMessage}</p>}
        {account && <p>Connected Account: <strong>{account}</strong></p>}
      </div>
      
      {contract && (
        <>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3>Marketplace Data</h3>
            <p><strong>Contract Address:</strong> {contractInfo.marketplace.address}</p>
            <p><strong>Listing Count:</strong> {listingCount !== null ? listingCount : 'Loading...'}</p>
            <p><strong>Your Role/Status:</strong> {userRole !== null ? userRole : 'Loading...'}</p>
            <div>
              <h4>Recent Listings</h4>
              {recentListings.length > 0 ? (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {recentListings.map((listing, index) => (
                    <li key={index} style={{ 
                      padding: '8px', 
                      margin: '5px 0', 
                      backgroundColor: '#f9f9f9',
                      borderRadius: '4px'
                    }}>
                      Demo listing #{index + 1}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No recent listings found</p>
              )}
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '15px', 
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3>Create Test Listing</h3>
            <p>This will attempt to create a test data listing in the marketplace.</p>
            <button
              onClick={createTestListing}
              disabled={transactionStatus === 'Preparing' || transactionStatus === 'Awaiting approval' || transactionStatus === 'Mining'}
              style={{ 
                padding: '10px 15px', 
                fontSize: '16px',
                backgroundColor: '#673AB7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Create Test Listing
            </button>
            
            {transactionStatus && (
              <div style={{ marginTop: '15px' }}>
                <p><strong>Status:</strong> {transactionStatus}</p>
                {transactionHash && (
                  <p>
                    <strong>Transaction Hash:</strong> 
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${transactionHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ marginLeft: '5px' }}
                    >
                      {transactionHash.substring(0, 10)}...{transactionHash.substring(transactionHash.length - 8)}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MarketplaceInteractionTest;