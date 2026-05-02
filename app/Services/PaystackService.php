<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    private $secretKey;
    private $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.paystack.secret_key');
        $this->baseUrl = 'https://api.paystack.co';
    }

    /**
     * Fetch banks from Paystack API
     */
    public function fetchBanks()
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
            ])->get($this->baseUrl . '/bank');

            if ($response->successful()) {
                return $response->json()['data'];
            }

            Log::error('Paystack fetchBanks failed: ' . $response->body());
            return [];
        } catch (\Exception $e) {
            Log::error('Paystack fetchBanks exception: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Resolve account number with Paystack API
     */
    public function resolveAccountNumber($accountNumber, $bankCode)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
            ])->get($this->baseUrl . '/bank/resolve', [
                'account_number' => $accountNumber,
                'bank_code' => $bankCode,
            ]);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

            Log::error('Paystack resolveAccountNumber failed: ' . $response->body());
            return [
                'status' => false,
                'message' => $response->json()['message'] ?? 'Unable to resolve account'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack resolveAccountNumber exception: ' . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Network error. Please try again.'
            ];
        }
    }
}
