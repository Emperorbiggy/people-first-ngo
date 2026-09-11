<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Shrinks an uploaded photo before it is stored.
 *
 * A phone camera hands us 4–8 MB per shot at a resolution far beyond anything
 * these photos are ever viewed at. Scaling the long edge down to what is
 * actually looked at, and re-encoding as progressive JPEG at quality 82, takes
 * the usual upload to a couple of hundred kilobytes with no difference the eye
 * can find at normal viewing size.
 *
 * Nothing is scaled UP, so a small photo is left at its own size.
 */
class ImageCompressor
{
    /** Longest edge kept, in pixels, by what the photo is for. */
    public const PORTRAIT = 1200;   // a face, shown small
    public const DOCUMENT = 1800;   // small print on an ID must stay readable
    public const PHOTO    = 1600;   // a vehicle, a person, a plate

    /**
     * 82 is the point where JPEG artefacts stop being visible on photographs.
     * Going higher costs a lot of bytes for detail nobody can see; going lower
     * starts to show on the flat areas of a passport photograph.
     */
    private const QUALITY = 82;

    /**
     * Compress and store, returning the stored path.
     *
     * If the file cannot be decoded — a format GD does not know, a truncated
     * upload — it is stored untouched rather than lost. A slightly larger file
     * is a much smaller problem than a registration that will not go through.
     */
    public function store(UploadedFile $file, string $folder, string $basename, int $maxEdge = self::PHOTO): string
    {
        $folder = trim($folder, '/');

        try {
            $encoded = $this->encode($file, $maxEdge);
        } catch (\Throwable $e) {
            Log::warning('Image compression failed, storing the original.', [
                'file'  => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            return $file->storeAs($folder, $basename . '.' . $file->getClientOriginalExtension(), 'public');
        }

        $path = $folder . '/' . $basename . '.jpg';
        Storage::disk('public')->put($path, $encoded);

        return $path;
    }

    private function encode(UploadedFile $file, int $maxEdge): string
    {
        $image = (new ImageManager(new Driver()))->read($file->getRealPath());

        // A phone records which way it was held in EXIF rather than rotating
        // the pixels. Stripping that metadata below would leave the photo on
        // its side, so the rotation is baked in first.
        $image->orient();

        // A PNG screenshot of an ID can carry transparency, and JPEG has none —
        // without this it would be composited onto black.
        $image->blendTransparency('ffffff');

        // Fits the image inside the box, keeping the aspect ratio and never
        // enlarging.
        $image->scaleDown($maxEdge, $maxEdge);

        // strip: EXIF carries the phone's GPS coordinates, among other things.
        // None of it is used here and it does not belong in a public file.
        return (string) $image->toJpeg(quality: self::QUALITY, progressive: true, strip: true);
    }
}
