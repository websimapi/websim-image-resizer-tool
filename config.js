export const config = {
    preserveTransparency: true, // Whether to preserve transparency in the images
    backgroundColor: '#ffffff', // Background color for the resized images (only used when preserveTransparency is false)
    vectorizeBeforeResize: false, // Whether to vectorize the image before resizing
    vectorizationThreshold: 128, // Threshold for vectorization (0-255)
    // You can add more configuration options here if needed
};