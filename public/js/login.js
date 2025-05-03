// DOM Elements
const authForm = document.getElementById('auth-form');
const registerForm = document.getElementById('register-form-data');
const toggleRegisterLink = document.getElementById('toggle-register');
const toggleLoginLink = document.getElementById('toggle-login');
const loginFormContainer = document.getElementById('login-form');
const registerFormContainer = document.getElementById('register-form');

// apakah user sudah login?
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/dashboard';
  }
});

// peralihan antara form login dan register
function toggleForms() {
  if (loginFormContainer.classList.contains('d-none')) {
    loginFormContainer.classList.remove('d-none');
    registerFormContainer.classList.add('d-none');
  } else {
    loginFormContainer.classList.add('d-none');
    registerFormContainer.classList.remove('d-none');
  }
}

// fungsi untuk menangani login
async function loginUser(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        faceDetected: true, 
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      
      // mengarahkan ke dashboard
      window.location.href = '/dashboard';
    } else {
      showAlert('Login Failed', data.message || 'Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Error', 'Failed to login. Please try again.');
  }
}

// fungsi untuk menangani registrasi
async function registerUser(userData) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      
      // mengarahkan ke dashboard
      window.location.href = '/dashboard';
    } else {
      showAlert('Registration Failed', data.message || 'Failed to create account');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showAlert('Error', 'Failed to register. Please try again.');
  }
}

// Helper function to show alert
function showAlert(title, message) {
  const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
  // document.getElementById('alertModalTitle').textContent = title;
  // document.getElementById('alertModalBody').textContent = message;
  alertModal.show();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // pengisian login form
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    loginUser(username, password);
  });

  // pengisian register form
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userData = {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      username: document.getElementById('reg-username').value,
      password: document.getElementById('reg-password').value,
    };
    registerUser(userData);
  });

  //peralihan antara form login dan register
  toggleRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms();
  });

  toggleLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms();
  });
});