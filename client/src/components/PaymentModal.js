// src/components/PaymentModal.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { 
  CreditCard, 
  Lock, 
  AlertCircle, 
  Check, 
  X,
  ArrowRight,
  Wallet,
  Shield,
  Info
} from "lucide-react";
import { useSelector } from "react-redux";
import { LoadingSpinner } from "./ui";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import transactionService from "../services/transactionService.js";

/**
 * PaymentModal Component
 * 
 * A simulated payment interface for researchers to purchase health datasets
 * Implements HIPAA-compliant transaction logging
 */
const PaymentModal = ({ 
  isOpen, 
  onClose, 
  dataset, 
  onPurchaseComplete, 
  walletAddress 
}) => {
  // Get user wallet details
  const userWalletAddress = useSelector(state => state.wallet.address) || walletAddress;
  const userRole = useSelector(state => state.role.role);
  
  // Form state
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [transactionHash, setTransactionHash] = useState(null);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentProgress, setPaymentProgress] = useState(0);
  
  // References for accessibility
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const initialFocusRef = useRef(null);

  // Handle modal close with cleanup
  const handleClose = useCallback(() => {
    // Reset state if the modal is closed during transaction
    if (!transactionComplete && processingPayment) {
      setProcessingPayment(false);
    }
    
    // If transaction was completed successfully, call the completion handler
    if (transactionComplete && onPurchaseComplete) {
      onPurchaseComplete({
        datasetId: dataset?.id,
        transactionHash,
        timestamp: new Date().toISOString(),
        price: dataset?.price,
        paymentMethod
      });
    }
    
    // Reset state
    setCurrentStep(1);
    setAgreeToTerms(false);
    setError(null);
    setPaymentProgress(0);
    setTransactionComplete(false);
    setTransactionHash(null);
    
    // Close the modal
    onClose();
  }, [
    transactionComplete, 
    processingPayment, 
    onPurchaseComplete, 
    dataset, 
    transactionHash, 
    paymentMethod, 
    onClose
  ]);

  // Trap focus within modal for accessibility
  useEffect(() => {
    if (!isOpen) return;
    
    // Focus the initial element when modal opens
    if (initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
    
    // Handle ESC key press
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Process the payment
  const processPayment = async () => {
    if (processingPayment) return;
    
    try {
      setError(null);
      setProcessingPayment(true);
      
      // Log transaction initiation for HIPAA compliance
      await hipaaComplianceService.createAuditLog("PAYMENT_INITIATED", {
        datasetId: dataset?.id,
        userRole,
        userId: userWalletAddress,
        paymentMethod,
        price: dataset?.price,
        timestamp: new Date().toISOString(),
        action: "PAYMENT_START"
      });
      
      // Perform the actual purchase using the transaction service
      const result = await transactionService.purchaseDataset({
        datasetId: dataset?.id,
        buyerAddress: userWalletAddress,
        price: dataset?.price,
        onProgress: (progress) => {
          setPaymentProgress(progress);
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }
      
      // Set the transaction hash from the successful transaction
      setTransactionHash(result.transactionHash);
      
      // Log successful transaction for HIPAA compliance
      await hipaaComplianceService.createAuditLog("PAYMENT_COMPLETE", {
        datasetId: dataset?.id,
        userRole,
        userId: userWalletAddress,
        paymentMethod,
        price: dataset?.price,
        transactionHash: result.transactionHash,
        timestamp: new Date().toISOString(),
        action: "PAYMENT_SUCCESS"
      });
      
      // Mark transaction as complete
      setTransactionComplete(true);
      setCurrentStep(3);
      
    } catch (err) {
      console.error("Payment processing error:", err);
      setError(err.message || "Transaction failed. Please try again.");
      
      // Log failed transaction for HIPAA compliance
      await hipaaComplianceService.createAuditLog("PAYMENT_FAILED", {
        datasetId: dataset?.id,
        userRole,
        userId: userWalletAddress,
        paymentMethod,
        price: dataset?.price,
        error: err.message || "Unknown error",
        timestamp: new Date().toISOString(),
        action: "PAYMENT_FAILURE"
      });
      
    } finally {
      setProcessingPayment(false);
    }
  };

  // Proceed to payment confirmation step
  const handleProceedToPayment = () => {
    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions to proceed.");
      return;
    }
    
    setCurrentStep(2);
    setError(null);
  };

  // Confirm and execute payment
  const handleConfirmPayment = async () => {
    await processPayment();
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      role="dialog"
      onClick={(e) => {
        // Close when clicking outside the modal content
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          handleClose();
        }
      }}
    >
      <div 
        ref={modalRef} 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full m-4 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 id="payment-modal-title" className="text-2xl font-bold">
              {currentStep === 3 
                ? "Payment Complete" 
                : `Purchase Dataset ${currentStep === 2 ? "- Confirm Payment" : ""}`}
            </h2>
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-full p-1"
              aria-label="Close dialog"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Step 1: Dataset Selection and Terms */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Dataset Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-blue-800 mb-2">Dataset Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Title:</p>
                    <p className="font-medium">{dataset?.title || "Selected Dataset"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price:</p>
                    <p className="font-medium text-blue-600">{dataset?.price || "0.00"} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category:</p>
                    <p className="font-medium">{dataset?.category || "Health Data"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Records:</p>
                    <p className="font-medium">{dataset?.recordCount || "Unknown"}</p>
                  </div>
                </div>
              </div>

              {/* HIPAA Notice */}
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="text-purple-500 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-medium text-purple-700">HIPAA Compliance Notice</h3>
                    <p className="text-sm text-purple-600">
                      This transaction will be logged for HIPAA compliance purposes. All data access 
                      is tracked and secured according to HIPAA regulations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Select Payment Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                      className="h-4 w-4 text-blue-600"
                      ref={initialFocusRef}
                    />
                    <Wallet className="ml-3 mr-2 h-5 w-5 text-blue-500" />
                    <div className="ml-2">
                      <p className="font-medium">Connected Wallet</p>
                      <p className="text-sm text-gray-500">
                        Pay using your currently connected wallet: 
                        <span className="text-gray-700">
                          {userWalletAddress 
                            ? ` ${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}` 
                            : " (No wallet connected)"}
                        </span>
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="h-4 w-4 text-blue-600"
                    />
                    <CreditCard className="ml-3 mr-2 h-5 w-5 text-blue-500" />
                    <div className="ml-2">
                      <p className="font-medium">Credit Card</p>
                      <p className="text-sm text-gray-500">Simulated credit card payment</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="mt-6">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I agree to the <button href="#" className="text-blue-600 hover:underline">Terms of Service</button>{" "}
                    and acknowledge that this purchase grants me a license to access and use this 
                    dataset for research purposes only, subject to all applicable HIPAA regulations.
                  </span>
                </label>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment Confirmation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
                <h3 className="text-lg font-semibold mb-2">Please Confirm Your Purchase</h3>
                <p className="mb-4">You're about to purchase:</p>
                
                <div className="mb-6">
                  <span className="text-2xl font-bold text-blue-600">{dataset?.price || "0.00"} ETH</span>
                </div>
                
                <div className="flex justify-center items-center gap-2 mb-4">
                  <div className="text-gray-500">via</div>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                    {paymentMethod === "wallet" ? (
                      <>
                        <Wallet size={14} className="mr-1" />
                        <span>Connected Wallet</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={14} className="mr-1" />
                        <span>Credit Card</span>
                      </>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  This is a simulated transaction for demonstration purposes.
                  No actual cryptocurrency will be transferred.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="text-yellow-500 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-yellow-700">
                      In a production environment, this would initiate an actual blockchain 
                      transaction. For this demo, we'll simulate the payment process.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Processing Indicator */}
              {processingPayment && (
                <div className="text-center py-4">
                  <LoadingSpinner size="medium" label="Processing payment..." showLabel={true} />
                  <p className="text-sm text-gray-600 mt-2">
                    Please wait while your transaction is being processed...
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-full mt-4 bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${paymentProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Transaction progress: {paymentProgress}%
                  </p>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Transaction Complete */}
          {currentStep === 3 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center my-6">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={32} className="text-green-600" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-green-700">
                Transaction Complete!
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID:</p>
                    <p className="font-mono text-sm break-all">{transactionHash}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount:</p>
                    <p className="font-medium">{dataset?.price || "0.00"} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date:</p>
                    <p className="font-medium">{new Date().toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status:</p>
                    <p className="font-medium text-green-600">Confirmed</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <p className="text-sm text-gray-700">
                    Your payment has been processed successfully. You now have access to this dataset.
                    You can view your purchased datasets in your research dashboard.
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left">
                <div className="flex items-start gap-2">
                  <Info className="text-blue-500 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-blue-700">
                      This was a simulated transaction for demonstration purposes.
                      In a production environment, a real cryptocurrency transaction would have been executed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            {currentStep === 1 && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToPayment}
                  disabled={!agreeToTerms}
                  className={`px-4 py-2 flex items-center gap-2 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    !agreeToTerms
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={processingPayment}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={processingPayment}
                  className={`px-4 py-2 flex items-center gap-2 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    processingPayment
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {processingPayment ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>Confirm Purchase</span>
                      <Lock size={16} />
                    </>
                  )}
                </button>
              </>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  dataset: PropTypes.object,
  onPurchaseComplete: PropTypes.func,
  walletAddress: PropTypes.string
};

export default PaymentModal;