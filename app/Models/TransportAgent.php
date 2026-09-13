<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

/**
 * An agent who registers transportation vehicles and their owners.
 *
 * Authenticatable in its own right, on its own guard — they log in with the
 * phone number they registered with.
 */
class TransportAgent extends Authenticatable
{
    use Notifiable;

    /**
     * The two streams, each with its own registration link.
     *
     * `vehicle_category` ties the agent to what they may capture in the portal,
     * so the split survives past registration.
     */
    public const CATEGORIES = [
        'bike_maruwa' => [
            'slug'             => 'bike-maruwa',
            'label'            => 'Bike & Maruwa',
            'also'             => 'Motorcycles & Tricycles',
            'vehicle_category' => 'motorcycle_tricycle',
        ],
        'korobe_bus' => [
            'slug'             => 'korobe-bus',
            'label'            => 'Korobe Bus',
            'also'             => 'Buses & Cars',
            'vehicle_category' => 'bus',
        ],
    ];

    /**
     * Zones and branches offered at registration.
     *
     * Empty until the official lists are supplied; while empty the form falls
     * back to a text box so registration is never blocked on them.
     */
    public const ZONES = [];

    public const BRANCHES = [];

    /** The government IDs accepted at registration. */
    public const ID_TYPES = [
        'drivers_licence'        => "Driver's Licence",
        'voters_card'            => "Voter's Card",
        'international_passport' => 'International Passport',
    ];

    /** No longer offered, but still on the records of agents who gave one. */
    private const RETIRED_ID_TYPES = [
        'nin' => 'NIN (National Identity Number)',
    ];

    protected $fillable = [
        'full_name', 'phone_number', 'whatsapp_number', 'browsing_number', 'email', 'gender', 'address',
        'category', 'zone', 'branch_name',
        'passport_photograph_path', 'id_type', 'id_number', 'id_document_path',
        'lga_id', 'lga_name',
        'bank_name', 'bank_code', 'account_number', 'bank_account_name',
        'login_password_plain', 'password', 'is_active', 'role', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token', 'login_password_plain'];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
    ];

    protected $appends = ['id_type_label', 'category_label', 'passport_photograph_url', 'id_document_url'];

    public function getCategoryLabelAttribute(): ?string
    {
        return self::CATEGORIES[$this->category]['label'] ?? null;
    }

    /** What this agent is allowed to capture; null means the older, unsplit agent. */
    public function getVehicleCategoryAttribute(): ?string
    {
        return self::CATEGORIES[$this->category]['vehicle_category'] ?? null;
    }

    /** The category behind a registration link slug, or null if it is not one. */
    public static function categoryForSlug(string $slug): ?string
    {
        foreach (self::CATEGORIES as $key => $category) {
            if ($category['slug'] === $slug) {
                return $key;
            }
        }

        return null;
    }

    public function getIdTypeLabelAttribute(): ?string
    {
        if (blank($this->id_type)) {
            return null;
        }

        return self::ID_TYPES[$this->id_type]
            ?? self::RETIRED_ID_TYPES[$this->id_type]
            ?? $this->id_type;
    }

    public function getPassportPhotographUrlAttribute(): ?string
    {
        return $this->fileUrl($this->passport_photograph_path);
    }

    public function getIdDocumentUrlAttribute(): ?string
    {
        return $this->fileUrl($this->id_document_path);
    }

    private function fileUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }

    /**
     * Agents registered before the passport photograph was asked for have none.
     * They are held at their profile until they supply one.
     *
     * The ID columns are no longer part of this: IDs are not collected any
     * more, so requiring one would lock out everybody who never gave it.
     */
    public function hasCompleteIdentity(): bool
    {
        return filled($this->passport_photograph_path);
    }

    /** They sign in with their phone number, not an email. */
    public function getAuthIdentifierName(): string
    {
        return 'phone_number';
    }

    public function lga() { return $this->belongsTo(Lga::class); }
}
