import axios from 'axios';
import AuthService from './jwt';

const API_URL = 'http://localhost:8000/api/';

class ApiService {
  // NGO Application methods
  getApplications() {
    return axios.get(API_URL + 'ngo/applications', {
      headers: AuthService.getAuthHeader()
    });
  }

  getApplication(id) {
    return axios.get(API_URL + `ngo/applications/${id}`, {
      headers: AuthService.getAuthHeader()
    });
  }

  submitApplication(formData) {
    // Public endpoint - no auth required
    return axios.post(API_URL + 'public/applications', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  submitApplicationAuth(formData) {
    // Authenticated endpoint
    return axios.post(API_URL + 'ngo/applications', formData, {
      headers: {
        ...AuthService.getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // User profile methods
  getProfile() {
    return axios.get(API_URL + 'auth/me', {
      headers: AuthService.getAuthHeader()
    });
  }

  updateProfile(userData) {
    return axios.put(API_URL + 'auth/profile', userData, {
      headers: AuthService.getAuthHeader()
    });
  }

  // Utility method to handle API errors
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - token expired or invalid
        AuthService.logout();
        window.location.href = '/login';
        return { message: 'Session expired. Please login again.' };
      }
      
      if (status === 422) {
        // Validation errors
        return { 
          message: 'Validation failed', 
          errors: data.errors || data.message 
        };
      }
      
      if (status === 404) {
        return { message: 'Resource not found' };
      }
      
      if (status === 500) {
        return { message: 'Server error. Please try again later.' };
      }
      
      return { message: data.message || 'An error occurred' };
    } else if (error.request) {
      // Network error
      return { message: 'Network error. Please check your connection.' };
    } else {
      // Other error
      return { message: 'An unexpected error occurred.' };
    }
  }

  // File upload helper
  uploadFile(file, fieldName) {
    const formData = new FormData();
    formData.append(fieldName, file);
    return formData;
  }
}

export default new ApiService();
