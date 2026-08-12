<?php

namespace App\Support;

use App\Services\PaystackService;
use Illuminate\Support\Collection;

/**
 * Resolves a written bank name to a Paystack bank code.
 *
 * Shared by every module that imports bank details, so the alias list only ever
 * needs fixing in one place.
 */
class BankMatcher
{
    /**
     * Shorthand that shares no substring with the bank's registered name, so
     * neither an exact nor a containment match could ever find it. Names like
     * "Zenith" → "Zenith Bank" are handled by containment and don't belong here.
     */
    private const ALIASES = [
        'gtb'          => 'guarantytrust',
        'gtbank'       => 'guarantytrust',
        'gtco'         => 'guarantytrust',
        'gtbplc'       => 'guarantytrust',
        'uba'          => 'unitedbankforafrica',
        'fcmb'         => 'firstcitymonument',
        'fbn'          => 'firstbank',
        'firstbankplc' => 'firstbank',
        'ibtc'         => 'stanbicibtc',
        'stanbic'      => 'stanbicibtc',
        'ecobankplc'   => 'ecobank',
        'zenithplc'    => 'zenith',
    ];

    private ?Collection $banks = null;

    public function __construct(private PaystackService $paystack)
    {
    }

    /** Paystack's bank list, fetched once per instance. */
    public function banks(): Collection
    {
        if ($this->banks !== null) {
            return $this->banks;
        }

        $response = $this->paystack->fetchBanks();
        $rows     = $response['data'] ?? (is_array($response) ? $response : []);

        return $this->banks = collect($rows)
            ->filter(fn ($bank) => !empty($bank['name']) && !empty($bank['code']))
            ->values();
    }

    public function hasBanks(): bool
    {
        return $this->banks()->isNotEmpty();
    }

    /**
     * Exact match wins, then containment — so "Union Bank" is never swallowed
     * by a looser candidate.
     */
    public function codeFor(?string $written): ?string
    {
        $needle = $this->normalise($written);

        if ($needle === '') {
            return null;
        }

        $needle = self::ALIASES[$needle] ?? $needle;

        $exact = $this->banks()->first(fn ($bank) => $this->normalise($bank['name']) === $needle);

        if ($exact) {
            return $exact['code'];
        }

        $loose = $this->banks()->first(function ($bank) use ($needle) {
            $name = $this->normalise($bank['name']);

            return $name !== '' && (str_contains($name, $needle) || str_contains($needle, $name));
        });

        return $loose['code'] ?? null;
    }

    private function normalise(?string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower((string) $value));
    }
}
