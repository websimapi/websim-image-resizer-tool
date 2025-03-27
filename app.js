'use strict';
import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const outputContainer = document.getElementById('outputContainer');
    const canvas28 = document.getElementById('canvas28');
    const canvas56 = document.getElementById('canvas56');
    const canvas112 = document.getElementById('canvas112');
    const cropContainer = document.getElementById('cropContainer');
    const cropCanvas = document.getElementById('cropCanvas');
    const cropConfirmBtn = document.getElementById('cropConfirmBtn');
    const cropCancelBtn = document.getElementById('cropCancelBtn');

    // Crop variables
    let originalImage = null;
    let cropX = 0;
    let cropY = 0;
    let cropWidth = 0;
    let cropHeight = 0;
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = '';
    let startX = 0;
    let startY = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;

    // Initialize the canvases with the default background color
    initializeCanvases();

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

    // Handle download button clicks
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', handleDownload);
    });

    function handleFileSelect(e) {
        // Reset file input to allow selecting the same file again
        e.target.value = null;
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            processImage(file);
        } else if (file) { 
            alert('Please upload an image file.');
        }
    }

    function processImage(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                showCropInterface(img);
            };
            img.onerror = () => { 
                alert('Error loading image. The file might be corrupted or in an unsupported format.');
                resetUI();
            };
            img.src = e.target.result;
        };
        reader.onerror = () => { 
             alert('Error reading file.');
             resetUI();
        };

        reader.readAsDataURL(file);
    }

    function showCropInterface(img) {
        // Hide other sections and show crop interface
        outputContainer.style.display = 'none';
        dropArea.style.display = 'none'; 
        cropContainer.style.display = 'block';

        // Setup the canvas for cropping
        const ctx = cropCanvas.getContext('2d');

        // Calculate dimensions to fit the image in the canvas while maintaining aspect ratio
        const maxCanvasWidth = cropContainer.clientWidth > 50 ? cropContainer.clientWidth - 40 : 300;
        const maxCanvasHeight = window.innerHeight * 0.6; 

        let targetWidth = img.width;
        let targetHeight = img.height;
        let scale = 1;

        // Scale down if image width exceeds max canvas width
        if (targetWidth > maxCanvasWidth) {
            scale = maxCanvasWidth / targetWidth;
            targetWidth = maxCanvasWidth;
            targetHeight *= scale;
        }

        // Scale down further if image height exceeds max canvas height
        if (targetHeight > maxCanvasHeight) {
            scale = maxCanvasHeight / targetHeight;
            targetWidth *= scale;
            targetHeight = maxCanvasHeight;
        }

        // Use integer dimensions for the canvas to avoid potential rendering issues
        canvasWidth = Math.max(1, Math.round(targetWidth)); 
        canvasHeight = Math.max(1, Math.round(targetHeight)); 

        if (canvasWidth <= 1 || canvasHeight <= 1) {
            console.error("Calculated canvas dimensions are too small:", canvasWidth, canvasHeight);
            alert("Could not display image for cropping. Calculated dimensions too small.");
            resetUI();
            return;
        }

        cropCanvas.width = canvasWidth;
        cropCanvas.height = canvasHeight;

        // Initialize crop area to 80% of the image, centered
        cropWidth = canvasWidth * 0.8;
        cropHeight = canvasHeight * 0.8;
        cropX = (canvasWidth - cropWidth) / 2;
        cropY = (canvasHeight - cropHeight) / 2;

        // Apply aspect ratio constraint if needed, adjusting the initial crop box
        if (config.cropAspectRatio) {
            const aspectRatio = config.cropAspectRatio;
            const currentRatio = cropWidth / cropHeight;
            if (currentRatio > aspectRatio) { 
                cropWidth = cropHeight * aspectRatio;
                cropX = (canvasWidth - cropWidth) / 2; 
            } else { 
                cropHeight = cropWidth / aspectRatio;
                cropY = (canvasHeight - cropHeight) / 2; 
            }
        }

        // Draw the initial crop overlay (includes drawing the image)
        drawCropOverlay();

        // Setup crop area event listeners
        setupCropEvents();
    }

    function setupCropEvents() {
        // Remove previous listeners to avoid duplicates if re-cropping
        removeCropEvents();

        cropCanvas.addEventListener('mousedown', onMouseDown);
        cropCanvas.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp); 
        cropCanvas.addEventListener('mouseleave', onMouseLeave); 

        cropConfirmBtn.addEventListener('click', applyCrop);
        cropCancelBtn.addEventListener('click', cancelCrop);
    }

    function removeCropEvents() {
        cropCanvas.removeEventListener('mousedown', onMouseDown);
        cropCanvas.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp); 
        cropCanvas.removeEventListener('mouseleave', onMouseLeave);

        cropConfirmBtn.removeEventListener('click', applyCrop);
        cropCancelBtn.removeEventListener('click', cancelCrop);
    }

    function onMouseDown(e) {
        if (e.target !== cropCanvas) return;
        startX = e.offsetX;
        startY = e.offsetY;

        // Check if clicking on a resize handle
        const corner = getResizeHandle(startX, startY);
        if (corner) {
            isResizing = true;
            isDragging = false; 
            resizeHandle = corner;
            return;
        }

        // Check if clicking inside the crop area
        if (startX >= cropX && startX <= cropX + cropWidth &&
            startY >= cropY && startY <= cropY + cropHeight) {
            isDragging = true;
            isResizing = false; 
        } else {
            isDragging = false;
            isResizing = false;
        }
    }

    function onMouseMove(e) {
        if (!isDragging && !isResizing) {
            updateCursor(e.offsetX, e.offsetY);
            return;
        }

        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        if (isResizing) {
            resizeCropArea(mouseX, mouseY);
            startX = mouseX;
            startY = mouseY;
        } else if (isDragging) {
            const dx = mouseX - startX;
            const dy = mouseY - startY;

            const newCropX = cropX + dx;
            const newCropY = cropY + dy;

            cropX = Math.max(0, Math.min(canvasWidth - cropWidth, newCropX));
            cropY = Math.max(0, Math.min(canvasHeight - cropHeight, newCropY));

            startX = mouseX;
            startY = mouseY;
        }

        drawCropOverlay();
    }

    function onMouseUp() {
        if (isDragging || isResizing) {
            isDragging = false;
            isResizing = false;
        }
    }

    function onMouseLeave() {
        if (isDragging || isResizing) {
             onMouseUp();
        }
        cropCanvas.style.cursor = 'default';
    }

    function getResizeHandle(x, y) {
        const cornerSize = config.cropperCornerSize;
        const halfCornerSize = cornerSize / 2;

        const handleMargin = cornerSize; 

        if (x >= cropX - handleMargin && x <= cropX + handleMargin && y >= cropY - handleMargin && y <= cropY + handleMargin) return 'tl';
        if (x >= cropX + cropWidth - handleMargin && x <= cropX + cropWidth + handleMargin && y >= cropY - handleMargin && y <= cropY + handleMargin) return 'tr';
        if (x >= cropX - handleMargin && x <= cropX + handleMargin && y >= cropY + cropHeight - handleMargin && y <= cropY + cropHeight + handleMargin) return 'bl';
        if (x >= cropX + cropWidth - handleMargin && x <= cropX + cropWidth + handleMargin && y >= cropY + cropHeight - handleMargin && y <= cropY + cropHeight + handleMargin) return 'br';

        return null;
    }

    function updateCursor(x, y) {
        const corner = getResizeHandle(x, y);
        let cursorStyle = 'default';

        if (corner) {
            if (corner === 'tl' || corner === 'br') {
                cursorStyle = 'nwse-resize';
            } else if (corner === 'tr' || corner === 'bl') {
                cursorStyle = 'nesw-resize';
            }
        } else if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
            if (!isResizing) {
                cursorStyle = 'move';
            }
        }

        cropCanvas.style.cursor = cursorStyle;
    }

    function resizeCropArea(mouseX, mouseY) {
        const minSize = 20; 
        const aspectRatio = config.cropAspectRatio;

        let newX = cropX;
        let newY = cropY;
        let newWidth = cropWidth;
        let newHeight = cropHeight;

        switch (resizeHandle) {
            case 'tl':
                newWidth = cropX + cropWidth - mouseX;
                newHeight = cropY + cropHeight - mouseY;
                newX = mouseX;
                newY = mouseY;
                break;
            case 'tr':
                newWidth = mouseX - cropX;
                newHeight = cropY + cropHeight - mouseY;
                newY = mouseY;
                break;
            case 'bl':
                newWidth = cropX + cropWidth - mouseX;
                newHeight = mouseY - cropY;
                newX = mouseX;
                break;
            case 'br':
                newWidth = mouseX - cropX;
                newHeight = mouseY - cropY;
                break;
        }

        if (aspectRatio) {
            let targetHeight = newWidth / aspectRatio;
            let targetWidth = newHeight * aspectRatio;

            targetHeight = Math.max(minSize, newWidth / aspectRatio);
            if (resizeHandle === 'tl' || resizeHandle === 'tr') { 
                 newY = (newY + newHeight) - targetHeight; 
            }
            newHeight = targetHeight;
        }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        if (newWidth < minSize) {
             if (resizeHandle === 'tl' || resizeHandle === 'bl') { 
                 newX = cropX + cropWidth - minSize; 
             }
            newWidth = minSize;
        }
        if (newHeight < minSize) {
             if (resizeHandle === 'tl' || resizeHandle === 'tr') { 
                 newY = cropY + cropHeight - minSize; 
             }
            newHeight = minSize;
        }

        if (newX + newWidth > canvasWidth) {
            newWidth = canvasWidth - newX;
            if (aspectRatio) {
                 newHeight = Math.max(minSize, newWidth / aspectRatio);
                 if (resizeHandle === 'tl' || resizeHandle === 'tr') {
                     newY = Math.max(0, (cropY + cropHeight) - newHeight);
                 }
             }
        }
        if (newY + newHeight > canvasHeight) {
            newHeight = canvasHeight - newY;
            if (aspectRatio) {
                 newWidth = Math.max(minSize, newHeight * aspectRatio);
                 if (resizeHandle === 'tl' || resizeHandle === 'bl') {
                      newX = Math.max(0, (cropX + cropWidth) - newWidth);
                 }
             }
        }

        newWidth = Math.max(minSize, newWidth);
        newHeight = Math.max(minSize, newHeight);

        newX = Math.max(0, Math.min(canvasWidth - newWidth, newX));
        newY = Math.max(0, Math.min(canvasHeight - newHeight, newY));

        cropX = newX;
        cropY = newY;
        cropWidth = newWidth;
        cropHeight = newHeight;
    }

    function drawCropOverlay() {
        const ctx = cropCanvas.getContext('2d');
        if (!ctx || !originalImage) return; 

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        ctx.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.save();
        ctx.beginPath();
        ctx.rect(cropX, cropY, cropWidth, cropHeight);
        ctx.clip();
        ctx.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();

        ctx.strokeStyle = config.cropperLineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

        const handleSize = config.cropperCornerSize;
        const halfHandleSize = handleSize / 2;
        ctx.fillStyle = config.cropperLineColor;

        ctx.fillRect(cropX - halfHandleSize, cropY - halfHandleSize, handleSize, handleSize); 
        ctx.fillRect(cropX + cropWidth - halfHandleSize, cropY - halfHandleSize, handleSize, handleSize); 
        ctx.fillRect(cropX - halfHandleSize, cropY + cropHeight - halfHandleSize, handleSize, handleSize); 
        ctx.fillRect(cropX + cropWidth - halfHandleSize, cropY + cropHeight - halfHandleSize, handleSize, handleSize); 
    }

    function applyCrop() {
        if (!originalImage) return;

        removeCropEvents();

        const scaleX = originalImage.width / canvasWidth;
        const scaleY = originalImage.height / canvasHeight;

        const originalCropX = Math.floor(cropX * scaleX);
        const originalCropY = Math.floor(cropY * scaleY);
        const originalCropWidth = Math.ceil(cropWidth * scaleX);
        const originalCropHeight = Math.ceil(cropHeight * scaleY);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(1, originalCropWidth);
        tempCanvas.height = Math.max(1, originalCropHeight);

        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
            alert("Failed to create temporary canvas for cropping.");
            resetUI();
            return;
        }
        tempCtx.drawImage(
            originalImage,
            originalCropX, originalCropY, 
            originalCropWidth, originalCropHeight,
            0, 0, 
            tempCanvas.width, tempCanvas.height 
        );

        const croppedImg = new Image();
        croppedImg.onload = () => {
            resizeImage(croppedImg, canvas28, 28);
            resizeImage(croppedImg, canvas56, 56);
            resizeImage(croppedImg, canvas112, 112);

            cropContainer.style.display = 'none';
            outputContainer.style.display = 'block';
            dropArea.style.display = 'none'; 

            // originalImage = null; 
        };
        croppedImg.onerror = () => {
            alert("Failed to process cropped image data.");
            resetUI();
        };
        croppedImg.src = tempCanvas.toDataURL(); 
    }

    function cancelCrop() {
        removeCropEvents();
        resetUI();
    }

    function resetUI() {
        originalImage = null;
        cropContainer.style.display = 'none';
        outputContainer.style.display = 'none';
        dropArea.style.display = 'block'; 

        initializeCanvases();
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
            cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        }
        fileInput.value = null;
    }

    function resizeImage(img, canvas, size) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, size, size);

        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, size, size);

        const scale = Math.min(size / img.width, size / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        const x = (size - scaledWidth) / 2;
        const y = (size - scaledHeight) / 2;

        ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(scaledWidth), Math.round(scaledHeight));
    }

    function handleDownload(e) {
        const size = e.target.getAttribute('data-size');
        if (!size) return;
        const canvas = document.getElementById(`canvas${size}`);
        if (!canvas) return;

        const link = document.createElement('a');
        const filename = originalImage ? `cropped_${size}x${size}.png` : `image_${size}x${size}.png`;
        link.download = filename;

        try {
            link.href = canvas.toDataURL('image/png');

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error generating download link:", err);
            alert("Could not generate download file.");
        }
    }

    function initializeCanvases() {
        const canvases = [canvas28, canvas56, canvas112];

        canvases.forEach(canvas => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
    }
});