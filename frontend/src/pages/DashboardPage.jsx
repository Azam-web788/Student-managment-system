import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import BookIcon from '@mui/icons-material/Book';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import api from '../services/api';
import { showSnackbar } from '../redux/slices/uiSlice';
import { useDispatch } from 'react-redux';

const StatCard = ({ title, value, icon, color, loading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={40} />
          ) : (
            <Typography variant="h3" fontWeight={700} color="text.primary">
              {value ?? '-'}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      dispatch(showSnackbar({ message: 'Failed to load dashboard stats', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'graduated': return 'info';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of your student management system
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => navigate('/students/new')}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          Add Student
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Students"
            value={stats?.totalStudents}
            icon={<PeopleIcon sx={{ color: '#fff' }} />}
            color="linear-gradient(135deg, #1976D2, #42A5F5)"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Students"
            value={stats?.activeStudents}
            icon={<TrendingUpIcon sx={{ color: '#fff' }} />}
            color="linear-gradient(135deg, #2E7D32, #4CAF50)"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Departments"
            value={stats?.totalDepartments}
            icon={<BusinessIcon sx={{ color: '#fff' }} />}
            color="linear-gradient(135deg, #7C4DFF, #B388FF)"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Courses"
            value={stats?.totalCourses}
            icon={<BookIcon sx={{ color: '#fff' }} />}
            color="linear-gradient(135deg, #ED6C02, #FF9800)"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Department Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Students by Department
              </Typography>
              {loading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={30} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : stats?.byDepartment?.length > 0 ? (
                <Box sx={{ mt: 1 }}>
                  {stats.byDepartment.map((dept) => (
                    <Box
                      key={dept.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                          {dept.code}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>
                          {dept.name}
                        </Typography>
                      </Box>
                      <Chip label={dept.count} size="small" color="primary" variant="outlined" />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No departments with students yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Student Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Student Status Distribution
              </Typography>
              {loading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={30} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : stats?.byStatus?.length > 0 ? (
                <Box sx={{ mt: 1 }}>
                  {stats.byStatus.map((item) => (
                    <Box
                      key={item.status}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Typography>
                      <Chip
                        label={item.count}
                        size="small"
                        color={getStatusColor(item.status)}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No student data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Students */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recently Added Students
                </Typography>
                <Button size="small" onClick={() => navigate('/students')}>
                  View All
                </Button>
              </Box>
              {loading ? (
                <Box>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : stats?.recentStudents?.length > 0 ? (
                <List disablePadding>
                  {stats.recentStudents.map((student) => (
                    <ListItem
                      key={student.id}
                      disableGutters
                      sx={{
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        px: 1,
                      }}
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={student.profile_image_url}
                          sx={{ bgcolor: 'primary.light' }}
                        >
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${student.first_name} ${student.last_name}`}
                        secondary={student.department_name || 'No Department'}
                        primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                        secondaryTypographyProps={{ fontSize: '0.8rem' }}
                      />
                      <Chip
                        label={student.status}
                        size="small"
                        color={getStatusColor(student.status)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No students added yet
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/students/new')}
                    sx={{ mt: 2 }}
                  >
                    Add First Student
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
