import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { updateUserProfile, clearUserProfile } from "../redux/slices/userSlice";
import {
  updateWalletConnection,
  clearWalletConnection,
} from "../redux/slices/walletSlice";
import { addNotification } from "../redux/slices/store/notificationSlice";
import { requiredNetwork } from "../config/networks";


const WalletConnectComponent = ({ onConnect }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cleanupRef = useRef();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState("");

  /** Handles Wallet Disconnect */
  const handleDisconnect = useCallback(() => {
    setAccount("");
    dispatch(clearWalletConnection());
    dispatch(clearUserProfile());
    dispatch(addNotification({ type: "info", message: "Wallet disconnected" }));
    navigate("/login");
  }, [dispatch, navigate]);

  /** Sets up Wallet Event Listeners */
  const setupWalletListeners = useCallback(() => {
    if (!window.ethereum?.removeListener) return;

    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        dispatch(updateUserProfile({ address: accounts[0] }));
        dispatch(addNotification({ type: "info", message: "Account changed" }));
      }
    };

    const handleChainChange = () => {
      dispatch(
        addNotification({
          type: "warning",
          message: "Network changed. Please reconnect your wallet.",
        })
      );
      handleDisconnect();
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountChange);
    window.ethereum.on("chainChanged", handleChainChange);
    window.ethereum.on("disconnect", handleDisconnect);

    cleanupRef.current = () => {
      window.ethereum.removeListener("accountsChanged", handleAccountChange);
      window.ethereum.removeListener("chainChanged", handleChainChange);
      window.ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [dispatch, handleDisconnect]);

  /** Connects Wallet */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to continue");
      dispatch(
        addNotification({
          type: "error",
          message: "Please install MetaMask to continue",
        })
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts?.length)
        throw new Error("No accounts found. Please connect your wallet.");

      const account = accounts[0];
      setAccount(account);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== requiredNetwork.NETWORK_ID) {
        throw new Error("Please switch to the Sepolia network.");
      }

      dispatch(
        updateWalletConnection({
          isConnected: true,
          address: account,
          provider: { connection: provider.connection }, // Exclude the provider object
          signer: { _isSigner: true }, // Exclude the signer object
          walletType: "metamask",
        })
      );
      dispatch(
        addNotification({
          type: "success",
          message: "Wallet connected successfully!",
        })
      );

      setupWalletListeners();
      onConnect(account);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError(error.message || "Failed to connect wallet.");
      dispatch(
        addNotification({
          type: "error",
          message: error.message || "Failed to connect wallet",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, setupWalletListeners, onConnect]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return { connectWallet, error, loading, account };
};

export default WalletConnectComponent;
