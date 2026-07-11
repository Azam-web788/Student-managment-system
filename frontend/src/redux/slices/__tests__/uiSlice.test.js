import { describe, it, expect } from 'vitest';
import uiReducer, {
  toggleSidebar,
  setSidebarOpen,
  showSnackbar,
  hideSnackbar,
  showConfirmDialog,
  hideConfirmDialog,
} from '../uiSlice';

describe('uiSlice', () => {
  // ── Initial State ──────────────────────────────────

  describe('initial state', () => {
    it('should return the initial state when no state is given', () => {
      const state = uiReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual({
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
      });
    });

    it('should start with sidebar open', () => {
      const state = uiReducer(undefined, { type: '@@INIT' });
      expect(state.sidebarOpen).toBe(true);
    });

    it('should start with snackbar closed', () => {
      const state = uiReducer(undefined, { type: '@@INIT' });
      expect(state.snackbar.open).toBe(false);
      expect(state.snackbar.message).toBe('');
      expect(state.snackbar.severity).toBe('success');
    });

    it('should start with confirm dialog closed', () => {
      const state = uiReducer(undefined, { type: '@@INIT' });
      expect(state.confirmDialog.open).toBe(false);
      expect(state.confirmDialog.title).toBe('');
      expect(state.confirmDialog.message).toBe('');
      expect(state.confirmDialog.onConfirm).toBeNull();
    });
  });

  // ── Sidebar Reducers ───────────────────────────────

  describe('toggleSidebar', () => {
    it('should toggle sidebar from true to false', () => {
      const prevState = {
        sidebarOpen: true,
        snackbar: { open: false, message: '', severity: 'success' },
        confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      };
      const state = uiReducer(prevState, toggleSidebar());
      expect(state.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar from false to true', () => {
      const prevState = {
        sidebarOpen: false,
        snackbar: { open: false, message: '', severity: 'success' },
        confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      };
      const state = uiReducer(prevState, toggleSidebar());
      expect(state.sidebarOpen).toBe(true);
    });

    it('should not affect other state slices', () => {
      const prevState = {
        sidebarOpen: true,
        snackbar: { open: true, message: 'Hello', severity: 'info' },
        confirmDialog: { open: true, title: 'Sure?', message: 'Go?', onConfirm: null },
      };
      const state = uiReducer(prevState, toggleSidebar());
      expect(state.sidebarOpen).toBe(false);
      expect(state.snackbar).toEqual(prevState.snackbar);
      expect(state.confirmDialog).toEqual(prevState.confirmDialog);
    });
  });

  describe('setSidebarOpen', () => {
    it('should set sidebar open to false', () => {
      const state = uiReducer(undefined, setSidebarOpen(false));
      expect(state.sidebarOpen).toBe(false);
    });

    it('should set sidebar open to true', () => {
      const prevState = {
        sidebarOpen: false,
        snackbar: { open: false, message: '', severity: 'success' },
        confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      };
      const state = uiReducer(prevState, setSidebarOpen(true));
      expect(state.sidebarOpen).toBe(true);
    });
  });

  // ── Snackbar Reducers ──────────────────────────────

  describe('showSnackbar', () => {
    it('should open snackbar with message and default severity', () => {
      const state = uiReducer(undefined, showSnackbar({ message: 'Operation successful' }));
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Operation successful');
      expect(state.snackbar.severity).toBe('success');
    });

    it('should open snackbar with custom severity', () => {
      const state = uiReducer(
        undefined,
        showSnackbar({ message: 'Something went wrong', severity: 'error' }),
      );
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Something went wrong');
      expect(state.snackbar.severity).toBe('error');
    });

    it('should accept warning severity', () => {
      const state = uiReducer(
        undefined,
        showSnackbar({ message: 'Check your input', severity: 'warning' }),
      );
      expect(state.snackbar.severity).toBe('warning');
    });

    it('should accept info severity', () => {
      const state = uiReducer(
        undefined,
        showSnackbar({ message: 'Did you know?', severity: 'info' }),
      );
      expect(state.snackbar.severity).toBe('info');
    });
  });

  describe('hideSnackbar', () => {
    it('should close the snackbar', () => {
      const prevState = {
        sidebarOpen: true,
        snackbar: { open: true, message: 'Hi', severity: 'warning' },
        confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      };
      const state = uiReducer(prevState, hideSnackbar());
      expect(state.snackbar.open).toBe(false);
    });

    it('should preserve message and severity after hiding', () => {
      const prevState = {
        sidebarOpen: true,
        snackbar: { open: true, message: 'Keep me', severity: 'error' },
        confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      };
      const state = uiReducer(prevState, hideSnackbar());
      expect(state.snackbar.open).toBe(false);
      expect(state.snackbar.message).toBe('Keep me');
      expect(state.snackbar.severity).toBe('error');
    });
  });

  // ── Confirm Dialog Reducers ────────────────────────

  describe('showConfirmDialog', () => {
    it('should open confirm dialog with title and message', () => {
      const state = uiReducer(
        undefined,
        showConfirmDialog({ title: 'Delete?', message: 'Are you sure you want to delete?' }),
      );
      expect(state.confirmDialog.open).toBe(true);
      expect(state.confirmDialog.title).toBe('Delete?');
      expect(state.confirmDialog.message).toBe('Are you sure you want to delete?');
    });

    it('should use default title and message when not provided', () => {
      const state = uiReducer(undefined, showConfirmDialog({}));
      expect(state.confirmDialog.open).toBe(true);
      expect(state.confirmDialog.title).toBe('Confirm');
      expect(state.confirmDialog.message).toBe('Are you sure?');
    });

    it('should store onConfirm callback', () => {
      const onConfirm = () => 'confirmed';
      const state = uiReducer(
        undefined,
        showConfirmDialog({ title: 'Action', message: 'Proceed?', onConfirm }),
      );
      expect(state.confirmDialog.open).toBe(true);
      expect(state.confirmDialog.onConfirm).toBe(onConfirm);
    });

    it('should set onConfirm to null when not provided', () => {
      const state = uiReducer(
        undefined,
        showConfirmDialog({ title: 'Test', message: 'Go?' }),
      );
      expect(state.confirmDialog.onConfirm).toBeNull();
    });
  });

  describe('hideConfirmDialog', () => {
    it('should close the confirm dialog', () => {
      const prevState = {
        sidebarOpen: true,
        snackbar: { open: false, message: '', severity: 'success' },
        confirmDialog: {
          open: true,
          title: 'Delete?',
          message: 'Proceed?',
          onConfirm: () => {},
        },
      };
      const state = uiReducer(prevState, hideConfirmDialog());
      expect(state.confirmDialog.open).toBe(false);
    });

    it('should preserve title, message and onConfirm after hiding', () => {
      const onConfirm = () => {};
      const prevState = {
        sidebarOpen: true,
        snackbar: { open: false, message: '', severity: 'success' },
        confirmDialog: {
          open: true,
          title: 'Delete?',
          message: 'Proceed?',
          onConfirm,
        },
      };
      const state = uiReducer(prevState, hideConfirmDialog());
      expect(state.confirmDialog.open).toBe(false);
      expect(state.confirmDialog.title).toBe('Delete?');
      expect(state.confirmDialog.message).toBe('Proceed?');
      expect(state.confirmDialog.onConfirm).toBe(onConfirm);
    });
  });

  // ── Combined / Edge Cases ──────────────────────────

  describe('combined actions', () => {
    it('should handle multiple sequential actions', () => {
      let state = uiReducer(undefined, { type: '@@INIT' });

      state = uiReducer(state, toggleSidebar());
      expect(state.sidebarOpen).toBe(false);

      state = uiReducer(state, showSnackbar({ message: 'Welcome', severity: 'info' }));
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Welcome');

      state = uiReducer(state, showConfirmDialog({ title: 'Logout?', message: 'Leave?' }));
      expect(state.confirmDialog.open).toBe(true);
      expect(state.confirmDialog.title).toBe('Logout?');

      state = uiReducer(state, hideConfirmDialog());
      expect(state.confirmDialog.open).toBe(false);

      state = uiReducer(state, hideSnackbar());
      expect(state.snackbar.open).toBe(false);

      state = uiReducer(state, toggleSidebar());
      expect(state.sidebarOpen).toBe(true);
    });
  });
});
