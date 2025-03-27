import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const outputContainer = document.getElementById('outputContainer');
    const canvas28 = document.getElementById('canvas28');
    const canvas56 = document.getElementById('canvas56');
    const canvas112 = document.getElementById('canvas112');
    const vectorizeToggle = document.getElementById('vectorizeToggle');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    
    let currentImage = null;

    // Initialize the canvases with the default background color
    initializeCanvases();
    
    // Initialize settings
    vectorizeToggle.checked = config.vectorizeBeforeResize;
    thresholdSlider.value = config.vectorizationThreshold;
    thresholdValue.textContent = config.vectorizationThreshold;
    
    // Update config when settings change
    vectorizeToggle.addEventListener('change', () => {
        config.vectorizeBeforeResize = vectorizeToggle.checked;
        if (currentImage) {
            processImage(currentImage);
        }
    });
    
    thresholdSlider.addEventListener('input', () => {
        const value = thresholdSlider.value;
        thresholdValue.textContent = value;
        config.vectorizationThreshold = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            processImage(currentImage);
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
                
                // Get image data for processing
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                
                // Configure and run potrace
                const potraceInstance = window.Potrace.create();
                potraceInstance.setParameter({
                    turdSize: 2,
                    turnPolicy: window.Potrace.TURNPOLICY_MINORITY,
                    alphaMax: 1,
                    optCurve: true,
                    optTolerance: 0.2,
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

    // Handle download button clicks
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', handleDownload);
    });

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