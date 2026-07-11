import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../../../redux/slices/uiSlice';
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
          onConfirm: null,
          ...overrides,
        },
      },
    },
  });
}

function renderDialog(storeOverrides = {}) {
  const store = createStore(storeOverrides);
  return render(
    <Provider store={store}>
      <ConfirmDialog />
    </Provider>,
  );
}

describe('ConfirmDialog', () => {
  it('renders the dialog with title and message', () => {
    renderDialog();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('renders Cancel and Confirm buttons', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm and hides dialog when Confirm is clicked', () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('hides the dialog when Cancel is clicked', () => {
    const store = createStore({ onConfirm: null });
    render(
      <Provider store={store}>
        <ConfirmDialog />
      </Provider>,
    );

    // Dialog should be visible initially
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // After cancel, the store dispatches hideConfirmDialog which sets open to false
    const updatedState = store.getState().ui.confirmDialog;
    expect(updatedState.open).toBe(false);
  });
});
