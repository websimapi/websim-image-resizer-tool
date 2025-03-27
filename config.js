export const config = {
    preserveTransparency: true, // Whether to preserve transparency in the images
    backgroundColor: '#ffffff', // Background color for the resized images (only used when preserveTransparency is false)
    vectorizeBeforeResize: false, // Whether to vectorize the image before resizing
    vectorizationThreshold: 128, // Threshold for vectorization (0-255)
    turdSize: 2, // Noise removal (0-10)
    alphaMax: 1.0, // Corner threshold (0-1.3)
    optCurve: true, // Whether to optimize curves
    optTolerance: 0.2, // Optimization tolerance
    // You can add more configuration options here if needed
};