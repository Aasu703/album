import { BadRequestException } from '@nestjs/common';

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
