// // DOM Elements
// const video = document.getElementById('video');
// const canvas = document.getElementById('canvas');
// const faceStatus = document.getElementById('face-status');
// const loginForm = document.getElementById('login-form');

// // Global variables
// let stream = null;
// let faceDetectionInterval = null;
// let modelsLoaded = false;
// let faceDetected = false;
// let faceCaptured = false;
// let noFaceTimeout = null;

// // Initialize webcam and face-api models
// async function initialize() {
//   try {
//     await loadModels();
//     await startWebcam();
//     startFaceDetection();
//     startNoFaceTimer(); // Start the 10-second timer
//   } catch (error) {
//     console.error('Initialization error:', error);
//     faceStatus.textContent = 'Error initializing: ' + error.message;
//     faceStatus.className = 'mt-2 text-center status-error';
//   }
// }

// // Load face-api.js models
// async function loadModels() {
//   faceStatus.textContent = 'Loading face detection models...';
//   try {
//     await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
//     await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
//     modelsLoaded = true;
//     faceStatus.textContent = 'Models loaded successfully';
//     console.log('Face detection models loaded');
//   } catch (error) {
//     console.error('Error loading models:', error);
//     throw new Error('Failed to load face detection models');
//   }
// }

// // Start webcam
// async function startWebcam() {
//   try {
//     faceStatus.textContent = 'Requesting camera access...';
//     stream = await navigator.mediaDevices.getUserMedia({
//       video: {
//         width: { ideal: 640 },
//         height: { ideal: 480 },
//         facingMode: 'user'
//       }
//     });
//     video.srcObject = stream;
//     await new Promise((resolve) => {
//       video.onloadedmetadata = () => resolve();
//     });
//     await video.play();
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
//     faceStatus.textContent = 'Camera ready. Waiting for face...';
//     console.log('Webcam started successfully');
//   } catch (error) {
//     console.error('Error starting webcam:', error);
//     throw new Error('Failed to access camera');
//   }
// }

// // Start face detection with landmarks
// function startFaceDetection() {
//   if (!modelsLoaded) {
//     console.error('Models not loaded');
//     return;
//   }

//   if (faceDetectionInterval) {
//     clearInterval(faceDetectionInterval);
//   }

//   faceDetectionInterval = setInterval(async () => {
//     if (!video.paused && !video.ended && !faceCaptured) {
//       try {
//         const detections = await faceapi.detectAllFaces(
//           video,
//           new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
//         ).withFaceLandmarks(true);

//         const ctx = canvas.getContext('2d');
//         ctx.clearRect(0, 0, canvas.width, canvas.height);

//         if (detections.length > 0) {
//           canvas.classList.remove('d-none');
//           const resizedResults = faceapi.resizeResults(detections, {
//             width: canvas.width,
//             height: canvas.height
//           });

//           resizedResults.forEach(result => {
//             const { x, y, width, height } = result.detection.box;
//             ctx.strokeStyle = '#00ff00';
//             ctx.lineWidth = 3;
//             ctx.strokeRect(x, y, width, height);
//           });

//           faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

//           faceStatus.textContent = 'Face detected';
//           faceStatus.className = 'mt-2 text-center status-success';
//           faceDetected = true;
          
//           // Auto-capture the face after detection
//           if (faceDetected && !faceCaptured) {
//             captureAndVerify();
//           }
//         } else {
//           canvas.classList.add('d-none');
//           faceStatus.textContent = 'No face detected';
//           faceStatus.className = 'mt-2 text-center status-error';
//           faceDetected = false;
//         }
//       } catch (error) {
//         console.error('Face detection error:', error);
//         faceStatus.textContent = 'Detection error';
//         faceStatus.className = 'mt-2 text-center status-error';
//       }
//     }
//   }, 100);
// }

// // Start timer for no face detected
// function startNoFaceTimer() {
//   noFaceTimeout = setTimeout(() => {
//     if (!faceCaptured) {
//       if (faceDetectionInterval) {
//         clearInterval(faceDetectionInterval);
//       }
//       showAlert('Error', 'No face detected. Please refresh the page and try again.');
//       faceStatus.textContent = 'Timed out waiting for face';
//       faceStatus.className = 'mt-2 text-center status-error';
//     }
//   }, 7000); // 5 seconds
// }

// // Capture face and verify with landmarks
// async function captureAndVerify() {
//   if (!faceDetected) {
//     return false;
//   }

//   try {
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//     const detections = await faceapi.detectAllFaces(
//       canvas,
//       new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
//     ).withFaceLandmarks(true);

//     if (detections.length === 0) {
//       faceStatus.textContent = 'Face verification failed. Please try again.';
//       faceStatus.className = 'mt-2 text-center status-error';
//       return false;
//     }

//     if (detections.length > 1) {
//       faceStatus.textContent = 'Multiple faces detected. Please ensure only your face is visible.';
//       faceStatus.className = 'mt-2 text-center status-error';
//       return false;
//     }

//     // If we made it here, face verification was successful
//     faceCaptured = true;
//     clearTimeout(noFaceTimeout); // Clear the timeout since we've detected a face

//     const resizedResults = faceapi.resizeResults(detections, {
//       width: canvas.width,
//       height: canvas.height
//     });

//     faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

//     faceStatus.textContent = 'Face verified successfully';
//     faceStatus.className = 'mt-2 text-center status-success';
//     loginForm.classList.remove('d-none');

//     return true;
//   } catch (error) {
//     console.error('Capture error:', error);
//     showAlert('Error', 'Face verification failed: ' + error.message);
//     return false;
//   }
// }

// // Show Bootstrap alert modal
// function showAlert(title, message) {
//   const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
//   document.getElementById('alertModalTitle').textContent = title;
//   document.getElementById('alertModalBody').textContent = message;
//   alertModal.show();
// }

// // DOMContentLoaded event
// document.addEventListener('DOMContentLoaded', () => {
//   initialize();
// });

// // Clean up on unload
// window.addEventListener('beforeunload', () => {
//   if (faceDetectionInterval) {
//     clearInterval(faceDetectionInterval);
//   }
//   if (noFaceTimeout) {
//     clearTimeout(noFaceTimeout);
//   }
//   if (stream) {
//     stream.getTracks().forEach(track => track.stop());
//   }
// });

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceStatus = document.getElementById('face-status');
const loginForm = document.getElementById('login-form');
const webcamContainer = document.querySelector('.webcam-container');
const captureBtn = document.getElementById('capture-btn');

// Global variables
let stream = null;
let faceDetectionInterval = null;
let modelsLoaded = false;
let faceDetected = false;
let faceCaptured = false;
let noFaceTimeout = null;

// Initialize webcam and face-api models
async function initialize() {
  try {
    await loadModels();
    await startWebcam();
    startFaceDetection();
    startNoFaceTimer(); // Start the timer for face detection
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
    faceStatus.textContent = 'Camera ready. Waiting for face...';
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

// Start timer for no face detected
function startNoFaceTimer() {
  noFaceTimeout = setTimeout(() => {
    if (!faceCaptured) {
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
      }
      showAlert('Error', 'No face detected. Please try again.', true);
      faceStatus.textContent = 'Timed out waiting for face';
      faceStatus.className = 'mt-2 text-center status-error';
    }
  }, 7000); // 7 seconds
}

// Capture face and verify with landmarks
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
      return false;
    }

    if (detections.length > 1) {
      faceStatus.textContent = 'Multiple faces detected. Please ensure only your face is visible.';
      faceStatus.className = 'mt-2 text-center status-error';
      return false;
    }

    // If we made it here, face verification was successful
    faceCaptured = true;
    clearTimeout(noFaceTimeout); // Clear the timeout since we've detected a face
    
    // Stop face detection interval
    if (faceDetectionInterval) {
      clearInterval(faceDetectionInterval);
    }
    
    // Show face detected confirmation message
    faceStatus.textContent = 'Face detected successfully';
    faceStatus.className = 'mt-2 text-center status-success';
    
    // Wait for 1.5 seconds to show success message before hiding webcam
    setTimeout(() => {
      // Hide webcam container and show login form
      webcamContainer.style.display = 'none';
      if (captureBtn) captureBtn.style.display = 'none';
      loginForm.classList.remove('d-none');
      
      // Stop webcam stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }, 1500);

    return true;
  } catch (error) {
    console.error('Capture error:', error);
    showAlert('Error', 'Face verification failed: ' + error.message);
    return false;
  }
}

// Show Bootstrap alert modal with retry option
function showAlert(title, message, addRetryButton = false) {
  const alertModalElement = document.getElementById('alertModal');
  const alertModal = bootstrap.Modal.getInstance(alertModalElement) || new bootstrap.Modal(alertModalElement);
  document.getElementById('alertModalTitle').textContent = title;
  document.getElementById('alertModalBody').textContent = message;
  
  // Add retry button if requested
  const modalFooter = alertModalElement.querySelector('.modal-footer');
  
  // Remove any existing retry button
  const existingRetryBtn = document.getElementById('retry-face-detection');
  if (existingRetryBtn) {
    existingRetryBtn.remove();
  }
  
  if (addRetryButton) {
    const retryButton = document.createElement('button');
    retryButton.id = 'retry-face-detection';
    retryButton.className = 'btn btn-primary';
    retryButton.textContent = 'Close and Retry';
    retryButton.addEventListener('click', () => {
      alertModal.hide();
      retryFaceDetection();
    });
    modalFooter.prepend(retryButton);
  }
  
  alertModal.show();
}

// Retry face detection
function retryFaceDetection() {
  console.log('Retry face detection triggered');
  // Reset state
  faceCaptured = false;
  faceDetected = false;
  
  // Clear intervals and timeouts
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  if (noFaceTimeout) {
    clearTimeout(noFaceTimeout);
  }
  
  // Stop old stream if exists
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  // Make sure webcam container is visible
  webcamContainer.style.display = '';
  if (captureBtn) captureBtn.style.display = '';
  loginForm.classList.add('d-none');
  
  // Restart the process
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
