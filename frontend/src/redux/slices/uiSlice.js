import { createSlice } from '@reduxjs/toolkit';

// Store callback references outside Redux to maintain serializability
const confirmCallbacks = new Map();
let callbackIdCounter = 0;

export function registerConfirmCallback(fn) {
  const id = ++callbackIdCounter;
  confirmCallbacks.set(id, fn);
  return id;
}

export function getConfirmCallback(id) {
  return confirmCallbacks.get(id);
}

export function removeConfirmCallback(id) {
  confirmCallbacks.delete(id);
}

export async function executeConfirmCallback(id) {
  const fn = confirmCallbacks.get(id);
  if (fn) {
    try {
      const result = await fn();
      return result;
    } finally {
      // Clean up after execution completes (or fails)
      confirmCallbacks.delete(id);
    }
  }
}

const initialState = {
  sidebarOpen: true,
  snackbar: {
    open: false,
    message: '',
    severity: 'success',
  },
  confirmDialog: {
    open: false,
    title: '',
    message: '',
    callbackId: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    showSnackbar(state, action) {
      state.snackbar = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity || 'success',
      };
    },
    hideSnackbar(state) {
      state.snackbar.open = false;
    },
    showConfirmDialog(state, action) {
      const callbackId = action.payload.onConfirm
        ? registerConfirmCallback(action.payload.onConfirm)
        : null;
      state.confirmDialog = {
        open: true,
        title: action.payload.title || 'Confirm',
        message: action.payload.message || 'Are you sure?',
        callbackId,
      };
    },
    hideConfirmDialog(state) {
      if (state.confirmDialog.callbackId) {
        removeConfirmCallback(state.confirmDialog.callbackId);
      }
      state.confirmDialog.open = false;
      state.confirmDialog.callbackId = null;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  showSnackbar,
  hideSnackbar,
  showConfirmDialog,
  hideConfirmDialog,
} = uiSlice.actions;
export default uiSlice.reducer;
