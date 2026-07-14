import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SchoolIcon from '@mui/icons-material/School';
import { loginUser, clearError } from '../redux/slices/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [role, setRole] = useState(0); // 0 = Student, 1 = Admin
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' || user.role === 'superadmin' ? '/dashboard' : '/student/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(formData));
  };

  return (
    <Box>
      <Tabs
        value={role}
        onChange={(_, newValue) => setRole(newValue)}
        variant="fullWidth"
        sx={{
          mb: 3,
          '& .MuiTab-root': { py: 1.5, fontWeight: 600, fontSize: '0.9rem' },
        }}
      >
        <Tab icon={<SchoolIcon sx={{ fontSize: 20 }} />} label="Student" iconPosition="start" />
        <Tab icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />} label="Admin" iconPosition="start" />
      </Tabs>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          autoFocus
          autoComplete="email"
          margin="normal"
          placeholder={role === 0 ? 'student@example.com' : 'admin@studentmanagement.com'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          required
          margin="normal"
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            mt: 3,
            mb: 2,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
            fontSize: '1rem',
            background: role === 0
              ? 'linear-gradient(135deg, #2E7D32, #4CAF50)'
              : 'linear-gradient(135deg, #1976D2, #7C4DFF)',
            '&:hover': {
              background: role === 0
                ? 'linear-gradient(135deg, #1B5E20, #388E3C)'
                : 'linear-gradient(135deg, #1565C0, #651FFF)',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : role === 0 ? (
            'Sign In as Student'
          ) : (
            'Sign In as Admin'
          )}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {role === 0
            ? 'Use the credentials sent to your email'
            : 'Admin login for system management'
          }
        </Typography>

        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Button
            component={RouterLink}
            to="/forgot-password"
            size="small"
            color="inherit"
            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
          >
            Forgot Password?
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
