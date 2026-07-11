import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { hideConfirmDialog } from '../../redux/slices/uiSlice';

export default function ConfirmDialog() {
  const dispatch = useDispatch();
  const { open, title, message, onConfirm } = useSelector((state) => state.ui.confirmDialog);

  const handleClose = () => {
    dispatch(hideConfirmDialog());
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    dispatch(hideConfirmDialog());
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>{title || 'Confirm'}</DialogTitle>
      <DialogContent>
        <DialogContentText color="text.secondary">
          {message || 'Are you sure?'}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
