import { v2 as cloudinarySdk } from "cloudinary";

/** Reads and validates Cloudinary server-side credentials. */
function getCloudinaryEnv() {
	const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
	const apiKey = process.env.CLOUDINARY_API_KEY;
	const apiSecret = process.env.CLOUDINARY_API_SECRET;

	if (!cloudName || !apiKey || !apiSecret) {
		throw new Error(
			"Missing Cloudinary environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
		);
	}

	return { cloudName, apiKey, apiSecret };
}

const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();

cloudinarySdk.config({
	cloud_name: cloudName,
	api_key: apiKey,
	api_secret: apiSecret,
	secure: true,
});

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
