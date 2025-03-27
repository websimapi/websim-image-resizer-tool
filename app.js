import { config } from './config.js';
import { vectorizeImage, vectorizeForPreview } from './vectorizer.js';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.Potrace === 'undefined') {
        alert('Error: Potrace library failed to load. Vectorization will not work.');
        const vectorizeToggle = document.getElementById('vectorizeToggle');
        const vectorSettings = document.querySelector('.vector-settings');
        if(vectorizeToggle) vectorizeToggle.disabled = true;
        if(vectorSettings) vectorSettings.style.display = 'none';
    }

    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const outputContainer = document.getElementById('outputContainer');
    const originalPreviewCanvas = document.getElementById('originalPreview');
    const vectorPreviewCanvas = document.getElementById('vectorPreview');
    const canvas28 = document.getElementById('canvas28');
    const canvas56 = document.getElementById('canvas56');
    const canvas112 = document.getElementById('canvas112');
    const vectorizeToggle = document.getElementById('vectorizeToggle');
    const posterizeThresholdSlider = document.getElementById('posterizeThresholdSlider');
    const posterizeThresholdValue = document.getElementById('posterizeThresholdValue');
    const posterizeStepsSlider = document.getElementById('posterizeStepsSlider');
    const posterizeStepsValue = document.getElementById('posterizeStepsValue');
    const turdSizeSlider = document.getElementById('turdSizeSlider');
    const turdSizeValue = document.getElementById('turdSizeValue');
    const alphaMaxSlider = document.getElementById('alphaMaxSlider');
    const alphaMaxValue = document.getElementById('alphaMaxValue');
    const vectorSettings = document.querySelector('.vector-settings');

    let currentImage = null;
    let originalImageObj = null;
    const PREVIEW_SIZE = 250;

    initializeCanvases();

    vectorizeToggle.checked = config.vectorizeBeforeResize;
    posterizeThresholdSlider.value = config.posterizeThreshold;
    posterizeThresholdValue.textContent = config.posterizeThreshold;
    posterizeStepsSlider.value = config.posterizeSteps;
    posterizeStepsValue.textContent = config.posterizeSteps;
    turdSizeSlider.value = config.turdSize;
    turdSizeValue.textContent = config.turdSize;
    alphaMaxSlider.value = config.alphaMax;
    alphaMaxValue.textContent = config.alphaMax;

    if (config.vectorizeBeforeResize) {
        vectorSettings.classList.add('visible');
    }

    vectorizeToggle.addEventListener('change', () => {
        config.vectorizeBeforeResize = vectorizeToggle.checked;
        vectorSettings.classList.toggle('visible', config.vectorizeBeforeResize);

        if (currentImage) {
            updatePreview();
            applyProcessing(originalImageObj);
        }
    });

    posterizeThresholdSlider.addEventListener('input', () => {
        const value = posterizeThresholdSlider.value;
        posterizeThresholdValue.textContent = value;
        config.posterizeThreshold = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            applyProcessing(originalImageObj);
        }
    });

    posterizeStepsSlider.addEventListener('input', () => {
        const value = posterizeStepsSlider.value;
        posterizeStepsValue.textContent = value;
        config.posterizeSteps = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            applyProcessing(originalImageObj);
        }
    });

    turdSizeSlider.addEventListener('input', () => {
        const value = turdSizeSlider.value;
        turdSizeValue.textContent = value;
        config.turdSize = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            applyProcessing(originalImageObj);
        }
    });

    alphaMaxSlider.addEventListener('input', () => {
        const value = alphaMaxSlider.value;
        alphaMaxValue.textContent = value;
        config.alphaMax = parseFloat(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            applyProcessing(originalImageObj);
        }
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');

        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            if (file.type.match('image.*')) {
                currentImage = file;
                handleImageFile(file);
            } else {
                alert('Please upload an image file.');
            }
        }
    });

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            currentImage = file;
            handleImageFile(file);
        } else {
            alert('Please upload an image file.');
        }
    }

    function handleImageFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImageObj = img;

                previewContainer.style.display = 'block';
                updatePreview();

                applyProcessing(img);
            };
            img.onerror = () => {
                alert("Failed to load image.");
                resetUI();
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert("Failed to read file.");
            resetUI();
        };
        reader.readAsDataURL(file);
    }

    function applyProcessing(imgToProcess) {
        if (!imgToProcess) {
            console.error("applyProcessing called with no image.");
            return;
        }
        const useVector = config.vectorizeBeforeResize && typeof window.Potrace !== 'undefined';

        if (useVector) {
            vectorizeImage(imgToProcess)
                .then(vectorizedImg => {
                    if (!config.vectorizeBeforeResize) {
                        console.log("Vectorization finished, but toggle switched off. Using original for resize.");
                        resizeImage(imgToProcess, canvas28, 28);
                        resizeImage(imgToProcess, canvas56, 56);
                        resizeImage(imgToProcess, canvas112, 112);
                    } else {
                        resizeImage(vectorizedImg, canvas28, 28);
                        resizeImage(vectorizedImg, canvas56, 56);
                        resizeImage(vectorizedImg, canvas112, 112);
                    }
                    outputContainer.style.display = 'block';
                })
                .catch(error => {
                    console.error('Vectorization process failed:', error);
                    alert(`Vectorization failed: ${error.message}. Falling back to raster resizing. Check console (F12) for details.`);
                    resizeImage(imgToProcess, canvas28, 28);
                    resizeImage(imgToProcess, canvas56, 56);
                    resizeImage(imgToProcess, canvas112, 112);
                    outputContainer.style.display = 'block';
                });
        } else {
            if (config.vectorizeBeforeResize && typeof window.Potrace === 'undefined') {
                console.warn("Vectorization skipped because Potrace library is not loaded.");
            }
            resizeImage(imgToProcess, canvas28, 28);
            resizeImage(imgToProcess, canvas56, 56);
            resizeImage(imgToProcess, canvas112, 112);
            outputContainer.style.display = 'block';
        }
    }

    function updatePreview() {
        if (!originalImageObj) return;

        const originalCtx = originalPreviewCanvas.getContext('2d');
        const scale = Math.min(PREVIEW_SIZE / originalImageObj.width, PREVIEW_SIZE / originalImageObj.height);
        const previewWidth = Math.round(originalImageObj.width * scale);
        const previewHeight = Math.round(originalImageObj.height * scale);

        originalPreviewCanvas.width = previewWidth;
        originalPreviewCanvas.height = previewHeight;
        originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
        originalCtx.drawImage(originalImageObj, 0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);

        const useVectorPreview = config.vectorizeBeforeResize && typeof window.Potrace !== 'undefined';
        if (useVectorPreview) {
            vectorizeForPreview(originalImageObj, vectorPreviewCanvas, originalPreviewCanvas);
        } else {
            const vectorCtx = vectorPreviewCanvas.getContext('2d');
            vectorPreviewCanvas.width = previewWidth;
            vectorPreviewCanvas.height = previewHeight;
            vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.fillStyle = '#eee';
            vectorCtx.fillRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.fillStyle = '#999';
            vectorCtx.textAlign = 'center';
            const message = (typeof window.Potrace === 'undefined' && config.vectorizeBeforeResize)
                ? "Potrace Error"
                : "Vectorization Disabled";
            vectorCtx.fillText(message, vectorPreviewCanvas.width / 2, vectorPreviewCanvas.height / 2);
        }
    }

    function resizeImage(img, canvas, size) {
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        ctx.clearRect(0, 0, size, size);

        if (!config.preserveTransparency && config.backgroundColor && config.backgroundColor !== 'transparent') {
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, size, size);
        }

        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        const scale = Math.min(size / imgWidth, size / imgHeight);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (size - scaledWidth) / 2;
        const y = (size - scaledHeight) / 2;

        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }

    function handleDownload(e) {
        const size = e.target.getAttribute('data-size');
        const canvas = document.getElementById(`canvas${size}`);
        const link = document.createElement('a');
        const filename = currentImage ? currentImage.name.replace(/\.[^/.]+$/, "") : 'image';
        link.download = `${filename}_${size}x${size}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', handleDownload);
    });

    function initializeCanvases() {
        const canvases = [canvas28, canvas56, canvas112];
        const defaultSize = 10;

        canvases.forEach(canvas => {
            if (!canvas) return;
            const size = parseInt(canvas.id.replace('canvas', '')) || defaultSize;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!config.preserveTransparency && config.backgroundColor && config.backgroundColor !== 'transparent') {
                ctx.fillStyle = config.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        });

        const previewCanvases = [originalPreviewCanvas, vectorPreviewCanvas];
        previewCanvases.forEach(canvas => {
            if (canvas) {
                canvas.width = defaultSize;
                canvas.height = defaultSize;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    }

    function resetUI() {
        currentImage = null;
        originalImageObj = null;
        previewContainer.style.display = 'none';
        outputContainer.style.display = 'none';
        initializeCanvases();
        if(fileInput) fileInput.value = '';
    }
});