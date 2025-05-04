document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  // Bootstrap Modal initialization
  let alertModal;
  const alertModalElement = document.getElementById('alertModal');
  if (alertModalElement) {
    alertModal = new bootstrap.Modal(alertModalElement);
  } else {
    console.error("Alert modal element not found in the DOM");
    // Create a modal element if it doesn't exist
    createAlertModal();
    alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
  }
  
  // Show alert function
  function showAlert(title, message, type = 'info') {
    const modalTitle = document.getElementById('alertModalTitle');
    const modalMessage = document.getElementById('modal-message');
    const iconElement = document.getElementById('modal-icon');
    
    if (!modalTitle || !modalMessage || !iconElement) {
      console.error("Modal elements not found");
      return;
    }
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    let iconHTML = '';
    
    if (type === 'success') {
      iconHTML = `<svg width="50" height="50" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#2ecc71" stroke-width="5" />
        <path d="M30,50 L45,65 L70,35" stroke="#2ecc71" stroke-width="8" fill="none" />
      </svg>`;
    } else if (type === 'error') {
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
    alertModal.show();
  }

  function createAlertModal() {
    const modalHTML = `
      <div class="modal fade" id="alertModal" tabindex="-1" aria-labelledby="alertModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="alertModalTitle">Alert</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
              <div id="modal-icon" class="mb-4"></div>
              <p id="modal-message">Alert message</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" id="retry-face-detection" class="btn btn-primary d-none">Try Again</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Load user info with error handling
  loadUserInfo();
  function loadUserInfo() {
    fetch("/api/auth/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          const usernameDisplay = document.getElementById("username-display");
          const userName = document.getElementById("user-name");
          const userEmail = document.getElementById("user-email");
          const userUsername = document.getElementById("user-username");
          
          if (usernameDisplay) usernameDisplay.textContent = `Welcome, ${data.user.name}`;
          if (userName) userName.textContent = data.user.name;
          if (userEmail) userEmail.textContent = data.user.email;
          if (userUsername) userUsername.textContent = data.user.username;
          
          console.log("User info loaded successfully");
        } else {
          throw new Error(data.message || "Failed to load user information");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        showAlert("Authentication Error", "Your session has expired. Please log in again.", "error");
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "/";
        }, 2000);
      });
  }

  // Load login history with improved error handling
  loadLoginHistory();
  function loadLoginHistory() {
    fetch("/api/auth/history", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const historyTable = document.getElementById("login-history");
        if (!historyTable) {
          console.error("Login history table element not found");
          return;
        }

        if (data.success) {
          if (data.history.length === 0) {
            historyTable.innerHTML = `<tr><td colspan="4" class="text-center">No login history available</td></tr>`;
            return;
          }

          historyTable.innerHTML = "";

          data.history.forEach((entry) => {
            const date = new Date(entry.timestamp).toLocaleString();
            const status = entry.success
              ? '<span class="badge bg-success">Success</span>'
              : '<span class="badge bg-danger">Failed</span>';
            const faceStatus = entry.faceDetected
              ? '<span class="badge bg-success">Yes</span>'
              : '<span class="badge bg-danger">No</span>';

            historyTable.innerHTML += `
            <tr>
              <td>${date}</td>
              <td>${status}</td>
              <td>${faceStatus}</td>
              <td>${entry.userAgent ? entry.userAgent.substring(0, 50) + "..." : "N/A"}</td>
            </tr>
          `;
          });
          
          console.log("Login history loaded successfully");
        } else {
          throw new Error(data.message || "Failed to load login history");
        }
      })
      .catch((error) => {
        console.error("Error fetching login history:", error);
        const historyTable = document.getElementById("login-history");
        if (historyTable) {
          historyTable.innerHTML = 
            `<tr><td colspan="4" class="text-center text-danger">Error loading login history</td></tr>`;
        }
        showAlert("Data Loading Error", "There was a problem loading your login history.", "error");
      });
  }

  // Fix logout functionality
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Logout button clicked");
      
      // Add visual feedback
      logoutBtn.textContent = "Logging out...";
      logoutBtn.classList.add("disabled");
      
      // Perform logout
      localStorage.removeItem("token");
      
      // Show successful logout message
      showAlert("Logout Successful", "You have been logged out successfully.", "success");
      
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    });
  } else {
    console.error("Logout button not found");
  }
});