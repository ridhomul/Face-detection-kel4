document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  // Initialize Bootstrap Modal
  const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
  
  // Show alert function
  function showAlert(title, message, type = 'info') {
    document.getElementById('alertModalTitle').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    const iconElement = document.getElementById('modal-icon');
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

  // Load user info
  fetch("/api/auth/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Not authorized");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        document.getElementById(
          "username-display"
        ).textContent = `Welcome, ${data.user.name}`;
        document.getElementById("user-name").textContent = data.user.name;
        document.getElementById("user-email").textContent = data.user.email;
        document.getElementById("user-username").textContent = data.user.username;
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

  // Load login history
  fetch("/api/auth/history", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const historyTable = document.getElementById("login-history");

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
      }
    })
    .catch((error) => {
      console.error("Error fetching login history:", error);
      document.getElementById("login-history").innerHTML = 
        `<tr><td colspan="4" class="text-center text-danger">Error loading login history</td></tr>`;
      showAlert("Data Loading Error", "There was a problem loading your login history.", "error");
    });

  // Logout functionality
  document.getElementById("logout-btn").addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("token");
    window.location.href = "/";
  });
}); 