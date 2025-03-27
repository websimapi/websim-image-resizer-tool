import { config } from './config.js';

const PREVIEW_SIZE = 250; // Consider moving this to config or passing as argument if needed elsewhere

/**
 * Processes image data using Potrace.Posterize to generate SVG.
 * Internal helper function.
 * @param {object} posterizer - An instance of Potrace.Posterize.
 * @param {ImageData} imageData - The image data to process.
 * @param {Function} resolve - Promise resolve function.
 * @param {Function} reject - Promise reject function.
 */
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

/**
 * Vectorizes an image using Potrace.Posterize for the main resizing process.
 * @param {HTMLImageElement} img - The source image element.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the vectorized image element.
 */
export function vectorizeImage(img) {
    return new Promise((resolve, reject) => {
        // Ensure Potrace library is loaded
        if (typeof window.Potrace === 'undefined' || typeof window.Potrace.Posterize === 'undefined') {
            console.error("Potrace library not found or not loaded correctly.");
            reject(new Error("Potrace library not available."));
            return;
        }

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
                // Attempt to redraw image on a new canvas if possible (e.g., for data URLs)
                const cleanCanvas = document.createElement('canvas');
                cleanCanvas.width = tempCanvas.width;
                cleanCanvas.height = tempCanvas.height;
                const cleanCtx = cleanCanvas.getContext('2d');
                const freshImg = new Image();
                // crossOrigin only helps if the server sends CORS headers for non-data URLs
                // freshImg.crossOrigin = "Anonymous";
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
                // Only try reloading if it's a data URL or if CORS might be possible
                if (img.src && img.src.startsWith('data:')) {
                     freshImg.src = img.src;
                } else {
                    // For external URLs without CORS, this will likely fail.
                    // Consider adding a note to the user about CORS issues.
                    console.warn("Attempting redraw for potentially tainted canvas from URL:", img.src);
                    freshImg.src = img.src; // This might still result in a tainted canvas
                    // If redraw fails due to CORS, reject here
                     // reject(new Error("Failed to get image data and could not retry draw due to potential CORS issue."));
                    // return;
                }
                return; // Exit early, the freshImg.onload will handle the rest
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


/**
 * Generates a vectorized preview of the image using Potrace.Posterize and draws it onto a canvas.
 * @param {HTMLImageElement} img - The source image element.
 * @param {HTMLCanvasElement} targetCanvas - The canvas element to draw the preview on.
 * @param {HTMLCanvasElement} originalCanvas - The canvas showing the original preview (for sizing).
 */
export function vectorizeForPreview(img, targetCanvas, originalCanvas) {
    // Ensure Potrace library is loaded
    if (typeof window.Potrace === 'undefined' || typeof window.Potrace.Posterize === 'undefined') {
        console.error("Potrace library not found or not loaded correctly for preview.");
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.fillStyle = '#fdd';
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.fillStyle = '#900';
        ctx.textAlign = 'center';
        ctx.fillText("Potrace Error", targetCanvas.width / 2, targetCanvas.height / 2);
        return;
    }

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

        // Use original image dimensions scaled to PREVIEW_SIZE
        const scale = Math.min(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height);
        const previewWidth = Math.round(img.width * scale);
        const previewHeight = Math.round(img.height * scale);

        // Use a temporary canvas for getting ImageData at the preview scale
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = previewWidth;
        tempCanvas.height = previewHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

        posterizer.loadImageData(tempCtx.getImageData(0, 0, previewWidth, previewHeight));

        const svgData = posterizer.getSVG();

        const vectorCtx = targetCanvas.getContext('2d');
        targetCanvas.width = previewWidth;
        targetCanvas.height = previewHeight;
        vectorCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

        if (!svgData || svgData.trim() === '') {
             console.error("Potrace generated empty SVG data for preview.");
             throw new Error("Empty SVG generated for preview");
        }

        const svgImg = new Image();
        svgImg.onload = () => {
            vectorCtx.drawImage(svgImg, 0, 0);
            URL.revokeObjectURL(svgImg.src);
        };
        svgImg.onerror = (e) => {
            console.error("Error loading SVG preview:", e);
            vectorCtx.fillStyle = '#fdd';
            vectorCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
            vectorCtx.fillStyle = '#900';
            vectorCtx.textAlign = 'center';
            vectorCtx.fillText("Preview Error", targetCanvas.width / 2, targetCanvas.height / 2);
        }

        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        svgImg.src = URL.createObjectURL(svgBlob);

    } catch (error) {
        console.error('Preview vectorization error:', error);
        const vectorCtx = targetCanvas.getContext('2d');
        // Ensure canvas dimensions are set even on error
        const scale = Math.min(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height);
        targetCanvas.width = Math.round(img.width * scale);
        targetCanvas.height = Math.round(img.height * scale);
        vectorCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        vectorCtx.fillStyle = '#fdd';
        vectorCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        vectorCtx.fillStyle = '#900';
        vectorCtx.textAlign = 'center';
        vectorCtx.fillText("Vector Error", targetCanvas.width / 2, targetCanvas.height / 2);
    }
}