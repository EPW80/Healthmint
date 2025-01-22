export const networkConfig = {
  requiredNetwork: {
    chainId: "0xaa36a7", // Sepolia chainId in hex
    chainName: "Sepolia",
  },
  networks: {
    "0xaa36a7": {
      name: "Sepolia",
      chainId: "0xaa36a7",
      rpcUrls: ["https://sepolia.infura.io/v3/"],
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
      nativeCurrency: {
        name: "Sepolia Ether",
        symbol: "SepoliaETH", // Changed from ETH to SepoliaETH
        decimals: 18,
      },
    },
  },
};

export const addSepoliaToMetaMask = async () => {
  try {
    // First try to switch to the network if it exists
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networkConfig.requiredNetwork.chainId }],
      });
      return true;
    } catch (switchError) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: networkConfig.requiredNetwork.chainId,
                chainName: "Sepolia",
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "SepoliaETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding network:", addError);
          return false;
        }
      }
      console.error("Error switching network:", switchError);
      return false;
    }
  } catch (error) {
    console.error("Error handling network:", error);
    return false;
  }
};
