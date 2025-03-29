// client/src/components/ui/index.js
// Export all UI components to make imports cleaner

export { default as LoadingSpinner } from './LoadingSpinner.js';
export { default as FocusTrap } from './FocusTrap.js';
export { default as ErrorDisplay } from './ErrorDisplay.js';
export { default as NotificationsContainer } from './NotificationsContainer.js';

// Re-export styled components 
export { 
  GlassContainer, 
  ConnectButton, 
  FormInput, 
  FormSelect,
  Card,
  Button
} from '../StyledComponents.js';