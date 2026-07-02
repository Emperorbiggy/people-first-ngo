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

                } elseif ($convertToJpeg && $ext === 'pdf') {
                    $jpegPath = $tempDir . '/j_' . uniqid() . '.jpg';
                    $this->pdfToJpeg($filePath, $jpegPath);
                    $zip->addFromString($baseName . '.jpg', file_get_contents($jpegPath));
                    @unlink($jpegPath);

                } else {
                    // jpg/jpeg already in correct format — add as-is
                    $zip->addFromString($baseName . '.jpg', file_get_contents($filePath));
                }
            } catch (\Throwable $e) {
                if (file_exists($filePath)) {
                    $entryName = $convertToJpeg ? ($baseName . '.jpg') : basename($filePath);
                    $zip->addFromString($entryName, file_get_contents($filePath));
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

    private function pdfToJpeg(string $pdfPath, string $outPath, int $quality = 90): void
    {
        $imagick = new \Imagick();
        $imagick->setResolution(150, 150);
        $imagick->readImage($pdfPath . '[0]'); // first page only
        $imagick->setImageFormat('jpeg');
        $imagick->setImageCompressionQuality($quality);
        $imagick->setImageBackgroundColor('white');
        $imagick->setImageAlphaChannel(\Imagick::ALPHACHANNEL_REMOVE);
        $imagick->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);
        $imagick->writeImage($outPath);
        $imagick->clear();
        $imagick->destroy();
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
