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

export const titleFileNameFallback = (
  title: string | null | undefined,
  fileNameOrPath: string | null | undefined,
  fallback = 'Downloadable file'
): string => {
  const cleanTitle = title?.trim();
  if (!cleanTitle) return fallback;

  const lastSegment = fileNameOrPath?.split('/').pop() || '';
  const extension = (decodeURIComponent(lastSegment).match(/\.[^./\\]+$/)?.[0] || '').toLowerCase();

  return `${cleanTitle}${extension}`;
};

export const displayStorageFileName = (
  fileNameOrPath: string | null | undefined,
  fallback = 'Downloadable file'
): string => {
  if (!fileNameOrPath) return fallback;

  const lastSegment = fileNameOrPath.split('/').pop() || fileNameOrPath;
  const decoded = decodeURIComponent(lastSegment).trim();
  if (!decoded) return fallback;

  const displayName = decoded.replace(/^\d{10,}-/, '') || fallback;
  const baseName = displayName.replace(/\.[^./\\]+$/, '');
  const isLegacyRandomName = /^\d{10,}-/.test(decoded) && /^[a-z0-9]{4,8}$/i.test(baseName);
  const hasMeaningfulFallback = fallback !== 'Downloadable file' && fallback !== fileNameOrPath;

  return isLegacyRandomName && hasMeaningfulFallback ? fallback : displayName;
};