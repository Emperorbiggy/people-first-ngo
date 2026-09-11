<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class RegisteredVehicle extends Model
{
    /** The two streams the work is counted in. */
    public const CATEGORIES = [
        'bus'                 => 'Buses & Cars',
        'motorcycle_tricycle' => 'Motorcycles & Tricycles',
    ];

    /** Vehicle types offered under each category. */
    public const TYPES = [
        'bus'                 => ['Bus', 'Mini Bus', 'Car', 'Jeep/SUV', 'Truck'],
        'motorcycle_tricycle' => ['Motorcycle', 'Tricycle (Keke)'],
    ];

    protected $fillable = [
        'transport_agent_id', 'lga_id', 'lga_name',
        'category', 'vehicle_type', 'plate_number', 'make_model', 'colour', 'capacity',
        'owner_name', 'owner_phone', 'owner_address',
        'vehicle_photo_path', 'owner_photo_path',
    ];

    protected $casts = ['capacity' => 'integer'];

    protected $appends = ['category_label', 'vehicle_photo_url', 'owner_photo_url'];

    public function getCategoryLabelAttribute(): string
    {
        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    public function getVehiclePhotoUrlAttribute(): ?string
    {
        return $this->photoUrl($this->vehicle_photo_path);
    }

    public function getOwnerPhotoUrlAttribute(): ?string
    {
        return $this->photoUrl($this->owner_photo_path);
    }

    private function photoUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }

    public function agent() { return $this->belongsTo(TransportAgent::class, 'transport_agent_id'); }
    public function lga()   { return $this->belongsTo(Lga::class); }

    public function scopeBus($query)        { return $query->where('category', 'bus'); }
    public function scopeTwoWheeler($query) { return $query->where('category', 'motorcycle_tricycle'); }
}
