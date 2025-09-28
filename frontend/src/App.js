import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode.react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, isStudent = false) => {
    const endpoint = isStudent ? '/auth/student-login' : '/auth/login';
    const response = await axios.post(`${API}${endpoint}`, credentials);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Layout Component
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" 
         style={{
           backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
           backgroundSize: '60px 60px'
         }}>
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">QR Attendance System</h1>
              {user && (
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {user.role.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user.username}</span>
                <button 
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-4 mt-12">
        <p>Copyright @2025 NetCraftStudio</p>
      </footer>
    </div>
  );
};

// Login Component
const Login = () => {
  const [isStudent, setIsStudent] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '', roll_no: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(credentials, isStudent);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8"
         style={{
           backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
           backgroundSize: '60px 60px'
         }}>
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">QR Attendance</h2>
            <p className="text-gray-600">Sign in to your account</p>
          </div>
          
          <div className="mt-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsStudent(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !isStudent ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Staff Login
              </button>
              <button
                type="button"
                onClick={() => setIsStudent(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  isStudent ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Student Login
              </button>
            </div>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            {!isStudent ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={credentials.roll_no}
                    onChange={(e) => setCredentials({...credentials, roll_no: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your roll number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {!isStudent && (
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>Demo Credentials:</p>
              <p><strong>Super Admin:</strong> admin@school.com / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const getRoleBasedContent = () => {
    switch (user.role) {
      case 'superadmin':
        return <SuperAdminDashboard data={dashboardData} />;
      case 'subadmin':
        return <SubAdminDashboard data={dashboardData} />;
      case 'class_teacher':
        return <ClassTeacherDashboard data={dashboardData} />;
      case 'sub_teacher':
        return <SubTeacherDashboard data={dashboardData} />;
      case 'student':
        return <StudentDashboard data={dashboardData} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return <Layout>{getRoleBasedContent()}</Layout>;
};

// Super Admin Dashboard
const SuperAdminDashboard = ({ data }) => {
  const [departments, setDepartments] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [newSubAdmin, setNewSubAdmin] = useState({
    email: '', username: '', password: '', department_id: '', working_time: ''
  });

  useEffect(() => {
    fetchDepartments();
    fetchSubAdmins();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchSubAdmins = async () => {
    try {
      const response = await axios.get(`${API}/auth/users?role=subadmin`);
      setSubAdmins(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sub-admins:', error);
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/departments?name=${newDepartment}`);
      setNewDepartment('');
      fetchDepartments();
    } catch (error) {
      console.error('Failed to create department:', error);
    }
  };

  const createSubAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, { ...newSubAdmin, role: 'subadmin' });
      setNewSubAdmin({ email: '', username: '', password: '', department_id: '', working_time: '' });
      fetchSubAdmins();
    } catch (error) {
      console.error('Failed to create sub-admin:', error);
    }
  };

  return (
    <div className="space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Super Admin Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Total Students</h3>
            <p className="text-3xl font-bold text-blue-600">{data?.total_students || 0}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Total Classes</h3>
            <p className="text-3xl font-bold text-green-600">{data?.total_classes || 0}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">Today's Attendance</h3>
            <p className="text-3xl font-bold text-purple-600">{data?.today_attendance || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Departments</h3>
          
          <form onSubmit={createDepartment} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Department name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </form>
          
          <div className="space-y-2">
            {departments.map((dept) => (
              <div key={dept.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{dept.name}</p>
                <p className="text-sm text-gray-500">Created: {new Date(dept.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-Admins */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Sub-Admins</h3>
          
          <form onSubmit={createSubAdmin} className="space-y-3 mb-4">
            <input
              type="email"
              value={newSubAdmin.email}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, email: e.target.value})}
              placeholder="Email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              value={newSubAdmin.username}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, username: e.target.value})}
              placeholder="Username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              value={newSubAdmin.password}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, password: e.target.value})}
              placeholder="Password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={newSubAdmin.department_id}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, department_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newSubAdmin.working_time}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, working_time: e.target.value})}
              placeholder="Working Time (e.g., 9 AM - 5 PM)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              Add Sub-Admin
            </button>
          </form>
          
          <div className="space-y-2">
            {subAdmins.map((admin) => (
              <div key={admin.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{admin.username}</p>
                <p className="text-sm text-gray-500">{admin.email}</p>
                <p className="text-sm text-gray-500">{admin.working_time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub Admin Dashboard
const SubAdminDashboard = ({ data }) => {
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [newClass, setNewClass] = useState({ name: '', department_id: '' });
  const [newTeacher, setNewTeacher] = useState({
    email: '', username: '', password: '', role: 'class_teacher', class_id: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchDepartments();
    fetchTeachers();
    fetchSchedules();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/auth/users?role=teacher`);
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/schedules`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const createClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/classes?name=${newClass.name}&department_id=${newClass.department_id}`);
      setNewClass({ name: '', department_id: '' });
      fetchClasses();
    } catch (error) {
      console.error('Failed to create class:', error);
    }
  };

  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, newTeacher);
      setNewTeacher({ email: '', username: '', password: '', role: 'class_teacher', class_id: '' });
      fetchTeachers();
    } catch (error) {
      console.error('Failed to create teacher:', error);
    }
  };

  return (
    <div className="space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Sub-Admin Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Classes Management */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Classes</h3>
            
            <form onSubmit={createClass} className="space-y-3">
              <input
                type="text"
                value={newClass.name}
                onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                placeholder="Class name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={newClass.department_id}
                onChange={(e) => setNewClass({...newClass, department_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Add Class
              </button>
            </form>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {classes.map((cls) => (
                <div key={cls.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{cls.name}</p>
                  <p className="text-sm text-gray-500">Department: {departments.find(d => d.id === cls.department_id)?.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teachers Management */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Teachers</h3>
            
            <form onSubmit={createTeacher} className="space-y-3">
              <input
                type="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                value={newTeacher.username}
                onChange={(e) => setNewTeacher({...newTeacher, username: e.target.value})}
                placeholder="Username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})}
                placeholder="Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={newTeacher.role}
                onChange={(e) => setNewTeacher({...newTeacher, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="class_teacher">Class Teacher</option>
                <option value="sub_teacher">Sub Teacher</option>
              </select>
              {newTeacher.role === 'class_teacher' && (
                <select
                  value={newTeacher.class_id}
                  onChange={(e) => setNewTeacher({...newTeacher, class_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Assign Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
              >
                Add Teacher
              </button>
            </form>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{teacher.username}</p>
                  <p className="text-sm text-gray-500">{teacher.email}</p>
                  <p className="text-sm text-gray-500">{teacher.role.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Class Teacher Dashboard
const ClassTeacherDashboard = ({ data }) => {
  const [students, setStudents] = useState([]);
  const [qrSession, setQrSession] = useState(null);
  const [attendanceReports, setAttendanceReports] = useState([]);
  const [newStudent, setNewStudent] = useState({ username: '', email: '', roll_no: '' });
  const [qrForm, setQrForm] = useState({ subject: '' });

  useEffect(() => {
    fetchStudents();
    fetchAttendanceReports();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchAttendanceReports = async () => {
    try {
      const response = await axios.get(`${API}/reports/attendance`);
      setAttendanceReports(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance reports:', error);
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/students`, { ...newStudent, password: 'temp123' });
      setNewStudent({ username: '', email: '', roll_no: '' });
      fetchStudents();
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const generateQR = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/qr/generate?class_id=${data.class_id}&subject=${qrForm.subject}`);
      setQrSession(response.data);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  return (
    <div className="space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Class Teacher Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Total Students</h3>
            <p className="text-3xl font-bold text-blue-600">{students.length}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Today's Attendance</h3>
            <p className="text-3xl font-bold text-green-600">{data?.today_attendance_marked || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Generation */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Generate QR Code</h3>
          
          <form onSubmit={generateQR} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={qrForm.subject}
                onChange={(e) => setQrForm({...qrForm, subject: e.target.value})}
                placeholder="Enter subject name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              Generate QR Code
            </button>
          </form>
          
          {qrSession && (
            <div className="mt-6 text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img src={qrSession.qr_code_base64} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Valid until: {new Date(qrSession.expires_at).toLocaleTimeString()}
              </p>
              <p className="text-sm text-green-600 font-medium">
                Subject: {qrForm.subject}
              </p>
            </div>
          )}
        </div>

        {/* Student Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Students</h3>
          
          <form onSubmit={addStudent} className="space-y-3 mb-4">
            <input
              type="text"
              value={newStudent.username}
              onChange={(e) => setNewStudent({...newStudent, username: e.target.value})}
              placeholder="Student Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
              placeholder="Email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              value={newStudent.roll_no}
              onChange={(e) => setNewStudent({...newStudent, roll_no: e.target.value})}
              placeholder="Roll Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
            >
              Add Student
            </button>
          </form>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {students.map((student) => (
              <div key={student.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{student.username}</p>
                <p className="text-sm text-gray-500">Roll: {student.roll_no}</p>
                <p className="text-sm text-gray-500">{student.email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Reports */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Attendance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceReports.slice(0, 10).map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.student_name}</div>
                      <div className="text-sm text-gray-500">Roll: {record.student_roll_no}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Sub Teacher Dashboard
const SubTeacherDashboard = ({ data }) => {
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [qrSession, setQrSession] = useState(null);
  
  useEffect(() => {
    fetchSchedules();
    fetchStudents();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { user } = useAuth();
      const response = await axios.get(`${API}/schedules?teacher_id=${user.id}`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const generateQR = async (classId, subject) => {
    try {
      const response = await axios.post(`${API}/qr/generate?class_id=${classId}&subject=${subject}`);
      setQrSession(response.data);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  return (
    <div className="space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Sub-Teacher Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Assigned Schedules</h3>
            <p className="text-3xl font-bold text-blue-600">{schedules.length}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Today's Attendance</h3>
            <p className="text-3xl font-bold text-green-600">{data?.today_attendance_marked || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedules */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">My Schedule</h3>
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{schedule.subject}</h4>
                    <p className="text-sm text-gray-600">{schedule.day_of_week}</p>
                    <p className="text-sm text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                  </div>
                  <button
                    onClick={() => generateQR(schedule.class_id, schedule.subject)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Generate QR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">QR Code</h3>
          {qrSession ? (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img src={qrSession.qr_code_base64} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Valid until: {new Date(qrSession.expires_at).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <p>Click "Generate QR" on a schedule to create attendance QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Student Dashboard (Mobile-Optimized)
const StudentDashboard = ({ data }) => {
  const [scanResult, setScanResult] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1); // 1: scan, 2: otp

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  const fetchAttendanceHistory = async () => {
    try {
      const response = await axios.get(`${API}/reports/attendance`);
      setAttendanceHistory(response.data.filter(record => record.student_id === data.user?.id));
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
    }
  };

  const handleQRScan = async () => {
    if (!scanResult) {
      setMessage('Please enter QR code data');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Extract session ID from QR data (format: attendance:session_id:class_id:teacher_id)
      const parts = scanResult.split(':');
      if (parts.length !== 4 || parts[0] !== 'attendance') {
        throw new Error('Invalid QR code format');
      }
      
      const sessionId = parts[1];
      await axios.post(`${API}/attendance/scan?qr_session_id=${sessionId}`);
      
      setMessage('OTP sent to your email! Please check and enter below.');
      setStep(2);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async () => {
    if (!otpCode) {
      setMessage('Please enter OTP code');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const parts = scanResult.split(':');
      const sessionId = parts[1];
      
      await axios.post(`${API}/attendance/verify`, {
        qr_session_id: sessionId,
        otp: otpCode
      });
      
      setMessage('✅ Attendance marked successfully!');
      setScanResult('');
      setOtpCode('');
      setStep(1);
      fetchAttendanceHistory();
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-4 max-w-md mx-auto">
      {/* Student Dashboard Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Dashboard</h2>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900">Today's Attendance</h3>
          <p className="text-3xl font-bold text-blue-600">{data?.today_attendance || 0}</p>
        </div>
      </div>

      {/* QR Scanner */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">📱 Mark Attendance</h3>
        
        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan QR Code or Enter Code Manually
              </label>
              <textarea
                value={scanResult}
                onChange={(e) => setScanResult(e.target.value)}
                placeholder="Paste QR code data here or use camera to scan"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
            </div>
            
            <button
              onClick={handleQRScan}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? '⏳ Processing...' : '📷 Scan QR Code'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP from Email
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setStep(1);
                  setMessage('');
                  setOtpCode('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleOTPVerify}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        )}
        
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
            message.includes('⏳') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">📋 Recent Attendance</h3>
        
        <div className="space-y-3">
          {attendanceHistory.slice(0, 5).map((record) => (
            <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{record.subject}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(record.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Present
                </span>
              </div>
            </div>
          ))}
          
          {attendanceHistory.length === 0 && (
            <div className="text-center text-gray-500 py-6">
              <p>No attendance records yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;