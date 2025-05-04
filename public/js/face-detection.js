//Dom elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceStatus = document.getElementById('face-status');
const loginForm = document.getElementById('login-form');
const webcamContainer = document.querySelector('.webcam-container');
const captureBtn = document.getElementById('capture-btn');
const statusLabel = document.getElementById('status-label');
const detectionStatus = document.getElementById('detection-status');

// deklarasi variabel
let stream = null;
let faceDetectionInterval = null;
let modelsLoaded = false;
let faceDetected = false;
let faceCaptured = false;
let noFaceTimeout = null;
let lastDetection = null; // Store last detection for animation
let animationFrameId = null; // For animation frame
let confidenceThreshold = 0.5; // Detection confidence threshold

/** 
 @param {string} screenId - The ID of the screen to show
 */
function showScreen(screenId) {
    // sembunyikan screen
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });

    // hanya tunjukkan screen yang diminta
    document.getElementById(screenId).style.display = 'block';
    
    if (screenId === 'face-detection-screen') {
        startWebcam();
    } else if (screenId !== 'face-detection-success') {
        stopCamera();
    }
}

//face detection initialization
async function initialize() {
  try {
    updateStatus('Loading face detection models...', 'loading');
    await loadModels();
    await startWebcam();
    
    // Make canvas visible immediately
    if (canvas) {
      canvas.classList.remove('d-none');
    }
    
    startFaceDetection();
    startNoFaceTimer(); 
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus('Error initializing: ' + error.message, 'error');
  }
}

/**
 * Status display
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
  
  // Update status indicators if they exist with smooth transitions
  if (statusLabel && detectionStatus) {
    if (type === 'loading') {
      statusLabel.className = 'status-label status-loading';
      statusLabel.textContent = message;
      detectionStatus.className = 'status-indicator status-red';
      
      // Add pulsing animation to loading dots
      const dots = detectionStatus.querySelectorAll('.status-dot');
      dots.forEach((dot, index) => {
        dot.style.animation = `pulse 1.5s infinite ${index * 0.3}s`;
      });
      
    } else if (type === 'success') {
      statusLabel.className = 'status-label status-success animate__animated animate__fadeIn';
      statusLabel.textContent = 'Successful';
      detectionStatus.className = 'status-indicator status-green animate__animated animate__bounceIn';
      
      // Remove pulsing animation
      const dots = detectionStatus.querySelectorAll('.status-dot');
      dots.forEach(dot => {
        dot.style.animation = '';
      });
      
    } else if (type === 'error') {
      statusLabel.className = 'status-label status-error animate__animated animate__fadeIn';
      statusLabel.textContent = 'Failed';
      detectionStatus.className = 'status-indicator status-red animate__animated animate__shakeX';
      
      // Remove pulsing animation
      const dots = detectionStatus.querySelectorAll('.status-dot');
      dots.forEach(dot => {
        dot.style.animation = '';
      });
    }
  }
}

//face api model
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

//menampilkan webcam
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
          // Position canvas over the video with absolute positioning
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
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

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
    stream = null;
    console.log('Camera stopped');
  }
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Animate face detection markers
 * This is our new function for fluid animation
 */
function animateDetection() {
  if (!video || video.paused || video.ended || faceCaptured || !canvas) {
    return;
  }
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (lastDetection && lastDetection.length > 0) {
    // detection boxes
    const pulseScale = 1 + 0.05 * Math.sin(Date.now() / 200); // Subtle pulsing effect
    
    lastDetection.forEach(result => {
      const { x, y, width, height } = result.detection.box;
      
      // Calculate center of the box for pulsing effect
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      // gambar kotak dengan efek pulsing
      ctx.strokeStyle = '#4CAF84'; 
      ctx.lineWidth = 3;
      
      // menggambar kotak dengan efek pulsing
      ctx.beginPath();
      const pulseWidth = width * pulseScale;
      const pulseHeight = height * pulseScale;
      ctx.rect(centerX - pulseWidth/2, centerY - pulseHeight/2, pulseWidth, pulseHeight);
      ctx.stroke();
      
      ctx.strokeStyle = '#00ff00';
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
      
      const cornerLength = Math.min(width, height) * 0.2;
      ctx.strokeStyle = '#f5994e'; 
      ctx.lineWidth = 4;
      
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLength);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLength);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLength, y + height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLength);
      ctx.stroke();
    });
    
    if (lastDetection[0] && lastDetection[0].landmarks) {
      const landmarks = lastDetection[0].landmarks;
      
      ctx.strokeStyle = 'rgba(100, 255, 100, 0.7)';
      ctx.lineWidth = 2;
      
      const jawPoints = landmarks.getJawOutline();
      ctx.beginPath();
      jawPoints.forEach((point, index) => {
        const jitter = Math.sin(Date.now() / 500 + index) * 1; // Subtle movement
        if (index === 0) {
          ctx.moveTo(point.x + jitter, point.y + jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y + jitter);
        }
      });
      ctx.stroke();
      
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      [leftEye, rightEye].forEach(eye => {
        ctx.beginPath();
        eye.forEach((point, index) => {
          const jitter = Math.sin(Date.now() / 400 + index) * 0.8;
          if (index === 0) {
            ctx.moveTo(point.x + jitter, point.y + jitter);
          } else {
            ctx.lineTo(point.x + jitter, point.y + jitter);
          }
        });
        ctx.closePath();
        ctx.stroke();
        
        const eyeCenterX = eye.reduce((sum, point) => sum + point.x, 0) / eye.length;
        const eyeCenterY = eye.reduce((sum, point) => sum + point.y, 0) / eye.length;
        
        const pulseFactor = 1 + 0.3 * Math.sin(Date.now() / 300);
        ctx.fillStyle = 'rgba(220, 234, 163, 0.7)'; // lime green with transparency
        ctx.beginPath();
        ctx.arc(eyeCenterX, eyeCenterY, 3 * pulseFactor, 0, Math.PI * 2);
        ctx.fill();
      });
      
      const nose = landmarks.getNose();
      ctx.strokeStyle = 'rgba(76, 175, 132, 0.7)'; // teal with transparency
      ctx.beginPath();
      nose.forEach((point, index) => {
        const jitter = Math.sin(Date.now() / 450 + index) * 0.5;
        if (index === 0) {
          ctx.moveTo(point.x + jitter, point.y + jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y + jitter);
        }
      });
      ctx.stroke();
      
      const mouth = landmarks.getMouth();
      ctx.strokeStyle = 'rgba(245, 153, 78, 0.7)'; // orange with transparency
      ctx.beginPath();
      mouth.forEach((point, index) => {
        const jitter = Math.sin(Date.now() / 500 + index) * 0.7;
        if (index === 0) {
          ctx.moveTo(point.x + jitter, point.y + jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y + jitter);
        }
      });
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  animationFrameId = requestAnimationFrame(animateDetection);
}

//face detection
function startFaceDetection() {
  if (!modelsLoaded) {
    console.error('Models not loaded');
    return;
  }

  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
    faceDetectionInterval = null;
  }
  
  animateDetection();

  console.log('Starting face detection loop');
  faceDetectionInterval = setInterval(async () => {
    if (video && !video.paused && !video.ended && !faceCaptured) {
      try {

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        
        if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
          canvas.width = displaySize.width;
          canvas.height = displaySize.height;
        }
        
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: confidenceThreshold })
        ).withFaceLandmarks(true);

        if (detections.length > 0) {
          lastDetection = faceapi.resizeResults(detections, displaySize);
          
          updateStatus('Face detected', 'success');
          faceDetected = true;
          
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
          
          lastDetection = null; // Clear last detection when no face detected
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

//timer tanpa wajah
function startNoFaceTimer() {
  noFaceTimeout = setTimeout(() => {
    if (!faceCaptured) {
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
      }
      showAlert('Error', 'No face detected. Please try again.', true);
      faceStatus.textContent = 'Timed out waiting for face';
      faceStatus.className = 'mt-2 text-center status-error';
      schedulePageRefresh();
    }
  }, 15000); 
}

//verifikasi wajah
async function captureAndVerify() {
  if (!faceDetected) {
    return false;
  }

  try {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detections = await faceapi.detectAllFaces(
      canvas,
      new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
    ).withFaceLandmarks(true);

    if (detections.length === 0) {
      faceStatus.textContent = 'Face verification failed. Please try again.';
      faceStatus.className = 'mt-2 text-center status-error';
      showAlert('Verification Failed', 'Face verification failed. Page will refresh automatically.', false);
      schedulePageRefresh();
      return false;
    }

    if (detections.length > 1) {
      faceStatus.textContent = 'Multiple faces detected. Please ensure only your face is visible.';
      faceStatus.className = 'mt-2 text-center status-error';
      showAlert('Multiple Faces', 'Multiple faces detected. Page will refresh automatically.', false);
      schedulePageRefresh();
      return false;
    }

    //berhasil menangkap wajah
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
    showAlert('Error', 'Face verification failed: ' + error.message);
    schedulePageRefresh();
    return false;
  }
}

// fungsi untuk auto refresh
function schedulePageRefresh() {
  // Clear any existing timeouts first
  if (verificationFailedTimeout) {
    clearTimeout(verificationFailedTimeout);
  }
  
  // menampilkan pesan untuk mereferesh halaman
  faceStatus.textContent = 'Verification failed. Page will refresh automatically...';
  faceStatus.className = 'mt-2 text-center status-error';
  
  verificationFailedTimeout = setTimeout(() => {
    console.log('Auto-refreshing page due to face verification failure');
    window.location.reload();
  }, 3000);
}

function retryFaceDetection() {
  console.log('Retry face detection triggered');
  // Reset state
  faceCaptured = false;
  faceDetected = false;
  lastDetection = null;
  
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
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
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
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  stopCamera();
});

// Export functions for use in other scripts
window.faceDetection = {
  initialize,
  retryFaceDetection
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