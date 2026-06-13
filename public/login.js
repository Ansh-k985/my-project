// Farmex authentication controller

const API_URL = window.location.protocol === 'file:' ? 'http://localhost:5001/api/auth' : '/api/auth';

// Switch active tabs between login and register
function switchAuthTab(type) {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const alertBox = document.getElementById('auth-alert');

  // Clear alerts
  alertBox.className = 'alert d-none';
  alertBox.innerText = '';

  if (type === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.remove('d-none');
    formSignup.classList.add('d-none');
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.remove('d-none');
    formLogin.classList.add('d-none');
  }
}

// Display feedback alert
function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('auth-alert');
  alertBox.className = `alert alert-${type} d-block`;
  alertBox.innerText = message;
}

// Handle login submissions
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      // Save details to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showAlert('Login successful! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === 'Farmer') {
          window.location.href = 'farmer.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1000);
    } else {
      showAlert(data.message || 'Login failed. Please check your credentials.');
    }
  } catch (err) {
    console.error('Login submit error:', err);
    showAlert('Server connection error. Please make sure the server is active.');
  }
}

// Handle signup submissions
async function handleSignup(event) {
  event.preventDefault();

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const phoneNumber = document.getElementById('signup-phone').value.trim();
  const role = document.getElementById('signup-role').value;
  const city = document.getElementById('signup-city').value.trim();
  const pincode = document.getElementById('signup-pincode').value.trim();

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        phoneNumber,
        city,
        pincode
      })
    });

    const data = await response.json();

    if (data.success) {
      // Save details to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showAlert('Account created successfully! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === 'Farmer') {
          window.location.href = 'farmer.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1000);
    } else {
      showAlert(data.message || 'Signup failed. Please try again.');
    }
  } catch (err) {
    console.error('Signup submit error:', err);
    showAlert('Server connection error. Please make sure the server is active.');
  }
}

// Auto check redirect if already logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    const user = JSON.parse(userStr);
    if (user.role === 'Farmer') {
      window.location.href = 'farmer.html';
    } else {
      window.location.href = 'index.html';
    }
  }
});
