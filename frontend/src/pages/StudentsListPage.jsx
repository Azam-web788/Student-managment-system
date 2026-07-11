import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';

import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import { fetchStudents, deleteStudent, setFilters, setPage } from '../redux/slices/studentSlice';
import { showSnackbar, showConfirmDialog } from '../redux/slices/uiSlice';
import api from '../services/api';

const statusColors = {
  active: 'success',
  inactive: 'warning',
  graduated: 'info',
  suspended: 'error',
};

export default function StudentsListPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { students, total, page, limit, loading, filters } = useSelector((state) => state.students);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [departments, setDepartments] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchStudents());
    loadDepartments();
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({ search: searchInput }));
      dispatch(fetchStudents({ search: searchInput }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch]);

  const loadDepartments = async () => {
    try {
      const res = await api.getAllDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      // ignore
    }
  };

  const handleChangePage = (event, newPage) => {
    dispatch(setPage(newPage + 1));
    dispatch(fetchStudents({ page: newPage + 1 }));
  };

  const handleChangeRowsPerPage = (event) => {
    dispatch(setPage(1));
    dispatch(fetchStudents({ limit: parseInt(event.target.value, 10), page: 1 }));
  };

  const handleSort = (column) => {
    const order = filters.sortBy === column && filters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    dispatch(setFilters({ sortBy: column, sortOrder: order }));
    dispatch(fetchStudents({ sortBy: column, sortOrder: order }));
  };

  const handleFilterChange = (field, value) => {
    dispatch(setFilters({ [field]: value }));
    dispatch(fetchStudents({ [field]: value, page: 1 }));
  };

  const handleDelete = async (student) => {
    dispatch(showConfirmDialog({
      title: 'Delete Student',
      message: `Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await dispatch(deleteStudent(student.id)).unwrap();
          dispatch(showSnackbar({ message: 'Student deleted successfully', severity: 'success' }));
          dispatch(fetchStudents());
        } catch (err) {
          dispatch(showSnackbar({ message: err || 'Failed to delete student', severity: 'error' }));
        }
      },
    }));
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Students</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all students in the system
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/students/new')}>
          Add Student
        </Button>
      </Box>

      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search by name, ID, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 300px' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
          >
            Filters
          </Button>
        </Box>

        {showFilters && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.departmentId}
                  label="Department"
                  onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="graduated">Graduated</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={filters.gender}
                  label="Gender"
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={filters.sortBy === 'student_id'}
                    direction={filters.sortBy === 'student_id' ? filters.sortOrder.toLowerCase() : 'asc'}
                    onClick={() => handleSort('student_id')}
                  >
                    Student ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={filters.sortBy === 'status'}
                    direction={filters.sortBy === 'status' ? filters.sortOrder.toLowerCase() : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No students found
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/students/new')}>
                      Add First Student
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow
                    key={student.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={student.profile_image_url}
                          sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}
                        >
                          {getInitials(student.first_name, student.last_name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {student.first_name} {student.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {student.student_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{student.department_name || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{student.course_name || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.status}
                        size="small"
                        color={statusColors[student.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/students/${student.id}`);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/students/${student.id}/edit`);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(student);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={handleChangePage}
          rowsPerPage={limit}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>
    </Box>
  );
}
