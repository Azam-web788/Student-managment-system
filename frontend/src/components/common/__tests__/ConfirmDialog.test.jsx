import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer, { registerConfirmCallback, removeConfirmCallback } from '../../../redux/slices/uiSlice';
import ConfirmDialog from '../ConfirmDialog';

function createStore(overrides = {}) {
  return configureStore({
    reducer: { ui: uiReducer },
    preloadedState: {
      ui: {
        sidebarOpen: false,
        snackbar: { open: false, message: '', severity: 'success' },
        confirmDialog: {
          open: true,
          title: 'Confirm Delete',
          message: 'Are you sure you want to delete this item?',
          callbackId: null,
          ...overrides,
        },
      },
    },
  });
}

function renderDialog(storeOverrides = {}) {
  const store = createStore(storeOverrides);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ConfirmDialog />
      </Provider>,
    ),
  };
}

describe('ConfirmDialog', () => {
  it('renders the dialog with title and message', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
    });
  });

  it('renders Cancel and Confirm buttons', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  it('does not render when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm and hides dialog when Confirm is clicked', async () => {
    const onConfirm = vi.fn();
    // Register the callback in the registry and pass its ID via the store
    const callbackId = registerConfirmCallback(onConfirm);
    renderDialog({ callbackId });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Clean up after the test
    removeConfirmCallback(callbackId);
  });

  it('hides the dialog when Cancel is clicked', async () => {
    const { store } = renderDialog();

    // Dialog should be visible initially
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    });

    // After cancel, the store dispatches hideConfirmDialog which sets open to false
    await waitFor(() => {
      const updatedState = store.getState().ui.confirmDialog;
      expect(updatedState.open).toBe(false);
    });
  });
});
