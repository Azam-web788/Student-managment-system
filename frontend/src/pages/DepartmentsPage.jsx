import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import { showSnackbar } from '../redux/slices/uiSlice';
import { useDispatch } from 'react-redux';
import api from '../services/api';

export default function DepartmentsPage() {
  const dispatch = useDispatch();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.getDepartments({ limit: 100 });
      setDepartments(res.data || []);
    } catch (err) {
      dispatch(showSnackbar({ message: 'Failed to load departments', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (dept = null) => {
    if (dept) {
      setEditDept(dept);
      setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    } else {
      setEditDept(null);
      setForm({ name: '', code: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      dispatch(showSnackbar({ message: 'Name and code are required', severity: 'error' }));
      return;
    }
    try {
      setSaving(true);
      if (editDept) {
        await api.updateDepartment(editDept.id, form);
        dispatch(showSnackbar({ message: 'Department updated', severity: 'success' }));
      } else {
        await api.createDepartment(form);
        dispatch(showSnackbar({ message: 'Department created', severity: 'success' }));
      }
      setDialogOpen(false);
      loadDepartments();
    } catch (err) {
      dispatch(showSnackbar({ message: err.message || 'Failed to save', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await api.deleteDepartment(dept.id);
      dispatch(showSnackbar({ message: 'Department deleted', severity: 'success' }));
      loadDepartments();
    } catch (err) {
      dispatch(showSnackbar({ message: 'Failed to delete', severity: 'error' }));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Departments</Typography>
          <Typography variant="body2" color="text.secondary">Manage academic departments</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Department
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Students</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No departments yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id} hover>
                    <TableCell><Chip label={dept.code} size="small" variant="outlined" /></TableCell>
                    <TableCell><Typography fontWeight={500}>{dept.name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{dept.description || '-'}</Typography></TableCell>
                    <TableCell><Chip label={dept.student_count || 0} size="small" color="primary" variant="outlined" /></TableCell>
                    <TableCell>
                      <Chip label={dept.is_active ? 'Active' : 'Inactive'} size="small" color={dept.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(dept)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(dept)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Department Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} margin="normal" required helperText="Short code, e.g., CS, MATH" />
          <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} margin="normal" multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
