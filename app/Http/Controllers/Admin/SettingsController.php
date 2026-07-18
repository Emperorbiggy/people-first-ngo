<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Databoy;
use App\Models\DataboyApplication;
use App\Models\NgoContractApplication;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class SettingsController extends Controller
{
    public function index()
    {
        return inertia('Admin/Settings', [
            'registrationOpen' => Setting::get('databoy_registration_open', '1') === '1',
            'accessEnabled'    => Setting::get('databoy_access_enabled', '1') === '1',

            'paymentGateway'       => Setting::get('payment_gateway', 'paystack'),
            'paystackPublicKey'    => Setting::get('paystack_public_key', ''),
            'paystackSecretKeySet' => (bool) Setting::get('paystack_secret_key'),
            'easigatewayAppKeySet' => (bool) Setting::get('easigateway_app_key'),
            'bulkTransferAmount'      => Setting::get('bulk_transfer_amount', ''),
            'applicantTransferAmount' => Setting::get('applicant_transfer_amount', ''),
            'airtimeAmount'           => Setting::get('airtime_amount', ''),
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'key'   => 'required|in:databoy_registration_open,databoy_access_enabled',
            'value' => 'required|boolean',
        ]);

        Setting::set($request->key, $request->boolean('value') ? '1' : '0');

        return back()->with('success', 'Setting updated.');
    }

    public function updatePaymentGateway(Request $request)
    {
        $request->validate([
            'gateway'                 => 'required|in:paystack,easigateway',
            'paystack_secret_key'     => 'nullable|string',
            'paystack_public_key'     => 'nullable|string',
            'easigateway_app_key'     => 'nullable|string',
            'bulk_transfer_amount'    => 'nullable|numeric|min:0',
            'applicant_transfer_amount' => 'nullable|numeric|min:0',
            'airtime_amount'          => 'nullable|numeric|min:0',
        ]);

        Setting::set('payment_gateway', $request->gateway);

        if ($request->filled('bulk_transfer_amount')) {
            Setting::set('bulk_transfer_amount', $request->bulk_transfer_amount);
        }

        if ($request->filled('applicant_transfer_amount')) {
            Setting::set('applicant_transfer_amount', $request->applicant_transfer_amount);
        }

        if ($request->filled('airtime_amount')) {
            Setting::set('airtime_amount', $request->airtime_amount);
        }

        if ($request->filled('paystack_secret_key')) {
            Setting::set('paystack_secret_key', $request->paystack_secret_key);
        }

        if ($request->filled('paystack_public_key')) {
            Setting::set('paystack_public_key', $request->paystack_public_key);
        }

        if ($request->filled('easigateway_app_key')) {
            Setting::set('easigateway_app_key', $request->easigateway_app_key);
        }

        return back()->with('success', 'Payment gateway settings updated.');
    }

    public function renameFiles()
    {
        $disk    = Storage::disk('public');
        $folders = ['ngo-applications'];
        $renamed = 0;
        $skipped = 0;
        $errors  = [];
        $log     = [];

        foreach ($folders as $folder) {
            if (!$disk->exists($folder)) continue;

            foreach ($disk->files($folder) as $path) {
                $oldName = basename($path);
                $newName = str_replace(['-', '_'], ' ', $oldName);

                if ($oldName === $newName) {
                    $skipped++;
                    continue;
                }

                $newPath = $folder . '/' . $newName;

                if ($disk->exists($newPath)) {
                    $skipped++;
                    continue;
                }

                try {
                    $disk->move($path, $newPath);
                    $this->updateDbPath($path, $newPath);
                    $log[] = ['old' => $oldName, 'new' => $newName];
                    $renamed++;
                } catch (\Exception $e) {
                    $errors[] = $oldName . ': ' . $e->getMessage();
                }
            }
        }

        return response()->json([
            'renamed' => $renamed,
            'skipped' => $skipped,
            'errors'  => $errors,
            'log'     => $log,
        ]);
    }

    public function compressFiles(Request $request)
    {
        $offset  = max(0, (int) $request->input('offset', 0));
        $limit   = max(1, min(20, (int) $request->input('limit', 10)));

        $disk    = Storage::disk('public');
        $folders = ['ngo-applications', 'databoy-applications', 'databoy'];
        $manager = new ImageManager(new Driver());

        // Collect all image files across all folders
        $allFiles = [];
        foreach ($folders as $folder) {
            if (!$disk->exists($folder)) continue;
            foreach ($disk->files($folder) as $path) {
                $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png'])) {
                    $allFiles[] = $path;
                }
            }
        }

        $total = count($allFiles);
        $batch = array_slice($allFiles, $offset, $limit);

        $compressed = 0;
        $skipped    = 0;
        $errors     = [];
        $log        = [];
        $savedBytes = 0;

        foreach ($batch as $path) {
            $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $fullPath = $disk->path($path);

            if (!file_exists($fullPath)) {
                $skipped++;
                continue;
            }

            $originalSize = filesize($fullPath);

            try {
                $image = $manager->read($fullPath);

                if ($ext === 'png') {
                    $image->toPng()->save($fullPath);
                } else {
                    $image->toJpeg(75)->save($fullPath);
                }

                clearstatcache(true, $fullPath);
                $newSize = filesize($fullPath);
                $saved   = $originalSize - $newSize;

                if ($saved > 0) {
                    $savedBytes += $saved;
                    $log[] = [
                        'file'   => basename($path),
                        'before' => $this->formatBytes($originalSize),
                        'after'  => $this->formatBytes($newSize),
                        'saved'  => $this->formatBytes($saved),
                    ];
                    $compressed++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                $errors[] = basename($path) . ': ' . $e->getMessage();
            }
        }

        return response()->json([
            'compressed' => $compressed,
            'skipped'    => $skipped,
            'errors'     => $errors,
            'log'        => $log,
            'savedBytes' => $savedBytes,
            'savedTotal' => $this->formatBytes($savedBytes),
            'total'      => $total,
            'offset'     => $offset,
            'limit'      => $limit,
            'done'       => ($offset + count($batch)) >= $total,
        ]);
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) return round($bytes / 1048576, 1) . ' MB';
        if ($bytes >= 1024)    return round($bytes / 1024, 1) . ' KB';
        return $bytes . ' B';
    }

    private function updateDbPath(string $old, string $new): void
    {
        $cols = [
            'passport_photograph_path',
            'valid_id_card_path',
            'highest_qualification_certificate_path',
        ];

        foreach ($cols as $col) {
            NgoContractApplication::where($col, $old)->update([$col => $new]);
            DataboyApplication::where($col, $old)->update([$col => $new]);
            Databoy::where($col, $old)->update([$col => $new]);
        }
    }
}
