export const sanitizeStorageFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/\.[^./\\]+$/);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const safeBaseName = baseName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '') || 'file';

  return `${safeBaseName}${extension}`;
};

export const createStorageFileName = (fileName: string): string => {
  return `${Date.now()}-${sanitizeStorageFileName(fileName)}`;
};

export const displayStorageFileName = (
  fileNameOrPath: string | null | undefined,
  fallback = 'Downloadable file'
): string => {
  if (!fileNameOrPath) return fallback;

  const lastSegment = fileNameOrPath.split('/').pop() || fileNameOrPath;
  const decoded = decodeURIComponent(lastSegment).trim();
  if (!decoded) return fallback;

  return decoded.replace(/^\d{10,}-/, '') || fallback;
};