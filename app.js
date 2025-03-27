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
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
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
                originalImage = img;
                showCropInterface(img);
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    function showCropInterface(img) {
        // Hide main output and show crop interface
        outputContainer.style.display = 'none';
        cropContainer.style.display = 'block';

        // Setup the canvas for cropping
        const ctx = cropCanvas.getContext('2d');

        // Calculate dimensions to fit the image in the canvas while maintaining aspect ratio
        const maxWidth = cropContainer.clientWidth - 40;
        const maxHeight = window.innerHeight * 0.6;

        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        canvasWidth = img.width * scale;
        canvasHeight = img.height * scale;

        cropCanvas.width = canvasWidth;
        cropCanvas.height = canvasHeight;

        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // Initialize crop area to 80% of the image
        cropWidth = canvasWidth * 0.8;
        cropHeight = canvasHeight * 0.8;
        cropX = (canvasWidth - cropWidth) / 2;
        cropY = (canvasHeight - cropHeight) / 2;

        // Draw the crop overlay
        drawCropOverlay();

        // Setup crop area event listeners
        setupCropEvents();
    }

    function setupCropEvents() {
        cropCanvas.addEventListener('mousedown', onMouseDown);
        cropCanvas.addEventListener('mousemove', onMouseMove);
        cropCanvas.addEventListener('mouseup', onMouseUp);
        cropCanvas.addEventListener('mouseleave', onMouseUp);

        cropConfirmBtn.addEventListener('click', applyCrop);
    }

    function onMouseDown(e) {
        startX = e.offsetX;
        startY = e.offsetY;

        // Check if clicking on a resize handle
        const corner = getResizeHandle(startX, startY);
        if (corner) {
            isResizing = true;
            resizeHandle = corner;
            return;
        }

        // Check if clicking inside the crop area
        if (startX >= cropX && startX <= cropX + cropWidth &&
            startY >= cropY && startY <= cropY + cropHeight) {
            isDragging = true;
        }
    }

    function onMouseMove(e) {
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        // Update cursor style based on position
        updateCursor(mouseX, mouseY);

        if (isResizing) {
            resizeCropArea(mouseX, mouseY);
            drawCropOverlay();
            return;
        }

        if (isDragging) {
            // Move the crop area
            const dx = mouseX - startX;
            const dy = mouseY - startY;

            cropX = Math.max(0, Math.min(canvasWidth - cropWidth, cropX + dx));
            cropY = Math.max(0, Math.min(canvasHeight - cropHeight, cropY + dy));

            startX = mouseX;
            startY = mouseY;

            drawCropOverlay();
        }
    }

    function onMouseUp() {
        isDragging = false;
        isResizing = false;
    }

    function getResizeHandle(x, y) {
        const cornerSize = config.cropperCornerSize;

        // Check top-left corner
        if (Math.abs(x - cropX) <= cornerSize && Math.abs(y - cropY) <= cornerSize) {
            return 'tl';
        }
        // Check top-right corner
        if (Math.abs(x - (cropX + cropWidth)) <= cornerSize && Math.abs(y - cropY) <= cornerSize) {
            return 'tr';
        }
        // Check bottom-left corner
        if (Math.abs(x - cropX) <= cornerSize && Math.abs(y - (cropY + cropHeight)) <= cornerSize) {
            return 'bl';
        }
        // Check bottom-right corner
        if (Math.abs(x - (cropX + cropWidth)) <= cornerSize && Math.abs(y - (cropY + cropHeight)) <= cornerSize) {
            return 'br';
        }

        return null;
    }

    function updateCursor(x, y) {
        const corner = getResizeHandle(x, y);

        if (corner) {
            if (corner === 'tl' || corner === 'br') {
                cropCanvas.style.cursor = 'nwse-resize';
            } else {
                cropCanvas.style.cursor = 'nesw-resize';
            }
        } else if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
            cropCanvas.style.cursor = 'move';
        } else {
            cropCanvas.style.cursor = 'default';
        }
    }

    function resizeCropArea(mouseX, mouseY) {
        const minSize = 20; // Minimum crop area size

        switch (resizeHandle) {
            case 'tl':
                const newWidth1 = cropWidth + (cropX - mouseX);
                const newHeight1 = cropHeight + (cropY - mouseY);

                if (newWidth1 >= minSize) {
                    cropWidth = newWidth1;
                    cropX = mouseX;
                }

                if (newHeight1 >= minSize) {
                    cropHeight = newHeight1;
                    cropY = mouseY;
                }
                break;

            case 'tr':
                const newWidth2 = mouseX - cropX;
                const newHeight2 = cropHeight + (cropY - mouseY);

                if (newWidth2 >= minSize) {
                    cropWidth = newWidth2;
                }

                if (newHeight2 >= minSize) {
                    cropHeight = newHeight2;
                    cropY = mouseY;
                }
                break;

            case 'bl':
                const newWidth3 = cropWidth + (cropX - mouseX);
                const newHeight3 = mouseY - cropY;

                if (newWidth3 >= minSize) {
                    cropWidth = newWidth3;
                    cropX = mouseX;
                }

                if (newHeight3 >= minSize) {
                    cropHeight = newHeight3;
                }
                break;

            case 'br':
                const newWidth4 = mouseX - cropX;
                const newHeight4 = mouseY - cropY;

                if (newWidth4 >= minSize) {
                    cropWidth = newWidth4;
                }

                if (newHeight4 >= minSize) {
                    cropHeight = newHeight4;
                }
                break;
        }

        // Enforce aspect ratio if needed
        if (config.cropAspectRatio) {
            cropHeight = cropWidth / config.cropAspectRatio;
        }
    }

    function drawCropOverlay() {
        const ctx = cropCanvas.getContext('2d');

        // Clear the canvas and redraw the image
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);

        // Draw darkened overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Clear the crop area to show the image
        ctx.clearRect(cropX, cropY, cropWidth, cropHeight);

        // Draw border around crop area
        ctx.strokeStyle = config.cropperLineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

        // Draw resize handles
        const handleSize = config.cropperCornerSize;
        ctx.fillStyle = config.cropperLineColor;

        // Draw the corner handles
        ctx.fillRect(cropX - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize); // Top-left
        ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize); // Top-right
        ctx.fillRect(cropX - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize); // Bottom-left
        ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize); // Bottom-right
    }

    function applyCrop() {
        if (!originalImage) return;

        // Calculate the actual crop coordinates in the original image
        const scaleX = originalImage.width / canvasWidth;
        const scaleY = originalImage.height / canvasHeight;

        const originalCropX = cropX * scaleX;
        const originalCropY = cropY * scaleY;
        const originalCropWidth = cropWidth * scaleX;
        const originalCropHeight = cropHeight * scaleY;

        // Create a temporary canvas to hold the cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalCropWidth;
        tempCanvas.height = originalCropHeight;

        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(
            originalImage,
            originalCropX, originalCropY, originalCropWidth, originalCropHeight,
            0, 0, originalCropWidth, originalCropHeight
        );

        // Create a new image from the cropped canvas
        const croppedImg = new Image();
        croppedImg.onload = () => {
            // Resize the cropped image to all required sizes
            resizeImage(croppedImg, canvas28, 28);
            resizeImage(croppedImg, canvas56, 56);
            resizeImage(croppedImg, canvas112, 112);

            // Hide crop interface and show output
            cropContainer.style.display = 'none';
            outputContainer.style.display = 'block';
        };
        croppedImg.src = tempCanvas.toDataURL();
    }

    function resizeImage(img, canvas, size) {
        const ctx = canvas.getContext('2d');

        // Clear the canvas
        ctx.clearRect(0, 0, size, size);

        // Set background color
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, size, size);

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

    function initializeCanvases() {
        const canvases = [canvas28, canvas56, canvas112];

        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
    }

    document.getElementById('cropCancelBtn').addEventListener('click', () => {
        cropContainer.style.display = 'none';
        dropArea.style.display = 'block';
        // Reset the file input to allow selecting the same file again
        fileInput.value = '';
    });
});