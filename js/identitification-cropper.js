/**
 * Cropper Utilities for Identitification circular profile picture cropper
 */

let cropperInstance = null;
let cropperContext = 'profile'; // 'profile' or 'register'
let tempProfilePfpDataUrl = '';

/**
 * Creates a circular cropped image from standard cropper canvas
 * @param {HTMLCanvasElement} sourceCanvas 
 * @returns {HTMLCanvasElement} Rounded Canvas
 */
function getRoundedCanvas(sourceCanvas) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  
  context.beginPath();
  context.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI, true);
  context.clip();
  
  context.drawImage(sourceCanvas, 0, 0, width, height);
  return canvas;
}

/**
 * Initializes and displays Cropper modal for a chosen image file
 * @param {Event} e Input change event
 * @param {string} context 'profile' or 'register'
 */
function handlePfpUpload(e, context) {
  cropperContext = context;
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    alert('Please choose a smaller image file (under 2MB).');
    e.target.value = '';
    return;
  }
  
  const url = URL.createObjectURL(file);
  const cropperImage = document.getElementById('cropper-image');
  if (cropperImage) {
    cropperImage.src = url;
  }
  
  document.getElementById('cropper-modal').style.display = 'flex';
  
  setTimeout(() => {
    if (cropperInstance) {
      cropperInstance.destroy();
    }
    // eslint-disable-next-line no-undef
    cropperInstance = new Cropper(cropperImage, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.9,
      restore: false,
      guides: false,
      center: false,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  }, 150);
}

/**
 * Applies the current crop, generates Base64 image, and updates UI previews
 */
function applyCrop() {
  if (cropperInstance) {
    const canvas = cropperInstance.getCroppedCanvas({
      width: 120,
      height: 120
    });
    if (canvas) {
      const roundedCanvas = getRoundedCanvas(canvas);
      const dataUrl = roundedCanvas.toDataURL('image/png');
      
      if (cropperContext === 'profile') {
        tempProfilePfpDataUrl = dataUrl;
        const previewEl = document.getElementById('profile-pfp-preview');
        const statusEl = document.getElementById('profile-pfp-preview-status');
        if (previewEl) {
          previewEl.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
        if (statusEl) {
          statusEl.textContent = 'New photo cropped & ready!';
        }
      } else if (cropperContext === 'register') {
        const pfpInput = document.getElementById('register-pfp-data');
        if (pfpInput) pfpInput.value = dataUrl;
        
        const previewEl = document.getElementById('register-pfp-preview');
        const containerEl = document.getElementById('register-pfp-preview-container');
        if (previewEl && containerEl) {
          previewEl.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          containerEl.style.display = 'flex';
        }
      }
    }
  }
  closeCropperModal();
}

/**
 * Destroys current Cropper instance and hides modal
 */
function closeCropperModal() {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  document.getElementById('cropper-modal').style.display = 'none';
  const fileInputProfile = document.getElementById('profile-settings-pfp-file');
  if (fileInputProfile) fileInputProfile.value = '';
  const fileInputRegister = document.getElementById('register-pfp-file');
  if (fileInputRegister) fileInputRegister.value = '';
}

function getTempProfilePfpDataUrl() {
  return tempProfilePfpDataUrl;
}

function setTempProfilePfpDataUrl(val) {
  tempProfilePfpDataUrl = val;
}

// Expose utilities globally
window.IdentitificationCropper = {
  getRoundedCanvas,
  handlePfpUpload,
  applyCrop,
  closeCropperModal,
  getTempProfilePfpDataUrl,
  setTempProfilePfpDataUrl
};
