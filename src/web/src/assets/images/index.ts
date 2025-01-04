/**
 * Type definition for image assets with required metadata
 */
interface ImageAsset {
  path: string;
  alt: string;
}

/**
 * Utility function to resolve full URLs for image assets
 * @param path - Path to the image asset
 * @returns Fully resolved URL for the image asset
 * @throws Error if path resolution fails
 */
const getImageUrl = (path: string): string => {
  try {
    // Using Vite's asset handling to resolve URLs
    const url = new URL(`/src/assets/images/${path}`, import.meta.url).href;
    return url;
  } catch (error) {
    throw new Error(`Failed to resolve image URL for path: ${path}`);
  }
};

/**
 * Company logo asset with metadata
 */
export const logo: ImageAsset = {
  path: getImageUrl('logo.svg'),
  alt: 'Incepta Platform Logo'
};

/**
 * Placeholder image for technology listings
 */
export const placeholderTechnology: ImageAsset = {
  path: getImageUrl('placeholder-technology.svg'),
  alt: 'Technology Placeholder Image'
};

/**
 * Placeholder image for user avatars
 */
export const placeholderUser: ImageAsset = {
  path: getImageUrl('placeholder-user.svg'),
  alt: 'User Avatar Placeholder'
};

/**
 * Collection of grant program specific icons
 */
export const grantIcons: Record<string, ImageAsset> = {
  sbir: {
    path: getImageUrl('grants/sbir-icon.svg'),
    alt: 'SBIR Grant Program Icon'
  },
  sttr: {
    path: getImageUrl('grants/sttr-icon.svg'),
    alt: 'STTR Grant Program Icon'
  }
};

/**
 * Collection of technology status specific icons
 */
export const technologyIcons: Record<string, ImageAsset> = {
  patent: {
    path: getImageUrl('technology/patent-icon.svg'),
    alt: 'Patent Status Icon'
  },
  license: {
    path: getImageUrl('technology/license-icon.svg'),
    alt: 'License Status Icon'
  }
};

// Export type for use in other components
export type { ImageAsset };

// Export all image assets as a single record for dynamic usage
export const ImageAssets: Record<string, ImageAsset> = {
  logo,
  placeholderTechnology,
  placeholderUser,
  ...grantIcons,
  ...technologyIcons
};

export default ImageAssets;