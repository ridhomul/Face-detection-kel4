// DOM Elements
const authForm = document.getElementById('auth-form');
const registerForm = document.getElementById('register-form-data');
const toggleRegisterLink = document.getElementById('toggle-register');
const toggleLoginLink = document.getElementById('toggle-login');
const loginFormContainer = document.getElementById('login-form');
const registerFormContainer = document.getElementById('register-form');
const retryButton = document.getElementById('retry-face-detection');

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
      // Use the custom showAlert function for login failures
      showLoginAlert('Login Failed', data.message || 'Invalid username or password. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    showLoginAlert('Connection Error', 'Failed to connect to the authentication server. Please try again later.');
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
      showLoginAlert('Registration Failed', data.message || 'Failed to create account. Please try again.');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showLoginAlert('Connection Error', 'Failed to connect to the registration server. Please try again later.');
  }
}

// Helper function for showing login-specific alerts
function showLoginAlert(title, message) {
  // Check if we can use the face detection alert function
  if (window.faceDetection && typeof window.faceDetection.showAlert === 'function') {
    window.faceDetection.showAlert(title, message, 'error', false);
  } else {
    // Fallback to our own implementation
    const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    document.getElementById('alertModalTitle').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    // Create error icon
    const iconElement = document.getElementById('modal-icon');
    iconElement.innerHTML = `<svg width="50" height="50" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e74c3c" stroke-width="5" />
      <line x1="35" y1="35" x2="65" y2="65" stroke="#e74c3c" stroke-width="8" />
      <line x1="35" y1="65" x2="65" y2="35" stroke="#e74c3c" stroke-width="8" />
    </svg>`;
    
    // Hide retry button
    const retryButton = document.getElementById('retry-face-detection');
    if (retryButton) {
      retryButton.classList.add('d-none');
    }
    
    alertModal.show();
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap Modal
  const alertModalElement = document.getElementById('alertModal');
  if (alertModalElement) {
    alertModalElement.addEventListener('hidden.bs.modal', function () {
      // Remove any event listeners from retry button when modal is closed
      const retryButton = document.getElementById('retry-face-detection');
      if (retryButton) {
        const newRetryButton = retryButton.cloneNode(true);
        retryButton.parentNode.replaceChild(newRetryButton, retryButton);
      }
    });
  }

  // pengisian login form
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      loginUser(username, password);
    });
  }

  // pengisian register form
  if (registerForm) {
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
  }

  // peralihan antara form login dan register
  if (toggleRegisterLink) {
    toggleRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      toggleForms();
    });
  }

  if (toggleLoginLink) {
    toggleLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      toggleForms();
    });
  }

  // Add event listener for retry button if it exists
  if (retryButton) {
    retryButton.addEventListener('click', function() {
      const alertModal = bootstrap.Modal.getInstance(document.getElementById('alertModal'));
      if (alertModal) {
        alertModal.hide();
      }
      
      if (window.faceDetection && typeof window.faceDetection.retryFaceDetection === 'function') {
        window.faceDetection.retryFaceDetection();
      } else {
        window.location.reload();
      }
    });
  }
});