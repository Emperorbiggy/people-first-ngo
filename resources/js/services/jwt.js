import axios from 'axios';

const API_URL = 'http://localhost:8000/api/';

class AuthService {
  login(email, password) {
    return axios
      .post(API_URL + 'auth/login', {
        email,
        password
      })
      .then(response => {
        if (response.data.authorisation.token) {
          localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
      });
  }

  logout() {
    localStorage.removeItem('user');
    return axios.post(API_URL + 'auth/logout', {}, {
      headers: this.getAuthHeader()
    }).then(response => {
      return response.data;
    });
  }

  register(name, email, password, password_confirmation) {
    return axios.post(API_URL + 'auth/register', {
      name,
      email,
      password,
      password_confirmation
    });
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  }

  getAuthHeader() {
    const user = this.getCurrentUser();
    if (user && user.authorisation.token) {
      return { Authorization: 'Bearer ' + user.authorisation.token };
    }
    return {};
  }

  refreshToken() {
    return axios.post(API_URL + 'auth/refresh', {}, {
      headers: this.getAuthHeader()
    }).then(response => {
      if (response.data.authorisation.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    });
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    return !!(user && user.authorisation.token);
  }
}

export default new AuthService();
