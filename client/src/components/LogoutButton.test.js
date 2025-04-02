// src/components/LogoutButton.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import LogoutButton from './LogoutButton';
import useLogout from '../hooks/useLogout';

// Mock the useLogout hook
jest.mock('../hooks/useLogout', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Configure mock store
const mockStore = configureStore([]);

describe('LogoutButton', () => {
  let store;
  const logoutMock = jest.fn().mockResolvedValue(true);
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup useLogout mock
    useLogout.mockReturnValue({
      logout: logoutMock,
      loading: false,
      error: null,
    });
    
    // Create mock store
    store = mockStore({
      auth: { isAuthenticated: true },
      role: { role: 'patient' },
    });
  });
  
  it('should call logout when clicked', async () => {
    // Render the component
    const { getByText } = render(
      <Provider store={store}>
        <LogoutButton />
      </Provider>
    );
    
    // Find and click logout button
    const button = getByText('Logout');
    fireEvent.click(button);
    
    // Verify logout was called
    expect(logoutMock).toHaveBeenCalled();
  });
});