import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock any async dependencies
jest.mock('../services/encryptionService', () => ({
  initialize: jest.fn().mockResolvedValue({}),
}));

test('renders App content', async () => {
  render(<App />);
  await waitFor(() => {
    // Adjust expectation based on actual content, e.g., if it’s an initialization message
    expect(screen.getByText(/initializing healthmint/i)).toBeInTheDocument();
  }, { timeout: 10000 }); // Increase timeout if needed
});