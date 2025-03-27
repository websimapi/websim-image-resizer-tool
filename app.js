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

    // Initialize the canvases with the default background color
    initializeCanvases();

    // Initialize settings
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

    // Update config when settings change
    vectorizeToggle.addEventListener('change', () => {
        config.vectorizeBeforeResize = vectorizeToggle.checked;
        vectorSettings.classList.toggle('visible', config.vectorizeBeforeResize);

        if (currentImage) {
            updatePreview();
            processImage(currentImage);
        }
    });

    posterizeThresholdSlider.addEventListener('input', () => {
        const value = posterizeThresholdSlider.value;
        posterizeThresholdValue.textContent = value;
        config.posterizeThreshold = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            processImage(currentImage);
        }
    });

    posterizeStepsSlider.addEventListener('input', () => {
        const value = posterizeStepsSlider.value;
        posterizeStepsValue.textContent = value;
        config.posterizeSteps = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            processImage(currentImage);
        }
    });

    turdSizeSlider.addEventListener('input', () => {
        const value = turdSizeSlider.value;
        turdSizeValue.textContent = value;
        config.turdSize = parseInt(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            processImage(currentImage);
        }
    });

    alphaMaxSlider.addEventListener('input', () => {
        const value = alphaMaxSlider.value;
        alphaMaxValue.textContent = value;
        config.alphaMax = parseFloat(value);
        if (currentImage && config.vectorizeBeforeResize) {
            updatePreview();
            processImage(currentImage);
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
        if (config.vectorizeBeforeResize) {
            vectorizeImage(imgToProcess)
                .then(vectorizedImg => {
                    resizeImage(vectorizedImg, canvas28, 28);
                    resizeImage(vectorizedImg, canvas56, 56);
                    resizeImage(vectorizedImg, canvas112, 112);
                    outputContainer.style.display = 'block';
                })
                .catch(error => {
                    console.error('Vectorization process failed:', error);
                    alert('Vectorization failed. Falling back to raster resizing. Check the browser console (F12) for more details.');
                    resizeImage(imgToProcess, canvas28, 28);
                    resizeImage(imgToProcess, canvas56, 56);
                    resizeImage(imgToProcess, canvas112, 112);
                    outputContainer.style.display = 'block';
                });
        } else {
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
        originalPreviewCanvas.width = originalImageObj.width * scale;
        originalPreviewCanvas.height = originalImageObj.height * scale;
        originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
        originalCtx.drawImage(originalImageObj, 0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);

        if (config.vectorizeBeforeResize) {
            vectorizeForPreview(originalImageObj);
        } else {
            const vectorCtx = vectorPreviewCanvas.getContext('2d');
            vectorPreviewCanvas.width = originalPreviewCanvas.width;
            vectorPreviewCanvas.height = originalPreviewCanvas.height;
            vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.fillStyle = '#eee';
            vectorCtx.fillRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.fillStyle = '#999';
            vectorCtx.textAlign = 'center';
            vectorCtx.fillText("Vectorization Disabled", vectorPreviewCanvas.width / 2, vectorPreviewCanvas.height / 2);
        }
    }

    function vectorizeForPreview(img) {
        try {
            const posterizer = new window.Potrace.Posterize();

            posterizer.setParameters({
                steps: config.posterizeSteps,
                threshold: config.posterizeThreshold,
                turdSize: config.turdSize,
                turnPolicy: window.Potrace.TURNPOLICY_MINORITY,
                alphaMax: config.alphaMax,
                optCurve: config.optCurve,
                optTolerance: config.optTolerance,
                fill: config.posterizeFill,
                background: config.posterizeBackground,
            });

            const scale = Math.min(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height);
            const previewWidth = Math.round(img.width * scale);
            const previewHeight = Math.round(img.height * scale);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = previewWidth;
            tempCanvas.height = previewHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

            posterizer.loadImageData(tempCtx.getImageData(0, 0, previewWidth, previewHeight));

            const svgData = posterizer.getSVG();

            const vectorCtx = vectorPreviewCanvas.getContext('2d');
            vectorPreviewCanvas.width = previewWidth;
            vectorPreviewCanvas.height = previewHeight;
            vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);

            const svgImg = new Image();
            svgImg.onload = () => {
                vectorCtx.drawImage(svgImg, 0, 0);
                URL.revokeObjectURL(svgImg.src);
            };
            svgImg.onerror = (e) => {
                console.error("Error loading SVG preview:", e);
                vectorCtx.fillStyle = '#fdd';
                vectorCtx.fillRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
                vectorCtx.fillStyle = '#900';
                vectorCtx.textAlign = 'center';
                vectorCtx.fillText("Preview Error", vectorPreviewCanvas.width / 2, vectorPreviewCanvas.height / 2);
            }

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            svgImg.src = URL.createObjectURL(svgBlob);

        } catch (error) {
            console.error('Preview vectorization error:', error);
            const vectorCtx = vectorPreviewCanvas.getContext('2d');
            vectorPreviewCanvas.width = originalPreviewCanvas.width;
            vectorPreviewCanvas.height = originalPreviewCanvas.height;
            vectorCtx.clearRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.fillStyle = '#fdd';
            vectorCtx.fillRect(0, 0, vectorPreviewCanvas.width, vectorPreviewCanvas.height);
            vectorCtx.fillStyle = '#900';
            vectorCtx.textAlign = 'center';
            vectorCtx.fillText("Vector Error", vectorPreviewCanvas.width / 2, vectorPreviewCanvas.height / 2);
        }
    }

    function vectorizeImage(img) {
        return new Promise((resolve, reject) => {
            try {
                const posterizer = new window.Potrace.Posterize();

                posterizer.setParameters({
                    steps: config.posterizeSteps,
                    threshold: config.posterizeThreshold,
                    turdSize: config.turdSize,
                    turnPolicy: window.Potrace.TURNPOLICY_MINORITY,
                    alphaMax: config.alphaMax,
                    optCurve: config.optCurve,
                    optTolerance: config.optTolerance,
                    fill: config.posterizeFill,
                    background: config.posterizeBackground,
                });

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth || img.width;
                tempCanvas.height = img.naturalHeight || img.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

                let imageData;
                try {
                    imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                } catch (e) {
                    console.error("Error getting ImageData (possibly tainted canvas):", e);
                    const cleanCanvas = document.createElement('canvas');
                    cleanCanvas.width = tempCanvas.width;
                    cleanCanvas.height = tempCanvas.height;
                    const cleanCtx = cleanCanvas.getContext('2d');
                    const freshImg = new Image();
                    freshImg.crossOrigin = "Anonymous";
                    freshImg.onload = () => {
                        cleanCtx.drawImage(freshImg, 0, 0);
                        try {
                            imageData = cleanCtx.getImageData(0, 0, cleanCanvas.width, cleanCanvas.height);
                            processImageData(posterizer, imageData, resolve, reject);
                        } catch (finalError) {
                            console.error("Could not get ImageData even after redraw:", finalError);
                            reject(new Error("Failed to process image data. Canvas might be tainted by cross-origin image."));
                        }
                    }
                    freshImg.onerror = () => {
                        reject(new Error("Failed to reload image for clean canvas."));
                    }
                    if (img.src && img.src.startsWith('data:')) {
                        freshImg.src = img.src;
                    } else {
                        reject(new Error("Failed to get image data and could not retry draw."));
                        return;
                    }
                    return;
                }

                if (imageData) {
                    processImageData(posterizer, imageData, resolve, reject);
                }

            } catch (error) {
                console.error("Error during vectorization setup or initial processing:", error);
                reject(error);
            }
        });
    }

    function processImageData(posterizer, imageData, resolve, reject) {
        try {
            posterizer.loadImageData(imageData);
            const svgData = posterizer.getSVG();

            if (!svgData || svgData.trim() === '') {
                console.error("Potrace generated empty SVG data.");
                reject(new Error("Vectorization resulted in empty SVG. Try different parameters or image."));
                return;
            }

            const vectorizedImg = new Image();
            vectorizedImg.onload = () => {
                URL.revokeObjectURL(vectorizedImg.src);
                resolve(vectorizedImg);
            };
            vectorizedImg.onerror = (e) => {
                URL.revokeObjectURL(vectorizedImg.src);
                console.error("Error loading generated SVG into Image element:", e);
                reject(new Error("Failed to load vectorized SVG image. The generated SVG might be invalid or too complex. See console."));
            };

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            vectorizedImg.src = URL.createObjectURL(svgBlob);

        } catch (processingError) {
            console.error("Error during Potrace processing or SVG generation:", processingError);
            reject(processingError);
        }
    }

    function resizeImage(img, canvas, size) {
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        ctx.clearRect(0, 0, size, size);

        if (!config.preserveTransparency && config.backgroundColor !== 'transparent') {
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, size, size);
        }

        const scale = Math.min(size / img.width, size / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (size - scaledWidth) / 2;
        const y = (size - scaledHeight) / 2;

        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }

    function handleDownload(e) {
        const size = e.target.getAttribute('data-size');
        const canvas = document.getElementById(`canvas${size}`);

        const link = document.createElement('a');
        link.download = `image_${size}x${size}.png`;

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

        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            const size = canvas.id.replace('canvas', '');
            canvas.width = parseInt(size);
            canvas.height = parseInt(size);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!config.preserveTransparency && config.backgroundColor !== 'transparent') {
                ctx.fillStyle = config.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        });

        const previewCanvases = [originalPreviewCanvas, vectorPreviewCanvas];
        previewCanvases.forEach(canvas => {
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = 10;
                canvas.height = 10;
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
        fileInput.value = '';
    }
});