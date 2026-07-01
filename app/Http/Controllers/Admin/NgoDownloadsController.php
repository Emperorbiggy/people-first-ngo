<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NgoContractApplication;
use ZipArchive;

class NgoDownloadsController extends Controller
{
    public function index()
    {
        return inertia('Admin/NgoDownloads', [
            'counts' => [
                'passports'    => NgoContractApplication::whereNotNull('passport_photograph_path')->count(),
                'idCards'      => NgoContractApplication::whereNotNull('valid_id_card_path')->count(),
                'certificates' => NgoContractApplication::whereNotNull('highest_qualification_certificate_path')->count(),
            ],
        ]);
    }

    public function downloadPassports()
    {
        return $this->buildZip(
            NgoContractApplication::whereNotNull('passport_photograph_path')->get(),
            'passport_photograph_path',
            'passports.zip',
            convertToPdf: false,
            compress: false
        );
    }

    public function downloadIdCards()
    {
        return $this->buildZip(
            NgoContractApplication::whereNotNull('valid_id_card_path')->get(),
            'valid_id_card_path',
            'id-cards.zip',
            convertToPdf: true,
            compress: true
        );
    }

    public function downloadCertificates()
    {
        return $this->buildZip(
            NgoContractApplication::whereNotNull('highest_qualification_certificate_path')->get(),
            'highest_qualification_certificate_path',
            'certificates.zip',
            convertToPdf: true,
            compress: true
        );
    }

    private function buildZip($applications, string $column, string $zipName, bool $convertToPdf, bool $compress)
    {
        set_time_limit(300);
        ignore_user_abort(true);

        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $zipPath  = $tempDir . '/dl_' . uniqid() . '.zip';
        $tempFiles = [];

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($applications as $app) {
            $filePath = storage_path('app/public/' . $app->{$column});
            if (!file_exists($filePath)) continue;

            $ext      = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            $baseName = pathinfo(basename($filePath), PATHINFO_FILENAME);

            try {
                if ($convertToPdf && $ext !== 'pdf') {
                    // Optionally compress the image first, then convert to PDF
                    $sourceForPdf = $filePath;
                    $sourceExt    = $ext;

                    if ($compress && in_array($ext, ['jpg', 'jpeg', 'png'])) {
                        $compressedPath = $tempDir . '/c_' . uniqid() . '.jpg';
                        $this->compressImage($filePath, $ext, $compressedPath);
                        $sourceForPdf = $compressedPath;
                        $sourceExt    = 'jpeg';
                        $tempFiles[]  = $compressedPath;
                    }

                    $pdfPath     = $tempDir . '/p_' . uniqid() . '.pdf';
                    $this->imageToPdf($sourceForPdf, $sourceExt, $pdfPath);
                    $zip->addFile($pdfPath, $baseName . '.pdf');
                    $tempFiles[] = $pdfPath;
                } else {
                    $zip->addFile($filePath, basename($filePath));
                }
            } catch (\Throwable $e) {
                // Fall back to original file on any error
                $zip->addFile($filePath, basename($filePath));
            }
        }

        $zip->close();

        foreach ($tempFiles as $tmp) {
            @unlink($tmp);
        }

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
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

            // Preserve transparency for PNG sources
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
