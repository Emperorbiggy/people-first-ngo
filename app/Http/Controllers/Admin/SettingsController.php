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

    public function compressFiles()
    {
        $disk      = Storage::disk('public');
        $folders   = ['ngo-applications', 'databoy-applications', 'databoy'];
        $manager   = new ImageManager(new Driver());
        $compressed = 0;
        $skipped    = 0;
        $errors     = [];
        $log        = [];
        $savedBytes = 0;

        foreach ($folders as $folder) {
            if (!$disk->exists($folder)) continue;

            foreach ($disk->files($folder) as $path) {
                $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                if (!in_array($ext, ['jpg', 'jpeg', 'png'])) {
                    $skipped++;
                    continue;
                }

                $fullPath    = $disk->path($path);
                $originalSize = filesize($fullPath);

                try {
                    $image = $manager->read($fullPath);

                    if ($ext === 'png') {
                        $image->toPng()->save($fullPath);
                    } else {
                        $image->toJpeg(75)->save($fullPath);
                    }

                    clearstatcache(true, $fullPath);
                    $newSize  = filesize($fullPath);
                    $saved    = $originalSize - $newSize;

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
        }

        return response()->json([
            'compressed' => $compressed,
            'skipped'    => $skipped,
            'errors'     => $errors,
            'log'        => $log,
            'savedTotal' => $this->formatBytes($savedBytes),
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
