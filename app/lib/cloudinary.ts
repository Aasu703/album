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

/** Extracts a Cloudinary public id from a secure URL for transformations. */
export function extractPublicIdFromUrl(url: string | null): string | null {
	if (!url) {
		return null;
	}

	const marker = "/upload/";
	const markerIndex = url.indexOf(marker);

	if (markerIndex === -1) {
		return null;
	}

	let publicPart = url.slice(markerIndex + marker.length);
	publicPart = publicPart.replace(/^v\d+\//, "");

	const [withoutQuery] = publicPart.split("?");
	const extensionIndex = withoutQuery.lastIndexOf(".");

	if (extensionIndex === -1) {
		return withoutQuery;
	}

	return withoutQuery.slice(0, extensionIndex);
}
