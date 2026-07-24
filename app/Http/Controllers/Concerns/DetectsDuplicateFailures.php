<?php

namespace App\Http\Controllers\Concerns;

trait DetectsDuplicateFailures
{
    /**
     * A failure caused by the payee's bank account already belonging to
     * someone else is permanent, not transient — retrying can never succeed
     * while the duplicate holds, so these must never be offered for retry
     * or counted as an actionable failure.
     */
    protected function isDuplicateAccountFailure(?string $message): bool
    {
        return $message !== null && str_contains($message, 'Duplicate account number');
    }
}
