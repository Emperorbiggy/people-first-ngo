<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\DataboyApplication;
use App\Models\NgoContractApplication;
use ZipArchive;

class NgoDownloadsController extends Controller
{
    public function index()
    {
        return inertia('Admin/NgoDownloads', [
            'ngo' => [
                'passports'    => NgoContractApplication::whereNotNull('passport_photograph_path')->count(),
                'idCards'      => NgoContractApplication::whereNotNull('valid_id_card_path')->count(),
                'certificates' => NgoContractApplication::whereNotNull('highest_qualification_certificate_path')->count(),
            ],
            'databoy' => [
                'passports'    => Databoy::whereNotNull('passport_photograph_path')->count(),
                'idCards'      => Databoy::whereNotNull('valid_id_card_path')->count(),
                'certificates' => Databoy::whereNotNull('highest_qualification_certificate_path')->count(),
            ],
            'databoyApp' => [
                'passports'    => DataboyApplication::whereNotNull('passport_photograph_path')->count(),
                'idCards'      => DataboyApplication::whereNotNull('valid_id_card_path')->count(),
                'certificates' => DataboyApplication::whereNotNull('highest_qualification_certificate_path')->count(),
            ],
        ]);
    }

    // ── NGO Applications ─────────────────────────────────────────────────────

    public function downloadPassports()
    {
        return $this->buildZip(
            NgoContractApplication::whereNotNull('passport_photograph_path')->get(),
            'passport_photograph_path',
            'ngo-passports.zip',
            convertToPdf: false,
            compress: false,
            convertToJpeg: true
        );
    }

    public function downloadIdCards()
    {
        return $this->buildZip(
            NgoContractApplication::whereNotNull('valid_id_card_path')->get(),
            'valid_id_card_path',
            'ngo-id-cards.zip',
            convertToPdf: false,
            compress: false,
            convertToJpeg: true
        );
    }

    public function downloadCertificates()
    {
        return $this->buildZip(
            NgoContractApplication::whereNotNull('highest_qualification_certificate_path')->get(),
            'highest_qualification_certificate_path',
            'ngo-certificates.zip',
            convertToPdf: true,
            compress: false
        );
    }

    // ── Databoy Registrations ────────────────────────────────────────────────

    public function downloadDataboyPassports()
    {
        return $this->buildZip(
            Databoy::whereNotNull('passport_photograph_path')->get(),
            'passport_photograph_path',
            'databoy-passports.zip',
            convertToPdf: false,
            compress: false,
            convertToJpeg: true
        );
    }

    public function downloadDataboyIdCards()
    {
        return $this->buildZip(
            Databoy::whereNotNull('valid_id_card_path')->get(),
            'valid_id_card_path',
            'databoy-id-cards.zip',
            convertToPdf: false,
            compress: false,
            convertToJpeg: true
        );
    }

    public function downloadDataboyCertificates()
    {
        return $this->buildZip(
            Databoy::whereNotNull('highest_qualification_certificate_path')->get(),
            'highest_qualification_certificate_path',
            'databoy-certificates.zip',
            convertToPdf: true,
            compress: false
        );
    }

    // ── Databoy Applications ─────────────────────────────────────────────────

    public function downloadDataboyAppPassports()
    {
        return $this->buildZip(
            DataboyApplication::whereNotNull('passport_photograph_path')->get(),
            'passport_photograph_path',
            'databoy-app-passports.zip',
            convertToPdf: false,
            compress: false,
            convertToJpeg: true
        );
    }

    public function downloadDataboyAppIdCards()
    {
        return $this->buildZip(
            DataboyApplication::whereNotNull('valid_id_card_path')->get(),
            'valid_id_card_path',
            'databoy-app-id-cards.zip',
            convertToPdf: false,
            compress: false,
            convertToJpeg: true
        );
    }

    public function downloadDataboyAppCertificates()
    {
        return $this->buildZip(
            DataboyApplication::whereNotNull('highest_qualification_certificate_path')->get(),
            'highest_qualification_certificate_path',
            'databoy-app-certificates.zip',
            convertToPdf: true,
            compress: false
        );
    }

    // ── Shared helpers ───────────────────────────────────────────────────────

    private function buildZip($applications, string $column, string $zipName, bool $convertToPdf, bool $compress, bool $convertToJpeg = false)
    {
        set_time_limit(300);
        ignore_user_abort(true);

        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $zipPath   = $tempDir . '/dl_' . uniqid() . '.zip';
        $tempFiles = [];

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($applications as $app) {
            $filePath = storage_path('app/public/' . ltrim($app->{$column}, '/'));
            if (!file_exists($filePath)) continue;

            $ext      = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            $baseName = pathinfo(basename($filePath), PATHINFO_FILENAME);

            try {
                if ($convertToPdf && $ext !== 'pdf') {
                    $sourceForPdf = $filePath;
                    $sourceExt    = $ext;

                    if ($compress && in_array($ext, ['jpg', 'jpeg', 'png'])) {
                        $compressedPath = $tempDir . '/c_' . uniqid() . '.jpg';
                        $this->compressImage($filePath, $ext, $compressedPath);
                        $sourceForPdf = $compressedPath;
                        $sourceExt    = 'jpeg';
                        $tempFiles[]  = $compressedPath;
                    }

                    $pdfPath = $tempDir . '/p_' . uniqid() . '.pdf';
                    $this->imageToPdf($sourceForPdf, $sourceExt, $pdfPath);
                    $zip->addFromString($baseName . '.pdf', file_get_contents($pdfPath));
                    @unlink($pdfPath);

                } elseif ($convertToJpeg && $ext === 'png') {
                    $jpegPath = $tempDir . '/j_' . uniqid() . '.jpg';
                    $this->pngToJpeg($filePath, $jpegPath);
                    $zip->addFromString($baseName . '.jpg', file_get_contents($jpegPath));
                    @unlink($jpegPath);

                } elseif ($convertToJpeg && in_array($ext, ['jpg', 'jpeg'])) {
                    // Already JPEG — add with normalised .jpg extension
                    $zip->addFromString($baseName . '.jpg', file_get_contents($filePath));

                } elseif ($convertToJpeg && $ext === 'pdf') {
                    $jpegPath = $tempDir . '/j_' . uniqid() . '.jpg';
                    $this->pdfToJpegViaApi($filePath, $jpegPath);
                    $zip->addFromString($baseName . '.jpg', file_get_contents($jpegPath));
                    @unlink($jpegPath);

                } else {
                    // Unknown format — include as-is
                    $zip->addFromString(basename($filePath), file_get_contents($filePath));
                }
            } catch (\Throwable $e) {
                // Conversion failed — add original file with its real extension so it can still be opened
                if (file_exists($filePath)) {
                    $zip->addFromString(basename($filePath), file_get_contents($filePath));
                }
            }
        }

        $zip->close();

        foreach ($tempFiles as $tmp) {
            @unlink($tmp);
        }

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }

    private function pngToJpeg(string $pngPath, string $outPath, int $quality = 90): void
    {
        $src = imagecreatefrompng($pngPath);
        $w   = imagesx($src);
        $h   = imagesy($src);

        $bg = imagecreatetruecolor($w, $h);
        imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
        imagecopy($bg, $src, 0, 0, 0, 0, $w, $h);
        imagedestroy($src);

        imagejpeg($bg, $outPath, $quality);
        imagedestroy($bg);
    }

    private function pdfToJpegViaApi(string $pdfPath, string $outPath): void
    {
        $apiKey = env('CLOUDMERSIVE_API_KEY');

        if (!$apiKey) {
            throw new \RuntimeException('CLOUDMERSIVE_API_KEY not set in .env');
        }

        $ch = curl_init('https://api.cloudmersive.com/convert/pdf/to/jpg');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Apikey: ' . $apiKey],
            CURLOPT_POSTFIELDS     => ['inputFile' => new \CURLFile($pdfPath, 'application/pdf', basename($pdfPath))],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            throw new \RuntimeException('Cloudmersive API error: HTTP ' . $httpCode);
        }

        // Response is a JSON object: { "PngResultPages": [{ "PageNumber":1, "Content":"base64..." }] }
        $result = json_decode($response, true);
        $pages  = $result['PngResultPages'] ?? [];

        if (empty($pages)) {
            throw new \RuntimeException('Cloudmersive returned no pages.');
        }

        // Take only page 1 and decode it
        $imageData = base64_decode($pages[0]['Content']);

        if (!$imageData) {
            throw new \RuntimeException('Cloudmersive returned invalid image data.');
        }

        // The API returns PNG — convert to JPEG using GD
        $src = imagecreatefromstring($imageData);
        if (!$src) {
            throw new \RuntimeException('Could not create image from Cloudmersive response.');
        }

        $bg = imagecreatetruecolor(imagesx($src), imagesy($src));
        imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
        imagecopy($bg, $src, 0, 0, 0, 0, imagesx($src), imagesy($src));
        imagedestroy($src);

        imagejpeg($bg, $outPath, 90);
        imagedestroy($bg);
    }

    private function compressImage(string $imagePath, string $ext, string $outPath, int $quality = 75, int $maxDim = 1800): void
    {
        $src = $ext === 'png' ? imagecreatefrompng($imagePath) : imagecreatefromjpeg($imagePath);

        $w = imagesx($src);
        $h = imagesy($src);

        if ($w > $maxDim || $h > $maxDim) {
            $ratio = min($maxDim / $w, $maxDim / $h);
            $newW  = (int) ($w * $ratio);
            $newH  = (int) ($h * $ratio);
            $dst   = imagecreatetruecolor($newW, $newH);

            if ($ext === 'png') {
                imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
            }

            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
            imagedestroy($src);
            $src = $dst;
        }

        imagejpeg($src, $outPath, $quality);
        imagedestroy($src);
    }

    private function imageToPdf(string $imagePath, string $ext, string $pdfPath): void
    {
        [$imgW, $imgH] = getimagesize($imagePath);

        $pdf = new \FPDF('P', 'mm', 'A4');
        $pdf->SetAutoPageBreak(false);
        $pdf->AddPage();

        $maxW  = 200;
        $maxH  = 277;
        $ratio = min($maxW / $imgW, $maxH / $imgH);
        $w     = $imgW * $ratio;
        $h     = $imgH * $ratio;
        $x     = (210 - $w) / 2;
        $y     = (297 - $h) / 2;

        $type = in_array($ext, ['jpg', 'jpeg']) ? 'JPEG' : 'PNG';
        $pdf->Image($imagePath, $x, $y, $w, $h, $type);
        $pdf->Output('F', $pdfPath);
    }
}
