import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BookIcon from '@mui/icons-material/Book';
import { showSnackbar } from '../redux/slices/uiSlice';
import { useDispatch } from 'react-redux';
import api from '../services/api';

export default function CoursesPage() {
  const dispatch = useDispatch();
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', credits: '3', departmentId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, deptsRes] = await Promise.all([
        api.getCourses({ limit: 100 }),
        api.getAllDepartments(),
      ]);
      setCourses(coursesRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (err) {
      dispatch(showSnackbar({ message: 'Failed to load data', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (course = null) => {
    if (course) {
      setEditCourse(course);
      setForm({
        name: course.name,
        code: course.code,
        description: course.description || '',
        credits: String(course.credits || '3'),
        departmentId: course.department_id || '',
      });
    } else {
      setEditCourse(null);
      setForm({ name: '', code: '', description: '', credits: '3', departmentId: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.departmentId || !form.credits) {
      dispatch(showSnackbar({ message: 'All required fields must be filled', severity: 'error' }));
      return;
    }
    try {
      setSaving(true);
      if (editCourse) {
        await api.updateCourse(editCourse.id, form);
        dispatch(showSnackbar({ message: 'Course updated', severity: 'success' }));
      } else {
        await api.createCourse(form);
        dispatch(showSnackbar({ message: 'Course created', severity: 'success' }));
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      dispatch(showSnackbar({ message: err.message || 'Failed to save', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete course "${course.name}"?`)) return;
    try {
      await api.deleteCourse(course.id);
      dispatch(showSnackbar({ message: 'Course deleted', severity: 'success' }));
      loadData();
    } catch (err) {
      dispatch(showSnackbar({ message: 'Failed to delete', severity: 'error' }));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Courses</Typography>
          <Typography variant="body2" color="text.secondary">Manage academic courses</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Course</Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell>Students</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <BookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No courses yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id} hover>
                    <TableCell><Chip label={course.code} size="small" variant="outlined" /></TableCell>
                    <TableCell><Typography fontWeight={500}>{course.name}</Typography></TableCell>
                    <TableCell>{course.department_name || '-'}</TableCell>
                    <TableCell><Chip label={course.credits} size="small" /></TableCell>
                    <TableCell><Chip label={course.student_count || 0} size="small" color="primary" variant="outlined" /></TableCell>
                    <TableCell>
                      <Chip label={course.is_active ? 'Active' : 'Inactive'} size="small" color={course.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(course)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(course)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editCourse ? 'Edit Course' : 'Add Course'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Department</InputLabel>
            <Select value={form.departmentId} label="Department" onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <MenuItem value="">Select Department</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label="Course Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} margin="normal" required helperText="e.g., CS101, MATH201" />
          <TextField fullWidth label="Credits" type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} margin="normal" required inputProps={{ min: 1, max: 6 }} />
          <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} margin="normal" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
