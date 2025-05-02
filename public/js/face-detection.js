// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceStatus = document.getElementById('face-status');
const captureBtn = document.getElementById('capture-btn');
const loginForm = document.getElementById('login-form');

// Global variables
let stream = null;
let faceDetectionInterval = null;
let modelsLoaded = false;
let faceDetected = false;

// Initialize webcam and face-api models
async function initialize() {
  try {
    await loadModels();
    await startWebcam();
    startFaceDetection();
    captureBtn.disabled = false;
  } catch (error) {
    console.error('Initialization error:', error);
    faceStatus.textContent = 'Error initializing: ' + error.message;
    faceStatus.className = 'mt-2 text-center status-error';
  }
}

// Load face-api.js models
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
    faceStatus.textContent = 'Camera ready';
    console.log('Webcam started successfully');
  } catch (error) {
    console.error('Error starting webcam:', error);
    throw new Error('Failed to access camera');
  }
}

// Start face detection with landmarks
function startFaceDetection() {
  if (!modelsLoaded) {
    console.error('Models not loaded');
    return;
  }

  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }

  faceDetectionInterval = setInterval(async () => {
    if (!video.paused && !video.ended) {
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

// Capture face and verify with landmarks
async function captureAndVerify() {
  if (!faceDetected) {
    showAlert('Error', 'No face detected. Please position your face in front of the camera.');
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
      showAlert('Error', 'Face verification failed. Please try again.');
      return false;
    }

    if (detections.length > 1) {
      showAlert('Error', 'Multiple faces detected. Please ensure only your face is visible.');
      return false;
    }

    const resizedResults = faceapi.resizeResults(detections, {
      width: canvas.width,
      height: canvas.height
    });

    faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

    faceStatus.textContent = 'Face verified successfully';
    faceStatus.className = 'mt-2 text-center status-success';
    loginForm.classList.remove('d-none');

    return true;
  } catch (error) {
    console.error('Capture error:', error);
    showAlert('Error', 'Face verification failed: ' + error.message);
    return false;
  }
}

// Show Bootstrap alert modal
function showAlert(title, message) {
  const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
  document.getElementById('alertModalTitle').textContent = title;
  document.getElementById('alertModalBody').textContent = message;
  alertModal.show();
}

// DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  captureBtn.addEventListener('click', async () => {
    const verified = await captureAndVerify();
    if (verified) {
      console.log('Face verification successful');
    }
  });
});

// Clean up on unload
window.addEventListener('beforeunload', () => {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});
