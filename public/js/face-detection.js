const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceStatus = document.getElementById('face-status');
const loginForm = document.getElementById('login-form');
const webcamContainer = document.querySelector('.webcam-container');
const captureBtn = document.getElementById('capture-btn');

let stream = null;
let faceDetectionInterval = null;
let modelsLoaded = false;
let faceDetected = false;
let faceCaptured = false;
let noFaceTimeout = null;
let verificationFailedTimeout = null;

// Screen navigation function
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Show the requested screen
    document.getElementById(screenId).style.display = 'block';
    
    // Handle camera if showing face detection screens
    if (screenId === 'face-detection-screen' || screenId === 'face-detection-success') {
        startWebcam();
    } else {
        stopCamera();
    }
}

// Initialize the app
async function initialize() {
  try {
    await loadModels();
    await startWebcam();
    startFaceDetection();
    startNoFaceTimer(); 
  } catch (error) {
    console.error('Initialization error:', error);
    faceStatus.textContent = 'Error initializing: ' + error.message;
    faceStatus.className = 'mt-2 text-center status-error';
    schedulePageRefresh();
  }
}

// Load face-api models
async function loadModels() {
  faceStatus.textContent = 'Loading face detection models...';
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
    modelsLoaded = true;
    faceStatus.textContent = 'Models loaded successfully';
    console.log('Face detection models loaded');
  } catch (error) {
    console.error('Error loading models:', error);
    throw new Error('Failed to load face detection models');
  }
}

// Start webcam
async function startWebcam() {
  try {
    if (faceStatus) {
      faceStatus.textContent = 'Requesting camera access...';
    }
    
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
      
      // Also set the main video element for face detection if it exists
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
      
      if (faceStatus) {
        faceStatus.textContent = 'Camera ready. Waiting for face...';
      }
      console.log('Webcam started successfully');
    }
  } catch (error) {
    console.error('Error starting webcam:', error);
    throw new Error('Failed to access camera');
  }
}

// Stop camera function
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
    stream = null;
  }
}

// Start face detection
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

          faceStatus.textContent = 'Face detected';
          faceStatus.className = 'mt-2 text-center status-success';
          
          // Update status indicator for Kelpo UI
          const statusIndicator = document.getElementById('detection-status');
          const statusLabel = document.getElementById('status-label');
          
          if (statusIndicator && statusLabel) {
            statusIndicator.className = 'status-indicator status-green';
            statusLabel.className = 'status-label status-success';
            statusLabel.textContent = 'Successful';
          }
          
          faceDetected = true;
          
          // Auto-capture the face after detection
          if (faceDetected && !faceCaptured) {
            captureAndVerify();
          }
        } else {
          canvas.classList.add('d-none');
          faceStatus.textContent = 'No face detected';
          faceStatus.className = 'mt-2 text-center status-error';
          faceDetected = false;
        }
      } catch (error) {
        console.error('Face detection error:', error);
        faceStatus.textContent = 'Detection error';
        faceStatus.className = 'mt-2 text-center status-error';
      }
    }
  }, 100);
}

// Timer for when no face is detected
function startNoFaceTimer() {
  noFaceTimeout = setTimeout(() => {
    if (!faceCaptured) {
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
      }
      showAlert('Face Detection Failed', 'No face detected. Please try again.', 'error', true);
      
      if (faceStatus) {
        faceStatus.textContent = 'Timed out waiting for face';
        faceStatus.className = 'mt-2 text-center status-error';
      }
      
      schedulePageRefresh();
    }
  }, 7000); 
}

// Capture face and verify
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
        faceStatus.textContent = 'Face verification failed. Please try again.';
        faceStatus.className = 'mt-2 text-center status-error';
        showAlert('Verification Failed', 'Face verification failed. Page will refresh automatically.', 'error', false);
        schedulePageRefresh();
        return false;
      }
  
      if (detections.length > 1) {
        faceStatus.textContent = 'Multiple faces detected. Please ensure only your face is visible.';
        faceStatus.className = 'mt-2 text-center status-error';
        showAlert('Multiple Faces', 'Multiple faces detected. Page will refresh automatically.', 'error', false);
        schedulePageRefresh();
        return false;
      }
    }

    // Successfully captured face
    faceCaptured = true;
    clearTimeout(noFaceTimeout); 
    
    // Stop face detection
    if (faceDetectionInterval) {
      clearInterval(faceDetectionInterval);
    }
    
    if (faceStatus) {
      faceStatus.textContent = 'Face detected successfully';
      faceStatus.className = 'mt-2 text-center status-success';
    }
    
    // Show success screen for Kelpo UI
    if (document.getElementById('face-detection-screen')) {
      setTimeout(() => {
        showScreen('face-detection-success');
        
        // Auto-return to login after successful detection
        setTimeout(() => {
          showScreen('login-screen');
        }, 3000);
      }, 1500);
    } else {
      // For original UI - wait 3 seconds before hiding webcam
      setTimeout(() => {
        // Hide webcam container and show login form
        if (webcamContainer) webcamContainer.style.display = 'none';
        if (captureBtn) captureBtn.style.display = 'none';
        if (loginForm) loginForm.classList.remove('d-none');
        
        // Stop webcam 
        stopCamera();
      }, 3000);
    }

    return true;
  } catch (error) {
    console.error('Capture error:', error);
    showAlert('Error', 'Face verification failed: ' + error.message, 'error', false);
    schedulePageRefresh();
    return false;
  }
}

// Face detection simulation for Kelpo UI
function simulateFaceDetection() {
  showScreen('face-detection-screen');
  
  // Simulate face detection process
  setTimeout(() => {
    const statusIndicator = document.getElementById('detection-status');
    const statusLabel = document.getElementById('status-label');
    
    if (statusIndicator && statusLabel) {
      // Update to success state
      statusIndicator.className = 'status-indicator status-green';
      statusLabel.className = 'status-label status-success';
      statusLabel.textContent = 'Successful';
      
      // Show success screen after delay
      setTimeout(() => {
        showScreen('face-detection-success');
        
        // Auto-return to login after successful detection
        setTimeout(() => {
          showScreen('login-screen');
        }, 3000);
      }, 1500);
    }
  }, 3000);
}

// Auto refresh function
function schedulePageRefresh() {
  // Clear any existing timeouts first
  if (verificationFailedTimeout) {
    clearTimeout(verificationFailedTimeout);
  }
  
  // Show message about refreshing page
  if (faceStatus) {
    faceStatus.textContent = 'Verification failed. Page will refresh automatically...';
    faceStatus.className = 'mt-2 text-center status-error';
  }
  
  verificationFailedTimeout = setTimeout(() => {
    console.log('Auto-refreshing page due to face verification failure');
    window.location.reload();
  }, 3000);
}

// Show alert function
function showAlert(title, message, type = 'info', showRetry = false) {
  const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
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

// Retry face detection
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
  
  // Make sure webcam container is visible
  if (webcamContainer) webcamContainer.style.display = '';
  if (captureBtn) captureBtn.style.display = '';
  if (loginForm) loginForm.classList.add('d-none');
  
  // Restart 
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

// Export functions for use in other scripts if needed
window.faceDetection = {
  initialize,
  retryFaceDetection,
  showAlert,
  simulateFaceDetection,
  showScreen
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're using Kelpo UI or original UI
  const isKelpoUI = document.getElementById('face-detection-screen') !== null;
  
  if (isKelpoUI) {
    // Set up login button for Kelpo UI
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        simulateFaceDetection();
      });
    }
    
    // Set up register button for Kelpo UI
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      registerBtn.addEventListener('click', function() {
        simulateFaceDetection();
      });
    }
    
    // Set up navigation arrows for Kelpo UI
    const nextArrow = document.getElementById('next-arrow');
    if (nextArrow) {
      nextArrow.addEventListener('click', function() {
        showScreen('face-detection-success');
      });
    }
    
    const finalArrow = document.getElementById('final-arrow');
    if (finalArrow) {
      finalArrow.addEventListener('click', function() {
        showScreen('login-screen');
      });
    }
  } else {
    // Initialize original face detection
    initialize();
  }
});