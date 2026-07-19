<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    private $secretKey;
    private $baseUrl;

    public function __construct()
    {
        $this->secretKey = Setting::get('paystack_secret_key') ?: config('services.paystack.secret_key');
        $this->baseUrl = 'https://api.paystack.co';
    }

    /**
     * Log every Paystack API response, success or failure
     */
    private function logResponse(string $method, $response): void
    {
        $level = $response->successful() ? 'info' : 'error';
        Log::$level("Paystack {$method} response [{$response->status()}]: " . $response->body());
    }

    /**
     * POST with exponential backoff retry on 429 (rate limit) responses.
     */
    private function postWithRetry(string $method, string $url, array $payload)
    {
        $maxAttempts = 3;
        $delayMs     = 300;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
            ])->post($url, $payload);

            $this->logResponse($method, $response);

            if ($response->status() !== 429 || $attempt === $maxAttempts) {
                return $response;
            }

            usleep($delayMs * 1000);
            $delayMs *= 2;
        }

        return $response;
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

            $this->logResponse('fetchBanks', $response);

            if ($response->successful()) {
                return $response->json()['data'];
            }

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

            $this->logResponse('resolveAccountNumber', $response);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

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

    /**
     * Get the available balance on the Paystack account
     */
    public function getBalance()
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
            ])->get($this->baseUrl . '/balance');

            $this->logResponse('getBalance', $response);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

            return [
                'status' => false,
                'message' => $response->json()['message'] ?? 'Unable to fetch balance'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack getBalance exception: ' . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Network error. Please try again.'
            ];
        }
    }

    /**
     * Create a transfer recipient
     */
    public function createRecipient(array $data)
    {
        try {
            $response = $this->postWithRetry('createRecipient', $this->baseUrl . '/transferrecipient', [
                'type' => 'nuban',
                'name' => $data['name'],
                'account_number' => $data['account_number'],
                'bank_code' => $data['bank_code'],
                'currency' => 'NGN',
            ]);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

            return [
                'status' => false,
                'message' => $response->json()['message'] ?? 'Unable to create recipient'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack createRecipient exception: ' . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Network error. Please try again.'
            ];
        }
    }

    /**
     * Initiate a bulk transfer to multiple recipients
     */
    public function initiateBulkTransfer(array $transfers)
    {
        try {
            $response = $this->postWithRetry('initiateBulkTransfer', $this->baseUrl . '/transfer/bulk', [
                'source' => 'balance',
                'transfers' => $transfers,
            ]);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

            return [
                'status' => false,
                'message' => $response->json()['message'] ?? 'Unable to initiate bulk transfer'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack initiateBulkTransfer exception: ' . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Network error. Please try again.'
            ];
        }
    }

    /**
     * Initiate a single transfer to one recipient.
     */
    public function initiateTransfer(string $recipientCode, int $amountKobo, string $reference, string $reason)
    {
        try {
            $response = $this->postWithRetry('initiateTransfer', $this->baseUrl . '/transfer', [
                'source'    => 'balance',
                'amount'    => $amountKobo,
                'recipient' => $recipientCode,
                'reference' => $reference,
                'reason'    => $reason,
            ]);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

            return [
                'status' => false,
                'message' => $response->json()['message'] ?? 'Unable to initiate transfer'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack initiateTransfer exception: ' . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Network error. Please try again.'
            ];
        }
    }

    /**
     * Finalize a transfer that requires an OTP
     */
    public function finalizeTransfer($transferCode, $otp)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
            ])->post($this->baseUrl . '/transfer/finalize_transfer', [
                'transfer_code' => $transferCode,
                'otp' => $otp,
            ]);

            $this->logResponse('finalizeTransfer', $response);

            if ($response->successful()) {
                return [
                    'status' => true,
                    'data' => $response->json()['data']
                ];
            }

            return [
                'status' => false,
                'message' => $response->json()['message'] ?? 'Unable to finalize transfer'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack finalizeTransfer exception: ' . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Network error. Please try again.'
            ];
        }
    }
}
