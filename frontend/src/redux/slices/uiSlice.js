import { createSlice } from '@reduxjs/toolkit';

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
    onConfirm: null,
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
      state.confirmDialog = {
        open: true,
        title: action.payload.title || 'Confirm',
        message: action.payload.message || 'Are you sure?',
        onConfirm: action.payload.onConfirm || null,
      };
    },
    hideConfirmDialog(state) {
      state.confirmDialog.open = false;
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
