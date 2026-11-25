import { AssignmentWorkflowError } from './errors';

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{5,256}$/;
const PDF_SIGNATURE = '%PDF-';

export function extractGoogleDriveFileId(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AssignmentWorkflowError(400, 'INVALID_DRIVE_LINK', 'Enter a valid Google Drive file link.');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'drive.google.com' ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new AssignmentWorkflowError(400, 'INVALID_DRIVE_LINK', 'Use an HTTPS Google Drive file link.');
  }

  const pathId = url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1];
  const queryId = ['/open', '/uc'].includes(url.pathname) ? url.searchParams.get('id') : null;
  const fileId = pathId ?? queryId;

  if (!fileId || !DRIVE_ID_PATTERN.test(fileId)) {
    throw new AssignmentWorkflowError(400, 'INVALID_DRIVE_LINK', 'Use a Google Drive link to a single file.');
  }

  return fileId;
}

function isAllowedGoogleHost(hostname: string): boolean {
  return (
    hostname === 'drive.google.com' ||
    hostname === 'drive.usercontent.google.com' ||
    hostname === 'googleusercontent.com' ||
    hostname.endsWith('.googleusercontent.com')
  );
}

export async function verifyPublicGoogleDrivePdf(input: string): Promise<void> {
  const fileId = extractGoogleDriveFileId(input);
  let currentUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        headers: { Range: 'bytes=0-4' },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new AssignmentWorkflowError(
        422,
        'DRIVE_FILE_UNAVAILABLE',
        'Could not verify the file. Make sure its Google Drive access is set to “Anyone with the link”.'
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirectCount === 3) break;

      let target: URL;
      try {
        target = new URL(location, currentUrl);
      } catch {
        break;
      }
      if (target.protocol !== 'https:' || !isAllowedGoogleHost(target.hostname)) break;
      currentUrl = target.toString();
      continue;
    }

    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new AssignmentWorkflowError(
        422,
        'DRIVE_FILE_UNAVAILABLE',
        'The file is not publicly accessible. Set Google Drive access to “Anyone with the link”.'
      );
    }

    const reader = response.body.getReader();
    const prefix: number[] = [];
    try {
      while (prefix.length < PDF_SIGNATURE.length) {
        const { done, value } = await reader.read();
        if (done) break;
        prefix.push(...value.slice(0, PDF_SIGNATURE.length - prefix.length));
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    if (new TextDecoder().decode(new Uint8Array(prefix)) !== PDF_SIGNATURE) {
      throw new AssignmentWorkflowError(
        422,
        'DRIVE_FILE_NOT_PDF',
        'The publicly accessible Google Drive file must be a PDF.'
      );
    }

    return;
  }

  throw new AssignmentWorkflowError(
    422,
    'DRIVE_FILE_UNAVAILABLE',
    'Could not verify public access to this Google Drive file. Check its sharing settings and try again.'
  );
}
