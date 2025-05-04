// DOM Elements
const authForm = document.getElementById('auth-form');
const registerForm = document.getElementById('register-form-data');
const toggleRegisterLink = document.getElementById('toggle-register');
const toggleLoginLink = document.getElementById('toggle-login');
const loginFormContainer = document.getElementById('login-form');
const registerFormContainer = document.getElementById('register-form');
const retryButton = document.getElementById('retry-face-detection');

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/dashboard';
  }
});

// Toggle between login and register forms
function toggleForms() {
  // Check if we're using Kelpo UI
  if (document.getElementById('login-screen')) {
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    
    if (loginScreen.style.display !== 'none') {
      loginScreen.style.display = 'none';
      registerScreen.style.display = 'block';
    } else {
      loginScreen.style.display = 'block';
      registerScreen.style.display = 'none';
    }
  } else {
    // Original UI toggle logic
    if (loginFormContainer.classList.contains('d-none')) {
      loginFormContainer.classList.remove('d-none');
      registerFormContainer.classList.add('d-none');
    } else {
      loginFormContainer.classList.add('d-none');
      registerFormContainer.classList.remove('d-none');
    }
  }
}

// Handle login function
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
      // Use the custom showAlert function for login failures
      showLoginAlert('Login Failed', data.message || 'Invalid username or password. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    showLoginAlert('Connection Error', 'Failed to connect to the authentication server. Please try again later.');
  }
}

// Handle registration function
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
  // Check if we're using Kelpo UI
  const isKelpoUI = document.getElementById('login-screen') !== null;

  // Initialize Bootstrap Modal if it exists
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

  // For Kelpo UI
  if (isKelpoUI) {
    // Set up login form
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      const formInputs = loginScreen.querySelectorAll('.form-input');
      const loginBtn = loginScreen.querySelector('.btn-primary');
      
      if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
          e.preventDefault();
          
          // If we have a simulateFaceDetection function, use it
          if (window.faceDetection && typeof window.faceDetection.simulateFaceDetection === 'function') {
            window.faceDetection.simulateFaceDetection();
          } 
          // Otherwise handle login normally if we have inputs
          else if (formInputs.length >= 2) {
            const username = formInputs[0].value;
            const password = formInputs[1].value;
            loginUser(username, password);
          }
        });
      }
      
      // Toggle to register
      const toggleRegister = loginScreen.querySelector('.btn-secondary');
      if (toggleRegister) {
        toggleRegister.addEventListener('click', function(e) {
          e.preventDefault();
          if (window.faceDetection && typeof window.faceDetection.showScreen === 'function') {
            window.faceDetection.showScreen('register-screen');
          } else {
            toggleForms();
          }
        });
      }
    }
    
    // Set up register form
    const registerScreen = document.getElementById('register-screen');
    if (registerScreen) {
      const formInputs = registerScreen.querySelectorAll('.form-input');
      const registerBtn = registerScreen.querySelector('.btn-primary');
      
      if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
          e.preventDefault();
          
          // If we have a simulateFaceDetection function, use it
          if (window.faceDetection && typeof window.faceDetection.simulateFaceDetection === 'function') {
            window.faceDetection.simulateFaceDetection();
          } 
          // Otherwise handle registration normally if we have inputs
          else if (formInputs.length >= 2) {
            const userData = {
              username: formInputs[0].value,
              password: formInputs[1].value,
              name: formInputs[0].value, // Using username as name if we only have 2 fields
              email: formInputs[0].value + '@example.com' // Creating a dummy email
            };
            registerUser(userData);
          }
        });
      }
      
      // Toggle to login
      const toggleLogin = registerScreen.querySelector('.btn-secondary');
      if (toggleLogin) {
        toggleLogin.addEventListener('click', function(e) {
          e.preventDefault();
          if (window.faceDetection && typeof window.faceDetection.showScreen === 'function') {
            window.faceDetection.showScreen('login-screen');
          } else {
            toggleForms();
          }
        });
      }
    }
  } else {
    // Original UI event listeners
    
    // Handle login form submission
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        loginUser(username, password);
      });
    }
  
    // Handle register form submission
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
  
    // Toggle between login and register forms
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