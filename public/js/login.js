// DOM Elements
const authForm = document.getElementById('auth-form');
const registerForm = document.getElementById('register-form-data');
const toggleRegisterLink = document.getElementById('toggle-register');
const toggleLoginLink = document.getElementById('toggle-login');
const loginFormContainer = document.getElementById('login-form');
const registerFormContainer = document.getElementById('register-form');
let alertModal;

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/dashboard';
  }
  
  // Initialize Bootstrap Modal
  alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
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

// Handle login
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

// Handle registration
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
  // Set alert content
  document.getElementById('alertModalTitle').textContent = title;
  document.getElementById('modal-message').textContent = message;
  
  // Set icon based on alert type
  const iconElement = document.getElementById('modal-icon');
  let iconHTML = '';
  
  if (title.toLowerCase().includes('success')) {
    iconHTML = `<svg width="50" height="50" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#2ecc71" stroke-width="5" />
      <path d="M30,50 L45,65 L70,35" stroke="#2ecc71" stroke-width="8" fill="none" />
    </svg>`;
  } else if (title.toLowerCase().includes('error') || title.toLowerCase().includes('failed')) {
    iconHTML = `<svg width="50" height="50" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e74c3c" stroke-width="5" />
      <line x1="35" y1="35" x2="65" y2="65" stroke="#e74c3c" stroke-width="8" />
      <line x1="35" y1="65" x2="65" y2="35" stroke="#e74c3c" stroke-width="8" />
    </svg>`;
  } else {
    iconHTML = `<svg width="50" height="50" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#3498db" stroke-width="5" />
      <text x="50" y="65" font-size="60" text-anchor="middle" fill="#3498db">i</text>
    </svg>`;
  }
  
  iconElement.innerHTML = iconHTML;
  
  // Hide retry button for login alerts
  document.getElementById('retry-face-detection').classList.add('d-none');
  
  // Show modal
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