import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
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
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const turdSizeSlider = document.getElementById('turdSizeSlider');
    const turdSizeValue = document.getElementById('turdSizeValue');
    const alphaMaxSlider = document.getElementById('alphaMaxSlider');
    const alphaMaxValue = document.getElementById('alphaMaxValue');
    const vectorSettings = document.querySelector('.vector-settings');
    
    let currentImage = null;
    let originalImageObj = null;
    const PREVIEW_SIZE = 250;

    // Initialize the canvases with the default background color
    initializeCanvases();
    
    // Initialize settings
    vectorizeToggle.checked = config.vectorizeBeforeResize;
    thresholdSlider.value = config.vectorizationThreshold;
    thresholdValue.textContent = config.vectorizationThreshold;
    turdSizeSlider.value = config.turdSize;
    turdSizeValue.textContent = config.turdSize;
    alphaMaxSlider.value = config.alphaMax;
    alphaMaxValue.textContent = config.alphaMax;
    
    if (config.vectorizeBeforeResize) {
        vectorSettings.classList.add('visible');
    }
    
    // Update config when settings change
    vectorizeToggle.addEventListener('change', () => {
        config.vectorizeBeforeResize = vectorizeToggle.checked;
        vectorSettings.classList.toggle('visible', config.vectorizeBeforeResize);
        
        if (currentImage) {
            updatePreview();
            processImage(currentImage);
        }
    });
    
    thresholdSlider.addEventListener('input', () => {
        const value = thresholdSlider.value;
        thresholdValue.textContent = value;
        config.vectorizationThreshold = parseInt(value);
        if (currentImage) {
            updatePreview();
        }
    });

    turdSizeSlider.addEventListener('input', () => {
        const value = turdSizeSlider.value;
        turdSizeValue.textContent = value;
        config.turdSize = parseInt(value);
        if (currentImage) {
            updatePreview();
        }
    });

    alphaMaxSlider.addEventListener('input', () => {
        const value = alphaMaxSlider.value;
        alphaMaxValue.textContent = value;
        config.alphaMax = parseFloat(value);
        if (currentImage) {
            updatePreview();
        }
    });

    // Handle file upload via click
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Handle drag and drop events
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
                processImage(file);
            } else {
                alert('Please upload an image file.');
            }
        }
    });

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            currentImage = file;
            processImage(file);
        } else {
            alert('Please upload an image file.');
        }
    }

    function processImage(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImageObj = img;
                
                // Show and update preview
                previewContainer.style.display = 'block';
                updatePreview();
                
                if (config.vectorizeBeforeResize) {
                    vectorizeImage(img)
                        .then(vectorizedImg => {
                            // Resize the vectorized image
                            resizeImage(vectorizedImg, canvas28, 28);
                            resizeImage(vectorizedImg, canvas56, 56);
                            resizeImage(vectorizedImg, canvas112, 112);
                            
                            // Show the output container
                            outputContainer.style.display = 'block';
                        })
                        .catch(error => {
                            console.error('Vectorization error:', error);
                            // Fallback to regular resizing if vectorization fails
                            resizeImage(img, canvas28, 28);
                            resizeImage(img, canvas56, 56);
                            resizeImage(img, canvas112, 112);
                            outputContainer.style.display = 'block';
                        });
                } else {
                    // Regular resize without vectorization
                    resizeImage(img, canvas28, 28);
                    resizeImage(img, canvas56, 56);
                    resizeImage(img, canvas112, 112);
                    
                    // Show the output container
                    outputContainer.style.display = 'block';
                }
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }
    
    function updatePreview() {
        if (!originalImageObj) return;
        
        // Draw original preview
        const originalCtx = originalPreviewCanvas.getContext('2d');
        
        // Resize canvas to fit image proportionally within PREVIEW_SIZE
        const scale = Math.min(PREVIEW_SIZE / originalImageObj.width, PREVIEW_SIZE / originalImageObj.height);
        originalPreviewCanvas.width = originalImageObj.width * scale;
        originalPreviewCanvas.height = originalImageObj.height * scale;
        
        // Clear canvas
        originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
        originalCtx.drawImage(originalImageObj, 0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
        
        // Generate vectorized preview if vectorize is enabled
        if (config.vectorizeBeforeResize) {
            vectorizeForPreview(originalImageObj);
        } else {
            // If vectorize is disabled, just copy the original to the vector preview
            const vectorCtx = vectorPreviewCanvas.getContext('2d');
            vectorPreviewCanvas.width = originalPreviewCanvas.width;
            vectorPreviewCanvas.height = originalPreviewCanvas.height;
            vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.drawImage(originalPreviewCanvas, 0, 0);
        }
    }
    
    function vectorizeForPreview(img) {
        try {
            // Create a temporary canvas for processing
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // Scale for preview
            const scale = Math.min(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height);
            tempCanvas.width = img.width * scale;
            tempCanvas.height = img.height * scale;
            
            // Draw the image to the canvas
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            if (!config.preserveTransparency) {
                tempCtx.fillStyle = config.backgroundColor;
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            }
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            
            // Configure and run potrace
            const potraceInstance = window.Potrace.create();
            potraceInstance.setParameter({
                turdSize: config.turdSize,
                turnPolicy: window.Potrace.TURNPOLICY_MINORITY,
                alphaMax: config.alphaMax,
                optCurve: config.optCurve,
                optTolerance: config.optTolerance,
                threshold: config.vectorizationThreshold
            });
            
            potraceInstance.loadImageFromDataURL(tempCanvas.toDataURL());
            
            // Generate SVG
            const svgData = potraceInstance.getSVG(1);
            
            // Set up vector preview canvas
            vectorPreviewCanvas.width = tempCanvas.width;
            vectorPreviewCanvas.height = tempCanvas.height;
            
            // Draw the SVG to the preview canvas
            const vectorizedImg = new Image();
            vectorizedImg.onload = () => {
                const vectorCtx = vectorPreviewCanvas.getContext('2d');
                vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
                vectorCtx.drawImage(vectorizedImg, 0, 0);
            };
            
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml'});
            const svgUrl = URL.createObjectURL(svgBlob);
            vectorizedImg.src = svgUrl;
            
        } catch (error) {
            console.error('Preview vectorization error:', error);
            // On error, just copy the original
            const vectorCtx = vectorPreviewCanvas.getContext('2d');
            vectorPreviewCanvas.width = originalPreviewCanvas.width;
            vectorPreviewCanvas.height = originalPreviewCanvas.height;
            vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.drawImage(originalPreviewCanvas, 0, 0);
        }
    }
    
    function vectorizeImage(img) {
        return new Promise((resolve, reject) => {
            try {
                // Create a temporary canvas for processing
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                
                // Draw the image to the canvas
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                if (!config.preserveTransparency) {
                    tempCtx.fillStyle = config.backgroundColor;
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                }
                tempCtx.drawImage(img, 0, 0);
                
                // Configure and run potrace
                const potraceInstance = window.Potrace.create();
                potraceInstance.setParameter({
                    turdSize: config.turdSize,
                    turnPolicy: window.Potrace.TURNPOLICY_MINORITY,
                    alphaMax: config.alphaMax,
                    optCurve: config.optCurve,
                    optTolerance: config.optTolerance,
                    threshold: config.vectorizationThreshold
                });
                
                potraceInstance.loadImageFromDataURL(tempCanvas.toDataURL());
                
                // Create a new image from the SVG
                const vectorizedImg = new Image();
                vectorizedImg.onload = () => resolve(vectorizedImg);
                vectorizedImg.onerror = (e) => reject(e);
                
                // Generate SVG
                const svgData = potraceInstance.getSVG(1);
                const svgBlob = new Blob([svgData], {type: 'image/svg+xml'});
                const svgUrl = URL.createObjectURL(svgBlob);
                vectorizedImg.src = svgUrl;
            } catch (error) {
                reject(error);
            }
        });
    }

    function resizeImage(img, canvas, size) {
        const ctx = canvas.getContext('2d');
        
        // Clear the canvas (with transparency)
        ctx.clearRect(0, 0, size, size);
        
        // Only fill with background color if not preserving transparency
        if (!config.preserveTransparency) {
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, size, size);
        }
        
        // Calculate aspect ratio to maintain proportions
        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        
        // Draw the resized image
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    function handleDownload(e) {
        const size = e.target.getAttribute('data-size');
        const canvas = document.getElementById(`canvas${size}`);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.download = `image_${size}x${size}.png`;
        
        // Convert canvas to data URL and set as link href
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', handleDownload);
    });

    function initializeCanvases() {
        const canvases = [canvas28, canvas56, canvas112];
        
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            // Clear with transparency if preserving transparency
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Only fill with background color if not preserving transparency
            if (!config.preserveTransparency) {
                ctx.fillStyle = config.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        });
    }
});