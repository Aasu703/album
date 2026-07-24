import { BadRequestException } from '@nestjs/common';

/**
 * Confirms a file's actual bytes are one of the allowed image types, by sniffing its
 * magic number rather than trusting the client-supplied multipart Content-Type header
 * (`file.mimetype`), which is attacker-controlled and easily spoofed. Callers should
 * still keep the cheap `file.mimetype` allowlist check as a fast first-pass rejection —
 * this is the actual security boundary.
 */
export async function assertIsAllowedImageContent(
  buffer: Buffer,
  allowedMimeTypes: ReadonlySet<string>,
): Promise<void> {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !allowedMimeTypes.has(detected.mime)) {
    throw new BadRequestException('File content does not match an allowed image type.');
  }
}
