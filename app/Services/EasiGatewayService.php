<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EasiGatewayService
{
    private string $baseUrl;
    private string $apiKey;
    private string $serviceId;
    private string $dataServiceId;

    public function __construct()
    {
        $this->baseUrl       = rtrim(config('services.easigateway.url'), '/');
        $this->apiKey        = config('services.easigateway.key');
        $this->serviceId     = config('services.easigateway.service_id');
        $this->dataServiceId = config('services.easigateway.data_service_id');
    }

    /**
     * Fetch available airtime networks (service categories) from EasiGateway.
     * @return array{status: string, data: array}
     */
    public function getServiceCategories(): array
    {
        $url = "{$this->baseUrl}/vas/{$this->serviceId}/service-categories";

        try {
            $response = Http::withHeaders([
                'accept'    => '*/*',
                'x-api-key' => $this->apiKey,
            ])->timeout(30)->get($url);

            $body = $response->json() ?? [];
            $this->log('getServiceCategories', 'GET', $url, null, $response->status(), $body);

            if ($response->successful() && isset($body['data'])) {
                return ['status' => 'success', 'data' => $body['data']];
            }

            return ['status' => 'failed', 'data' => []];
        } catch (\Throwable $e) {
            $this->logException('getServiceCategories', 'GET', $url, $e);
            return ['status' => 'failed', 'data' => []];
        }
    }

    /**
     * Fetch available data (bundle) networks — service categories under the
     * data service, not the airtime one.
     * @return array{status: string, data: array}
     */
    public function getDataServiceCategories(): array
    {
        $url = "{$this->baseUrl}/vas/{$this->dataServiceId}/service-categories";

        try {
            $response = Http::withHeaders([
                'accept'    => '*/*',
                'x-api-key' => $this->apiKey,
            ])->timeout(30)->get($url);

            $body = $response->json() ?? [];
            $this->log('getDataServiceCategories', 'GET', $url, null, $response->status(), $body);

            if ($response->successful() && isset($body['data'])) {
                return ['status' => 'success', 'data' => $body['data']];
            }

            return ['status' => 'failed', 'data' => []];
        } catch (\Throwable $e) {
            $this->logException('getDataServiceCategories', 'GET', $url, $e);
            return ['status' => 'failed', 'data' => []];
        }
    }

    /**
     * Fetch the data plans / products available under a given service category.
     * @return array{status: string, data: array}
     */
    public function getServiceCategoryProducts(string $categoryId): array
    {
        $url = "{$this->baseUrl}/vas/service-category/{$categoryId}/products";

        try {
            $response = Http::withHeaders([
                'accept'    => '*/*',
                'x-api-key' => $this->apiKey,
            ])->timeout(30)->get($url);

            $body = $response->json() ?? [];
            $this->log('getServiceCategoryProducts', 'GET', $url, null, $response->status(), $body);

            if ($response->successful() && isset($body['data'])) {
                return ['status' => 'success', 'data' => $body['data']];
            }

            return ['status' => 'failed', 'data' => []];
        } catch (\Throwable $e) {
            $this->logException('getServiceCategoryProducts', 'GET', $url, $e);
            return ['status' => 'failed', 'data' => []];
        }
    }

    /**
     * Initiate a bank-transfer collection (virtual account funding).
     * @return array{status: string, data: mixed}
     */
    public function initiateCollection(string $customerName, string $customerEmail, float $amount): array
    {
        $url     = "{$this->baseUrl}/collections/payments";
        $payload = [
            'customer_name'  => $customerName,
            'customer_email' => $customerEmail,
            'currency'       => 'NGN',
            'amount'         => $amount,
            'method'         => 'banktransfer',
        ];

        try {
            $response = Http::withHeaders([
                'accept'       => '*/*',
                'x-api-key'    => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($url, $payload);

            $body = $response->json() ?? [];
            $this->log('initiateCollection', 'POST', $url, $payload, $response->status(), $body);

            if ($response->successful()) {
                // Override bank name from BudPay Bank to Globus Bank
                if (isset($body['data']['bank_name']) && $body['data']['bank_name'] === 'BudPay Bank') {
                    $body['data']['bank_name'] = 'Globus Bank';
                }
                return ['status' => 'success', 'data' => $body];
            }

            return ['status' => 'failed', 'message' => $body['message'] ?? 'Failed to create virtual account', 'data' => $body];
        } catch (\Throwable $e) {
            $this->logException('initiateCollection', 'POST', $url, $e);
            return ['status' => 'failed', 'message' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * Verify a collection payment by reference.
     * @return array{status: string, data: mixed}
     */
    public function verifyCollection(string $reference): array
    {
        $url = "{$this->baseUrl}/collections/verify/{$reference}";

        try {
            $response = Http::withHeaders([
                'accept'    => '*/*',
                'x-api-key' => $this->apiKey,
            ])->timeout(30)->get($url);

            $body = $response->json() ?? [];
            $this->log('verifyCollection', 'GET', $url, ['reference' => $reference], $response->status(), $body);

            if ($response->successful()) {
                return ['status' => 'success', 'data' => $body];
            }

            return ['status' => 'failed', 'message' => $body['message'] ?? 'Verification failed', 'data' => $body];
        } catch (\Throwable $e) {
            $this->logException('verifyCollection', 'GET', $url, $e);
            return ['status' => 'failed', 'message' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * Purchase airtime via EasiGateway.
     * @return array{status: string, message: string, data: mixed}
     */
    public function purchase(string $phone, string $serviceCategoryId, int $amount): array
    {
        $url     = "{$this->baseUrl}/vas/pay/airtime";
        $payload = [
            'amount'            => $amount,
            'serviceCategoryId' => $serviceCategoryId,
            'phoneNumber'       => $phone,
        ];

        try {
            $response = Http::withHeaders([
                'accept'       => '*/*',
                'x-api-key'    => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($url, $payload);

            $body = $response->json() ?? [];
            $this->log('purchase', 'POST', $url, $payload, $response->status(), $body);

            if ($response->successful() && $this->isBodySuccess($body)) {
                return ['status' => 'success', 'message' => 'Airtime purchased via EasiGateway', 'data' => $body];
            }

            return ['status' => 'failed', 'message' => $body['message'] ?? 'Purchase failed', 'data' => $body];
        } catch (\Throwable $e) {
            $this->logException('purchase', 'POST', $url, $e);
            return ['status' => 'failed', 'message' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * Purchase a data bundle via EasiGateway.
     * @return array{status: string, message: string, data: mixed}
     */
    public function purchaseData(string $phone, string $serviceCategoryId, string $bundleCode, int $amount): array
    {
        $url     = "{$this->baseUrl}/vas/pay/data";
        $payload = [
            'amount'            => $amount,
            'serviceCategoryId' => $serviceCategoryId,
            'bundleCode'        => $bundleCode,
            'phoneNumber'       => $phone,
        ];

        try {
            $response = Http::withHeaders([
                'accept'       => '*/*',
                'x-api-key'    => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($url, $payload);

            $body = $response->json() ?? [];
            $this->log('purchaseData', 'POST', $url, $payload, $response->status(), $body);

            if ($response->successful() && $this->isBodySuccess($body)) {
                return ['status' => 'success', 'message' => 'Data bundle purchased via EasiGateway', 'data' => $body];
            }

            return ['status' => 'failed', 'message' => $body['message'] ?? 'Purchase failed', 'data' => $body];
        } catch (\Throwable $e) {
            $this->logException('purchaseData', 'POST', $url, $e);
            return ['status' => 'failed', 'message' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * Enquire account name for a given account number and bank code.
     * POST /api/transfers/name-enquiry
     * @return array{status: string, data: mixed}
     */
    public function nameEnquiry(string $accountNumber, string $bankCode): array
    {
        $url     = "{$this->baseUrl}/transfers/name-enquiry";
        $payload = [
            'accountNumber' => $accountNumber,
            'bankCode'      => $bankCode,
        ];

        try {
            $response = Http::withHeaders([
                'accept'       => '*/*',
                'x-api-key'    => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($url, $payload);

            $body = $response->json() ?? [];

            if ($response->successful() && ($body['status'] ?? false) === true) {
                return ['status' => 'success', 'data' => $body['data'] ?? $body];
            }

            $msg = is_array($body['message'] ?? null)
                ? implode(', ', $body['message'])
                : ($body['message'] ?? 'Name enquiry failed');

            return ['status' => 'failed', 'message' => $msg, 'data' => null];
        } catch (\Throwable $e) {
            $this->logException('nameEnquiry', 'POST', $url, $e);
            return ['status' => 'failed', 'message' => $e->getMessage(), 'data' => null];
        }
    }

    private function isBodySuccess(array $body): bool
    {
        // top-level boolean status (EasiGateway airtime response)
        if (($body['status'] ?? null) === true) {
            return true;
        }

        // top-level numeric status code
        if (($body['statusCode'] ?? $body['status_code'] ?? 0) === 200) {
            return true;
        }

        // nested: body.data.statusCode (EasiGateway wraps inner response)
        if (($body['data']['statusCode'] ?? 0) === 200) {
            return true;
        }

        // nested: body.data.data.status (inner transaction status)
        if (($body['data']['data']['status'] ?? '') === 'successful') {
            return true;
        }

        return false;
    }

    // ─── Logging helpers ────────────────────────────────────────────────────────

    private function log(string $method, string $verb, string $url, ?array $payload, int $httpStatus, array $body): void {}

    private function logException(string $method, string $verb, string $url, \Throwable $e): void {}
}
