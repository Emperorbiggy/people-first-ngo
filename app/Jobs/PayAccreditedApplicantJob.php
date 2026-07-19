<?php

namespace App\Jobs;

use App\Jobs\Concerns\PersistsApplicantPayments;
use App\Models\AccreditationPayment;
use App\Models\DataboyApplication;
use App\Models\LgaTransportFare;
use App\Models\Setting;
use App\Services\PaystackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Pays a single applicant the moment they're checked out and accredited:
 * the general accreditation amount plus their LGA's transport fare.
 *
 * Recorded in the accreditation_payments table — a completely separate pool
 * from the general applicant_payments table the manual bulk "Applicant
 * Payment" page uses. An applicant can legitimately receive both an
 * accreditation payment and a regular applicant payment; the two must never
 * be confused with each other for the "already paid" guard.
 *
 * Dispatched exactly once per applicant, from Databoy\AccreditationController
 * ::checkOut(), which itself only ever runs once per applicant (guarded by
 * checked_out_at). The alreadyPaid() check below (scoped to
 * accreditation_payments only, via paymentModelClass()) is the second,
 * independent layer of that guarantee.
 */
class PayAccreditedApplicantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, PersistsApplicantPayments;

    public int $tries = 1;
    public int $timeout = 90;

    public function __construct(public int $databoyApplicationId)
    {
    }

    public function handle(PaystackService $paystack): void
    {
        $log = fn (string $msg, array $context = []) => Log::info("[PayAccreditedApplicantJob #{$this->databoyApplicationId}] {$msg}", $context);

        $log('Started.');

        $application = DataboyApplication::with('recipient')->find($this->databoyApplicationId);

        if (!$application) {
            Log::warning("[PayAccreditedApplicantJob #{$this->databoyApplicationId}] Aborted: applicant not found.");
            return;
        }

        if (!$application->is_accredited) {
            $log('Aborted: applicant is not accredited (is_accredited=false).');
            return;
        }

        $log('Applicant found.', ['full_name' => $application->full_name, 'lga_id' => $application->lga_id]);

        if ($this->alreadyPaid($application)) {
            $log('Aborted: applicant already has a non-failed payment record. No duplicate payment sent.');
            return;
        }

        $log('Not previously paid — proceeding.');

        if (!$application->recipient || $application->recipient->status !== 'success') {
            $log('No successful recipient on file yet — creating one now via CreateApplicantRecipientJob (sync).');
            CreateApplicantRecipientJob::dispatchSync($application->id);
            $application->refresh();
            $application->load('recipient');
            $log('Recipient creation attempt finished.', [
                'status'  => $application->recipient->status ?? 'still missing',
                'message' => $application->recipient->message ?? null,
            ]);
        } else {
            $log('Using existing recipient.', ['recipient_code' => $application->recipient->recipient_code]);
        }

        $breakdown = $this->computeAmount($application);
        $amount    = $breakdown['total'];

        if (!$application->recipient || $application->recipient->status !== 'success') {
            $failMessage = $application->recipient->message ?? 'Failed to create transfer recipient.';
            $log('Aborted: no successful recipient available.', ['message' => $failMessage]);
            $this->recordApplicantPayment(
                $application,
                $amount,
                $this->generateApplicantReference($application, 'accreditation'),
                null,
                'failed',
                $failMessage
            );
            return;
        }

        $log('Amount computed.', ['general_amount' => $breakdown['general'], 'lga_transport_fare' => $breakdown['fare'], 'total' => $amount]);

        if ($amount <= 0) {
            $log('Aborted: total amount is zero — accreditation_general_amount not configured.');
            $this->recordApplicantPayment(
                $application,
                0,
                $this->generateApplicantReference($application, 'accreditation'),
                null,
                'failed',
                'Accreditation amount not configured — set a general amount in Settings.'
            );
            return;
        }

        // Re-check right before the transfer — closes the race window between
        // the guard above and the (potentially slow) recipient-creation call.
        if ($this->alreadyPaid($application)) {
            $log('Aborted: applicant got paid by another process while this job was running (race-condition guard).');
            return;
        }

        // Pace transfer calls so a burst of checkouts processed back-to-back by
        // the worker (e.g. catching up after a delayed cron run) doesn't fire
        // Paystack calls with zero gap between them.
        usleep(200000);

        $reference = $this->generateApplicantReference($application, 'accreditation');

        $log('Calling Paystack initiateTransfer.', [
            'recipient_code' => $application->recipient->recipient_code,
            'amount_kobo'    => (int) round($amount * 100),
            'reference'      => $reference,
        ]);

        $result = $paystack->initiateTransfer(
            $application->recipient->recipient_code,
            (int) round($amount * 100),
            $reference,
            'Accreditation payment'
        );

        $log('Paystack initiateTransfer responded.', $result);

        if (!$result['status']) {
            $log('Transfer failed — recording failed payment.', ['message' => $result['message'] ?? null]);
            $this->recordApplicantPayment($application, $amount, $reference, null, 'failed', $result['message'] ?? 'Transfer failed.');
            return;
        }

        $data = $result['data'] ?? [];

        $payment = $this->recordApplicantPayment(
            $application,
            $amount,
            $data['reference'] ?? $reference,
            $data['transfer_code'] ?? null,
            $this->normalizeTransferStatus($data['status'] ?? null),
            $data['reason'] ?? null
        );

        $log('Finished — payment recorded.', ['payment_id' => $payment->id, 'status' => $payment->status]);
    }

    /**
     * @return array{general: float, fare: float, total: float}
     */
    private function computeAmount(DataboyApplication $application): array
    {
        $general = (float) Setting::get('accreditation_general_amount', 0);
        $fare    = (float) (LgaTransportFare::where('lga_id', $application->lga_id)->value('amount') ?? 0);

        return ['general' => $general, 'fare' => $fare, 'total' => $general + $fare];
    }

    protected function paymentModelClass(): string
    {
        return AccreditationPayment::class;
    }
}
