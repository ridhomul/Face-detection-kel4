const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceStatus = document.getElementById('face-status');
const loginForm = document.getElementById('login-form');
const webcamContainer = document.querySelector('.webcam-container');
const captureBtn = document.getElementById('capture-btn');
const statusLabel = document.getElementById('status-label');
const detectionStatus = document.getElementById('detection-status');

// State variables
let stream = null;
let faceDetectionInterval = null;
let modelsLoaded = false;
let faceDetected = false;
let faceCaptured = false;
let noFaceTimeout = null;
let verificationFailedTimeout = null;

/**
 * Screen navigation function
 * @param {string} screenId - The ID of the screen to show
 */
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Show the requested screen
    document.getElementById(screenId).style.display = 'block';
    
    // Handle camera if showing face detection screens
    if (screenId === 'face-detection-screen') {
        startWebcam();
    } else if (screenId !== 'face-detection-success') {
        stopCamera();
    }
}

/**
 * Initialize the face detection system
 */
async function initialize() {
  try {
    updateStatus('Loading face detection models...', 'loading');
    await loadModels();
    await startWebcam();
    startFaceDetection();
    startNoFaceTimer(); 
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus('Error initializing: ' + error.message, 'error');
    schedulePageRefresh();
  }
}

/**
 * Update the status display
 * @param {string} message - Status message to display
 * @param {string} type - Status type (loading, success, error)
 */
function updateStatus(message, type = 'loading') {
  if (faceStatus) {
    faceStatus.textContent = message;
    
    // Clear existing classes and add appropriate status class
    faceStatus.className = 'mt-2 text-center';
    if (type === 'error') {
      faceStatus.classList.add('status-error');
    } else if (type === 'success') {
      faceStatus.classList.add('status-success');
    }
  }
  
  // Update Kelpo UI status indicators if they exist
  if (statusLabel && detectionStatus) {
    if (type === 'loading') {
      statusLabel.className = 'status-label status-loading';
      statusLabel.textContent = message;
      detectionStatus.className = 'status-indicator status-red';
    } else if (type === 'success') {
      statusLabel.className = 'status-label status-success';
      statusLabel.textContent = 'Successful';
      detectionStatus.className = 'status-indicator status-green';
    } else if (type === 'error') {
      statusLabel.className = 'status-label status-error';
      statusLabel.textContent = 'Failed';
      detectionStatus.className = 'status-indicator status-red';
    }
  }
}

/**
 * Load face-api models
 */
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
    modelsLoaded = true;
    updateStatus('Models loaded successfully', 'success');
    console.log('Face detection models loaded');
  } catch (error) {
    console.error('Error loading models:', error);
    throw new Error('Failed to load face detection models');
  }
}

/**
 * Start webcam
 */
async function startWebcam() {
  try {
    updateStatus('Requesting camera access...', 'loading');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      // Find all video elements with camera-feed class
      const videoElements = document.querySelectorAll('.camera-feed');
      videoElements.forEach(videoElement => {
        videoElement.srcObject = stream;
      });
      
      // Set up main video element for face detection
      if (video) {
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();
        
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }
      
      updateStatus('Camera ready. Waiting for face...', 'loading');
      console.log('Webcam started successfully');
    }
  } catch (error) {
    console.error('Error starting webcam:', error);
    throw new Error('Failed to access camera');
  }
}

/**
 * Stop camera
 */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
    stream = null;
    console.log('Camera stopped');
  }
}

/**
 * Start face detection process
 */
function startFaceDetection() {
  if (!modelsLoaded) {
    console.error('Models not loaded');
    return;
  }

  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }

  faceDetectionInterval = setInterval(async () => {
    if (video && !video.paused && !video.ended && !faceCaptured) {
      try {
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
        ).withFaceLandmarks(true);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length > 0) {
          canvas.classList.remove('d-none');
          const resizedResults = faceapi.resizeResults(detections, {
            width: canvas.width,
            height: canvas.height
          });

          resizedResults.forEach(result => {
            const { x, y, width, height } = result.detection.box;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);
          });

          faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

          updateStatus('Face detected', 'success');
          faceDetected = true;
          
          // Auto-capture the face after detection
          if (faceDetected && !faceCaptured) {
            captureAndVerify();
          }
        } else {
          canvas.classList.add('d-none');
          updateStatus('No face detected', 'error');
          faceDetected = false;
        }
      } catch (error) {
        console.error('Face detection error:', error);
        updateStatus('Detection error', 'error');
      }
    }
  }, 100);
}

/**
 * Start timer for when no face is detected
 */
function startNoFaceTimer() {
  noFaceTimeout = setTimeout(() => {
    if (!faceCaptured) {
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
      }
      showAlert('Face Detection Failed', 'No face detected. Please try again.', 'error', true);
      updateStatus('Timed out waiting for face', 'error');
      schedulePageRefresh();
    }
  }, 10000); // Increased from 7s to 10s for better user experience
}

/**
 * Capture face and verify
 */
async function captureAndVerify() {
  if (!faceDetected) {
    return false;
  }

  try {
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
      const detections = await faceapi.detectAllFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
      ).withFaceLandmarks(true);
  
      if (detections.length === 0) {
        updateStatus('Face verification failed. Please try again.', 'error');
        showAlert('Verification Failed', 'Face verification failed. Page will refresh automatically.', 'error', false);
        schedulePageRefresh();
        return false;
      }
  
      if (detections.length > 1) {
        updateStatus('Multiple faces detected. Please ensure only your face is visible.', 'error');
        showAlert('Multiple Faces', 'Multiple faces detected. Page will refresh automatically.', 'error', false);
        schedulePageRefresh();
        return false;
      }
    }

    // Successfully captured face
    faceCaptured = true;
    clearTimeout(noFaceTimeout); 
    
    // Stop face detection interval
    if (faceDetectionInterval) {
      clearInterval(faceDetectionInterval);
    }
    
    updateStatus('Face detected successfully', 'success');
    
    // Show success and transition to login
    setTimeout(() => {
      showScreen('login-screen');
    }, 1500);

    return true;
  } catch (error) {
    console.error('Capture error:', error);
    showAlert('Error', 'Face verification failed: ' + error.message, 'error', false);
    schedulePageRefresh();
    return false;
  }
}

/**
 * Show alert modal
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error, info)
 * @param {boolean} showRetry - Whether to show retry button
 */
function showAlert(title, message, type = 'info', showRetry = false) {
  const alertModalElement = document.getElementById('alertModal');
  if (!alertModalElement) return;
  
  const alertModal = new bootstrap.Modal(alertModalElement);
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
  
  // Show/hide retry button based on parameter
  const retryButton = document.getElementById('retry-face-detection');
  if (retryButton) {
    if (showRetry) {
      retryButton.classList.remove('d-none');
      
      // Add event listener to retry button if showing it
      retryButton.addEventListener('click', function() {
        alertModal.hide();
        retryFaceDetection();
      });
    } else {
      retryButton.classList.add('d-none');
    }
  }
  
  alertModal.show();
}

/**
 * Schedule page refresh after failure
 */
function schedulePageRefresh() {
  // Clear any existing timeouts first
  if (verificationFailedTimeout) {
    clearTimeout(verificationFailedTimeout);
  }
  
  // Show message about refreshing page
  updateStatus('Verification failed. Page will refresh automatically...', 'error');
  
  verificationFailedTimeout = setTimeout(() => {
    console.log('Auto-refreshing page due to face verification failure');
    window.location.reload();
  }, 5000); // Increased from 3s to 5s to give users more time to read the message
}

/**
 * Retry face detection
 */
function retryFaceDetection() {
  console.log('Retry face detection triggered');
  // Reset state
  faceCaptured = false;
  faceDetected = false;
  
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  if (noFaceTimeout) {
    clearTimeout(noFaceTimeout);
  }
  if (verificationFailedTimeout) {
    clearTimeout(verificationFailedTimeout);
  }
  
  stopCamera();
  
  // Make sure webcam elements are visible
  if (webcamContainer) webcamContainer.style.display = '';
  if (captureBtn) captureBtn.style.display = '';
  if (loginForm) loginForm.classList.add('d-none');
  
  // Restart initialization
  initialize();
}

// Clean up on unload
window.addEventListener('beforeunload', () => {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  if (noFaceTimeout) {
    clearTimeout(noFaceTimeout);
  }
  if (verificationFailedTimeout) {
    clearTimeout(verificationFailedTimeout);
  }
  stopCamera();
});

// Export functions for use in other scripts
window.faceDetection = {
  initialize,
  retryFaceDetection,
  showAlert,
  showScreen
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set up navigation controls for the app
  const nextArrow = document.getElementById('next-arrow');
  if (nextArrow) {
    nextArrow.addEventListener('click', function() {
      if (faceDetected) {
        showScreen('login-screen');
      } else {
        showAlert('Face Not Detected', 'Please position your face in the camera before proceeding.', 'error', false);
      }
    });
  }
  
  // Set up toggle between login and register
  const toggleRegister = document.getElementById('toggle-register');
  if (toggleRegister) {
    toggleRegister.addEventListener('click', function() {
      showScreen('register-screen');
    });
  }
  
  const toggleLogin = document.getElementById('toggle-login');
  if (toggleLogin) {
    toggleLogin.addEventListener('click', function() {
      showScreen('login-screen');
    });
  }
  
  // Initialize face detection
  initialize();
});