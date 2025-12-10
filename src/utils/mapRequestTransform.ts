/**
 * Creates a transformRequest function for MapLibre GL maps
 * Handles URL transformation for ArcGIS tiles and local resources
 * @param sitePath - Base path for the application (e.g., '/Arras_CommunityHealthIndicator/')
 * @returns Transform request function compatible with MapLibre GL
 */
export function createMapRequestTransform(sitePath: string) {
  return (url: string) => {
    // Handle ArcGIS tile requests (no modification needed)
    if (url.includes('arcgisonline.com') || url.includes('arcgis.com')) {
      return { url };
    }
    
    // If this is a local resource (starts with '/'), prepend sitePath
    if (url.startsWith('/')) {
      return {
        url: sitePath + url
      };
    }
    
    // If this is an absolute URL on the same origin, insert the base path
    if (sitePath && typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (url.startsWith(origin + '/') && !url.includes(sitePath)) {
        // Insert the base path after the origin
        const path = url.substring(origin.length);
        // Ensure proper path joining (avoid double slashes)
        const basePath = sitePath.endsWith('/') ? sitePath.slice(0, -1) : sitePath;
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return {
          url: origin + basePath + cleanPath
        };
      }
    }
    
    return { url };
  };
}
