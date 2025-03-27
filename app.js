import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const outputContainer = document.getElementById('outputContainer');
    const canvas28 = document.getElementById('canvas28');
    const canvas56 = document.getElementById('canvas56');
    const canvas112 = document.getElementById('canvas112');

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
                // Resize the image to all required sizes
                resizeImage(img, canvas28, 28);
                resizeImage(img, canvas56, 56);
                resizeImage(img, canvas112, 112);
                
                // Show the output container
                outputContainer.style.display = 'block';
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
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
});

