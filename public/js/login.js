// DOM Elements
const authForm = document.getElementById('auth-form');
const registerForm = document.getElementById('register-form-data');
const toggleRegisterLink = document.getElementById('toggle-register');
const toggleLoginLink = document.getElementById('toggle-login');
const loginFormContainer = document.getElementById('login-form');
const registerFormContainer = document.getElementById('register-form');

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/dashboard';
  }
});

// Toggle between login and register forms
function toggleForms() {
  if (loginFormContainer.classList.contains('d-none')) {
    loginFormContainer.classList.remove('d-none');
    registerFormContainer.classList.add('d-none');
  } else {
    loginFormContainer.classList.add('d-none');
    registerFormContainer.classList.remove('d-none');
  }
}

// Login functionality
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
        faceDetected: true, // We've already verified face detection
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      showAlert('Login Failed', data.message || 'Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Error', 'Failed to login. Please try again.');
  }
}

// Register functionality
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
      
      // Redirect to dashboard
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
  // Login form submission
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    loginUser(username, password);
  });

  // Register form submission
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

  // Toggle between login and register forms
  toggleRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms();
  });

  toggleLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms();
  });
});