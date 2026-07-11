import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  students: [],
  currentStudent: null,
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  filters: {
    search: '',
    departmentId: '',
    courseId: '',
    status: '',
    gender: '',
    sortBy: 'created_at',
    sortOrder: 'DESC',
  },
};

export const fetchStudents = createAsyncThunk(
  'students/fetchAll',
  async (params, { rejectWithValue, getState }) => {
    try {
      const state = getState().students;
      const queryParams = { ...state.filters, ...params };
      const response = await api.getStudents(queryParams);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch students');
    }
  }
);

export const fetchStudentById = createAsyncThunk(
  'students/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.getStudent(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch student');
    }
  }
);

export const createStudent = createAsyncThunk(
  'students/create',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.createStudent(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create student');
    }
  }
);

export const updateStudent = createAsyncThunk(
  'students/update',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await api.updateStudent(id, formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update student');
    }
  }
);

export const deleteStudent = createAsyncThunk(
  'students/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.deleteStudent(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete student');
    }
  }
);

const studentSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
    setPage(state, action) {
      state.page = action.payload;
    },
    clearCurrentStudent(state) {
      state.currentStudent = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.students = action.payload.data;
        state.total = action.payload.pagination?.total || 0;
        state.page = action.payload.pagination?.page || 1;
        state.limit = action.payload.pagination?.limit || 10;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch by ID
      .addCase(fetchStudentById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStudent = action.payload;
      })
      .addCase(fetchStudentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createStudent.fulfilled, (state, action) => {
        state.students.unshift(action.payload);
        state.total += 1;
      })
      // Update
      .addCase(updateStudent.fulfilled, (state, action) => {
        const index = state.students.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.students[index] = action.payload;
        if (state.currentStudent?.id === action.payload.id) {
          state.currentStudent = action.payload;
        }
      })
      // Delete
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.students = state.students.filter((s) => s.id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { setFilters, resetFilters, setPage, clearCurrentStudent, clearError } = studentSlice.actions;
export default studentSlice.reducer;
