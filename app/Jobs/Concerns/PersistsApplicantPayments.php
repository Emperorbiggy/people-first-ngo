<?php

namespace App\Jobs\Concerns;

use App\Models\DataboyApplication;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Shared by every job that pays an applicant via Paystack, so the payment
 * bookkeeping (and the "no double payment" guard built on top of it) stays
 * in exactly one place. Each using class points this at its own payments
 * table via paymentModelClass() — e.g. general applicant payments and
 * accreditation payments are tracked in entirely separate tables, so an
 * applicant can legitimately receive both without either one thinking the
 * applicant is "already paid" because of the other.
 */
trait PersistsApplicantPayments
{
    /**
     * @return class-string<Model> the Eloquent model backing this job's payments table
     */
    abstract protected function paymentModelClass(): string;

    /**
     * An applicant with any non-failed payment (in this job's payments table)
     * has already been paid and must never be paid again. One whose only
     * attempts failed is still eligible so it can be retried.
     */
    protected function alreadyPaid(DataboyApplication $application): bool
    {
        $model = $this->paymentModelClass();

        return $model::where('databoy_application_id', $application->id)
            ->where('status', '!=', 'failed')
            ->exists();
    }

    protected function generateApplicantReference(DataboyApplication $application, string $prefix = 'applicant'): string
    {
        return $prefix . '-' . $application->id . '-' . now()->timestamp . '-' . Str::random(6);
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
        DataboyApplication $application,
        float $amount,
        string $reference,
        ?string $transferCode,
        string $status,
        ?string $message
    ): Model {
        $model = $this->paymentModelClass();

        return $model::create([
            'databoy_application_id' => $application->id,
            'amount'                 => $amount,
            'bank_name'              => $application->bank_name,
            'bank_code'              => $application->bank_code,
            'account_number'         => $application->account_number,
            'account_name'           => $application->bank_account_name,
            'recipient_code'         => $application->recipient?->recipient_code,
            'transfer_code'          => $transferCode,
            'reference'              => $reference,
            'status'                 => $status,
            'message'                => $message,
        ]);
    }
}
