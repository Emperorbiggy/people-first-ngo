<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CheckDocumentController extends Controller
{
    /**
     * Where the uploaded PDFs live. Drop files in here named after the
     * applicant's phone number, e.g. "08012345678.pdf". A name that merely
     * contains the number also matches, e.g. "08012345678 - John Doe.pdf".
     */
    private const DOCUMENT_DIR = 'app/check-documents';

    public function index()
    {
        return inertia('Check/Index');
    }

    /**
     * Look up a document without exposing anything about the folder itself.
     */
    public function lookup(Request $request)
    {
        $validated = $request->validate([
            'phone' => ['required', 'regex:/^\d{11}$/'],
        ], [
            'phone.regex' => 'Phone number must be exactly 11 digits.',
        ]);

        $phone = $validated['phone'];
        $path  = $this->locate($phone);

        if (!$path) {
            return response()->json(['found' => false]);
        }

        return response()->json([
            'found'        => true,
            'file_name'    => basename($path),
            'size'         => $this->humanSize(filesize($path)),
            'updated_at'   => date('d M Y', filemtime($path)),
            'view_url'     => route('check.view', $phone),
            'download_url' => route('check.download', $phone),
        ]);
    }

    /** Open in the browser's PDF viewer. */
    public function view(string $phone): BinaryFileResponse
    {
        return $this->serve($phone, 'inline');
    }

    /** Force a save-to-disk. */
    public function download(string $phone): BinaryFileResponse
    {
        return $this->serve($phone, 'attachment');
    }

    private function serve(string $phone, string $disposition): BinaryFileResponse
    {
        abort_unless(preg_match('/^\d{11}$/', $phone), 404);

        $path = $this->locate($phone);
        abort_if(!$path, 404, 'No document found for that phone number.');

        return response()->file($path, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => $disposition . '; filename="' . basename($path) . '"',
        ]);
    }

    /**
     * Resolve a phone number to a PDF on disk. The number is already known to
     * be 11 digits by the time it gets here, so it can never escape the folder.
     */
    private function locate(string $phone): ?string
    {
        $dir = storage_path(self::DOCUMENT_DIR);

        if (!is_dir($dir)) {
            return null;
        }

        // 08012345678 may also have been saved as 2348012345678 or 8012345678.
        // Anything shorter than 10 digits is dropped: ltrim() on an all-zero
        // number leaves an empty string, and an empty needle matches every
        // file in the folder.
        $candidates = array_filter(
            array_unique([
                $phone,
                '234' . ltrim($phone, '0'),
                ltrim($phone, '0'),
            ]),
            fn ($candidate) => strlen($candidate) >= 10
        );

        foreach ($candidates as $candidate) {
            $exact = $dir . DIRECTORY_SEPARATOR . $candidate . '.pdf';
            if (is_file($exact)) {
                return $exact;
            }
        }

        $files = glob($dir . DIRECTORY_SEPARATOR . '*.{pdf,PDF}', GLOB_BRACE) ?: [];

        foreach ($files as $file) {
            $digits = preg_replace('/\D/', '', pathinfo($file, PATHINFO_FILENAME));

            foreach ($candidates as $candidate) {
                if ($digits !== '' && str_contains($digits, $candidate)) {
                    return $file;
                }
            }
        }

        return null;
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . ' MB';
        }

        return max(1, round($bytes / 1024)) . ' KB';
    }
}
