export const config = {
    preserveTransparency: true, // Whether to preserve transparency in the images
    backgroundColor: '#ffffff', // Background color for the resized images (only used when preserveTransparency is false)
    vectorizeBeforeResize: false, // Whether to vectorize the image before resizing
    // Settings for Potrace.Posterize
    posterizeSteps: 3, // Number of color layers (2 to 16) - determines detail
    posterizeThreshold: 120, // Threshold for posterization (0-255) - affects edge detection
    posterizeFill: '#000000', // Default fill color for posterized SVG
    posterizeBackground: 'transparent', // Background for posterized SVG

    // Settings passed down to individual Potrace runs within Posterize
    turdSize: 2, // Noise removal (0-10)
    alphaMax: 1.0, // Corner threshold (0-1.3)
    optCurve: true, // Whether to optimize curves
    optTolerance: 0.2, // Optimization tolerance
    // You can add more configuration options here if needed
};