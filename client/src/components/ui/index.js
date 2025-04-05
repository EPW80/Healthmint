// client/src/components/ui/index.js
// This file exports various UI components and styled components for use in the application.
// It serves as a central point for importing and exporting components, making it easier to manage and maintain the codebase.

export { default as LoadingSpinner } from "./LoadingSpinner.js";
export { default as FocusTrap } from "./FocusTrap.js";
export { default as ErrorDisplay } from "./ErrorDisplay.js";
export { default as NotificationsContainer } from "./NotificationsContainer.js";

// Re-export styled components
export {
  GlassContainer,
  ConnectButton,
  FormInput,
  FormSelect,
  Card,
  Button,
} from "../StyledComponents.js";
