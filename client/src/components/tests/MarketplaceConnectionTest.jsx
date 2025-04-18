import React, { useState } from 'react';
import { ethers } from 'ethers';
import contractInfo from '../../contractInfo.json';
import MarketplaceABI from '../../contracts/MarketplaceABI.json';

const MarketplaceConnectionTest = () => {
  const [account, setAccount] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [errorMessage, setErrorMessage] = useState(null);

  const connectWallet = async () => {
    try {
      setConnectionStatus('Connecting...');
      setErrorMessage(null);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const account = accounts[0];
      setAccount(account);
      
      // Check network
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setNetworkName(network.name);
      setChainId(network.chainId);
      
      // Check if we're on the correct network
      const requiredChainId = contractInfo.marketplace.chainId;
      
      if (network.chainId !== requiredChainId) {
        setErrorMessage(`Wrong network. Please switch to ${contractInfo.marketplace.network} (ChainId: ${requiredChainId})`);
        // Optionally, you can prompt to switch networks:
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + requiredChainId.toString(16) }],
          });
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            setErrorMessage(`Please add the ${contractInfo.marketplace.network} network to MetaMask`);
          }
        }
      }
      
      // Verify contract connection
      try {
        const contract = new ethers.Contract(
          contractInfo.marketplace.address,
          MarketplaceABI,
          provider
        );
        
        // Try to call a view method to verify the contract is responsive
        // Replace 'version' with an actual view method from your contract
        const version = await contract.version();
        console.log("Contract version:", version);
        
        setContractAddress(contractInfo.marketplace.address);
        setConnectionStatus('Connected');
      } catch (contractError) {
        console.error('Contract connection error:', contractError);
        setErrorMessage(`Contract connection failed: ${contractError.message}`);
        setConnectionStatus('Contract error');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(error.message);
      setConnectionStatus('Connection failed');
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <h2>Marketplace Contract Connection Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={connectWallet}
          style={{ 
            padding: '10px 15px', 
            fontSize: '16px',
            backgroundColor: connectionStatus === 'Connected' ? '#4CAF50' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {connectionStatus === 'Connected' ? 'Connected ✓' : 'Connect Wallet'}
        </button>
        
        <p>Status: <strong>{connectionStatus}</strong></p>
        {errorMessage && <p style={{ color: 'red' }}>Error: {errorMessage}</p>}
      </div>
      
      {account && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>Wallet Connection</h3>
          <p><strong>Account:</strong> {account}</p>
          <p><strong>Network:</strong> {networkName}</p>
          <p><strong>Chain ID:</strong> {chainId}</p>
          <p><strong>Expected Chain ID:</strong> {contractInfo.marketplace.chainId} (Sepolia)</p>
        </div>
      )}
      
      {contractAddress && (
        <div style={{ 
          backgroundColor: '#e8f5e9', 
          padding: '15px', 
          borderRadius: '5px' 
        }}>
          <h3>Contract Connection</h3>
          <p><strong>Contract Address:</strong> {contractAddress}</p>
          <p><strong>Deployment Date:</strong> {new Date(contractInfo.deploymentDate).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default MarketplaceConnectionTest;