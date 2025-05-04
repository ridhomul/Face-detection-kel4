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

// inisialisasi variabel
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

// ngeload face-api models
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
    faceStatus.textContent = 'Requesting camera access...';
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    });
    video.srcObject = stream;
    await new Promise((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    await video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    faceStatus.textContent = 'Camera ready. Waiting for face...';
    console.log('Webcam started successfully');
  } catch (error) {
    console.error('Error starting webcam:', error);
    throw new Error('Failed to access camera');
  }
}

// landmark68
function startFaceDetection() {
  if (!modelsLoaded) {
    console.error('Models not loaded');
    return;
  }

  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }

  faceDetectionInterval = setInterval(async () => {
    if (!video.paused && !video.ended && !faceCaptured) {
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

// Timer  saat tidak ada wajah terdeteksi
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
  }, 7000); 
}

// snapshot wajah dan verifikasi
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
    
    // matikan deteksi wajah
    if (faceDetectionInterval) {
      clearInterval(faceDetectionInterval);
    }
    
    faceStatus.textContent = 'Face detected successfully';
    faceStatus.className = 'mt-2 text-center status-success';
    
    // men-set waktu tunggu 3 detik sebelum menyembunyikan webcam
    setTimeout(() => {
      // Hide webcam container dan menampilkan form login
      webcamContainer.style.display = 'none';
      if (captureBtn) captureBtn.style.display = 'none';
      loginForm.classList.remove('d-none');
      // Stop webcam 
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }, 3000);

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

// mengulang proses deteksi wajah
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
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  // Make sure webcam container is visible
  webcamContainer.style.display = '';
  if (captureBtn) captureBtn.style.display = '';
  loginForm.classList.add('d-none');
  
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
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});

// Export functions for use in other scripts if needed
window.faceDetection = {
  initialize,
  retryFaceDetection
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);