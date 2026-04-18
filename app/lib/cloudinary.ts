import { v2 as cloudinarySdk } from "cloudinary";

export interface CloudinaryEnv {
	cloudName: string;
	apiKey: string;
	apiSecret: string;
}

/** Reads Cloudinary server-side credentials when they are available. */
export function getCloudinaryEnv(): CloudinaryEnv | null {
	const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
	const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
	const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

	if (!cloudName || !apiKey || !apiSecret) {
		return null;
	}

	return { cloudName, apiKey, apiSecret };
}

const cloudinaryEnv = getCloudinaryEnv();

export const hasCloudinaryCredentials = Boolean(cloudinaryEnv);

if (cloudinaryEnv) {
	cloudinarySdk.config({
		cloud_name: cloudinaryEnv.cloudName,
		api_key: cloudinaryEnv.apiKey,
		api_secret: cloudinaryEnv.apiSecret,
		secure: true,
	});
}

export const cloudinary = cloudinarySdk;

/**
 * Cloudinary URLs look like:
 * https://res.cloudinary.com/<cloud>/image/upload/v1234567890/folder/filename.jpg
 * public_id is everything after /upload/vXXXXX/ and before the file extension.
 */
export function extractPublicId(cloudinaryUrl: string): string {
	const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
	return match ? match[1] : "";
}

/** Extracts a Cloudinary public id from a secure URL for transformations. */
export function extractPublicIdFromUrl(url: string | null): string | null {
	if (!url) {
		return null;
	}

	const [withoutQuery] = url.split("?");
	const publicId = extractPublicId(withoutQuery);
	return publicId || null;
}
