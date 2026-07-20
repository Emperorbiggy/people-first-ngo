<?php

namespace App\Jobs\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Shared by every job that pays someone (applicant or party agent) via
 * Paystack, so the payment bookkeeping (and the "no double payment" guard
 * built on top of it) stays in exactly one place. Each using class points
 * this at its own payments table via paymentModelClass() and the foreign
 * key that table uses via paymentForeignKey() — e.g. general applicant
 * payments, accreditation payments, and party agent payments are all
 * tracked in entirely separate tables, so being paid under one never
 * blocks (or gets confused with) being paid under another.
 */
trait PersistsApplicantPayments
{
    /**
     * @return class-string<Model> the Eloquent model backing this job's payments table
     */
    abstract protected function paymentModelClass(): string;

    /**
     * @return string the column on the payments table that references the payee (e.g. 'databoy_application_id')
     */
    abstract protected function paymentForeignKey(): string;

    /**
     * A payee with any non-failed payment (in this job's payments table)
     * has already been paid and must never be paid again. One whose only
     * attempts failed is still eligible so it can be retried.
     */
    protected function alreadyPaid(Model $payee): bool
    {
        $model = $this->paymentModelClass();

        return $model::where($this->paymentForeignKey(), $payee->id)
            ->where('status', '!=', 'failed')
            ->exists();
    }

    protected function generateApplicantReference(Model $payee, string $prefix = 'applicant'): string
    {
        return $prefix . '-' . $payee->id . '-' . now()->timestamp . '-' . Str::random(6);
    }

    /**
     * Paystack queues bulk transfers asynchronously and reports them as
     * "pending" at initiation time; with OTP disabled there's no manual
     * confirmation step left, so "pending" is treated as a completed payment.
     */
    protected function normalizeTransferStatus(?string $status): string
    {
        return ($status === null || $status === 'pending') ? 'success' : $status;
    }

    protected function recordApplicantPayment(
        Model $payee,
        float $amount,
        string $reference,
        ?string $transferCode,
        string $status,
        ?string $message
    ): Model {
        $model = $this->paymentModelClass();

        return $model::create([
            $this->paymentForeignKey() => $payee->id,
            'amount'                   => $amount,
            'bank_name'                => $payee->bank_name,
            'bank_code'                => $payee->bank_code,
            'account_number'           => $payee->account_number,
            'account_name'             => $payee->bank_account_name,
            'recipient_code'           => $payee->recipient?->recipient_code,
            'transfer_code'            => $transferCode,
            'reference'                => $reference,
            'status'                   => $status,
            'message'                  => $message,
        ]);
    }
}
