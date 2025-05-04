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

  // Clear any existing interval to prevent duplicates
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
    faceDetectionInterval = null;
  }

  console.log('Starting face detection loop');
  faceDetectionInterval = setInterval(async () => {
    if (video && !video.paused && !video.ended && !faceCaptured) {
      try {
        // Get current video dimensions
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        
        // Make sure canvas matches video dimensions
        if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
          canvas.width = displaySize.width;
          canvas.height = displaySize.height;
        }
        
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
        ).withFaceLandmarks(true);

        const ctx = canvas.getContext('2d');
        // Clear canvas before drawing new frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // First draw video frame to canvas to ensure proper alignment
        // Only needed if we want to "freeze" the frame in the canvas
        // ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (detections.length > 0) {
          canvas.classList.remove('d-none');
          
          // Ensure proper size matching between video and canvas
          const resizedResults = faceapi.resizeResults(detections, displaySize);

          // Draw face detection boxes
          resizedResults.forEach(result => {
            const { x, y, width, height } = result.detection.box;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);
          });

          // Draw face landmarks (dots and lines for eyes, nose, mouth, etc.)
          faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

          updateStatus('Face detected', 'success');
          faceDetected = true;
          
          // Don't auto-capture immediately - wait for user to stabilize
          // Add a small delay to avoid constant capturing attempts
          if (faceDetected && !faceCaptured) {
            if (!window.captureTimeout) {
              window.captureTimeout = setTimeout(() => {
                captureAndVerify();
                window.captureTimeout = null;
              }, 1000); // Wait 1 second after face is stable
            }
          }
        } else {
          if (window.captureTimeout) {
            clearTimeout(window.captureTimeout);
            window.captureTimeout = null;
          }
          // Just clear the box and landmarks when no face is detected
          updateStatus('No face detected', 'error');
          faceDetected = false;
        }
      } catch (error) {
        console.error('Face detection error:', error);
        updateStatus('Detection error', 'error');
      }
    }
  }, 100); // Run detection every 100ms for smoother tracking
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
    }
  }, 15000); // Increased to 15s to give users more time
}

/**
 * Capture face and verify
 */
async function captureAndVerify() {
  if (!faceDetected) {
    return false;
  }

  try {
    // Temporarily pause detection while verifying
    if (faceDetectionInterval) {
      clearInterval(faceDetectionInterval);
      faceDetectionInterval = null;
    }
    
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      // Clear canvas and redraw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
      const detections = await faceapi.detectAllFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
      ).withFaceLandmarks(true);
  
      if (detections.length === 0) {
        updateStatus('Face verification failed. Please try again.', 'error');
        showAlert('Verification Failed', 'Face verification failed. Please try again.', 'error', true);
        if (!faceDetectionInterval) {
          startFaceDetection(); // Resume detection if verification fails
        }
        return false;
      }
  
      if (detections.length > 1) {
        updateStatus('Multiple faces detected. Please ensure only your face is visible.', 'error');
        showAlert('Multiple Faces', 'Multiple faces detected. Please ensure only your face is visible.', 'error', true);
        if (!faceDetectionInterval) {
          startFaceDetection(); // Resume detection if verification fails
        }
        return false;
      }
      
      // Redraw detection overlay for captured image
      const displaySize = { width: canvas.width, height: canvas.height };
      const resizedResults = faceapi.resizeResults(detections, displaySize);
      
      // Draw detection box
      const { x, y, width, height } = resizedResults[0].detection.box;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Draw landmarks
      faceapi.draw.drawFaceLandmarks(canvas, resizedResults);
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
    showAlert('Error', 'Face verification failed: ' + error.message, 'error', true);
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
  
  // Handle any existing modal first
  const existingModal = bootstrap.Modal.getInstance(alertModalElement);
  if (existingModal) {
    existingModal.dispose();
  }
  
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
    // Remove any existing event listeners first
    const newRetryButton = retryButton.cloneNode(true);
    retryButton.parentNode.replaceChild(newRetryButton, retryButton);
    
    if (showRetry) {
      newRetryButton.classList.remove('d-none');
      
      // Add event listener to retry button if showing it
      newRetryButton.addEventListener('click', function() {
        alertModal.hide();
        retryFaceDetection();
      });
    } else {
      newRetryButton.classList.add('d-none');
    }
  }
  
  // Pause detection while modal is shown
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  
  // Resume detection when modal is hidden
  alertModalElement.addEventListener('hidden.bs.modal', function() {
    if (!faceCaptured) {
      startFaceDetection();
    }
  }, { once: true });
  
  alertModal.show();
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
    faceDetectionInterval = null;
  }
  if (noFaceTimeout) {
    clearTimeout(noFaceTimeout);
    noFaceTimeout = null;
  }
  if (window.captureTimeout) {
    clearTimeout(window.captureTimeout);
    window.captureTimeout = null;
  }
  
  stopCamera();
  
  // Make sure webcam elements are visible
  if (webcamContainer) webcamContainer.style.display = '';
  if (captureBtn) captureBtn.style.display = '';
  if (loginForm) loginForm.classList.add('d-none');
  
  // Clear canvas
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Restart initialization
  setTimeout(() => {
    initialize();
  }, 500); // Small delay to ensure camera is properly stopped
}

// Clean up on unload
window.addEventListener('beforeunload', () => {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  if (noFaceTimeout) {
    clearTimeout(noFaceTimeout);
  }
  if (window.captureTimeout) {
    clearTimeout(window.captureTimeout);
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