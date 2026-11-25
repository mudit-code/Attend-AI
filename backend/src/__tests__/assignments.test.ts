import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractGoogleDriveFileId, verifyPublicGoogleDrivePdf } from '../modules/assignments/drivePdf';
import { AssignmentWorkflowError } from '../modules/assignments/errors';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Google Drive assignment submission validation', () => {
  it('extracts IDs from supported Google Drive file links', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/file/d/abc_def-123/view?usp=sharing')).toBe('abc_def-123');
    expect(extractGoogleDriveFileId('https://drive.google.com/open?id=abc_def-123')).toBe('abc_def-123');
  });

  it('rejects links outside Google Drive and links without a file ID', () => {
    expect(() => extractGoogleDriveFileId('https://example.com/file/d/abc_def-123')).toThrow(AssignmentWorkflowError);
    expect(() => extractGoogleDriveFileId('https://drive.google.com/drive/folders/abc_def-123')).toThrow(AssignmentWorkflowError);
  });

  it('accepts a public response with a PDF signature', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new TextEncoder().encode('%PDF-1.7 document'), { status: 206 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyPublicGoogleDrivePdf('https://drive.google.com/file/d/abc_def-123/view')
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects an accessible non-PDF response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<html>Not a PDF</html>', { status: 200 })
    ));

    await expect(
      verifyPublicGoogleDrivePdf('https://drive.google.com/file/d/abc_def-123/view')
    ).rejects.toMatchObject({ code: 'DRIVE_FILE_NOT_PDF', status: 422 });
  });

  it('does not follow redirects to non-Google hosts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/private' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyPublicGoogleDrivePdf('https://drive.google.com/file/d/abc_def-123/view')
    ).rejects.toMatchObject({ code: 'DRIVE_FILE_UNAVAILABLE', status: 422 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
