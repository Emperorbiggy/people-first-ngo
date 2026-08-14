<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One import of people to pay. Everything downstream — bank matching,
 * recipient creation, the transfer itself — is scoped to a batch, so several
 * imports can sit side by side and be paid separately.
 */
class BulkTransferBatch extends Model
{
    /**
     * Narration every transfer carries unless the batch or the row says
     * otherwise. Held in one place so the page, the import and the job cannot
     * disagree about what recipients will see.
     */
    public const DEFAULT_REMARK = 'OSSG SECURITY PACKAGE';

    protected $fillable = ['reference', 'name', 'remark', 'file_name', 'rows_read', 'skipped_count', 'skipped_rows', 'skipped_reviewed_at'];

    protected $casts = ['skipped_rows' => 'array'];

    public function recipients() { return $this->hasMany(BulkTransferRecipient::class, 'batch_id'); }

    public function payments()
    {
        return $this->hasManyThrough(
            BulkTransferPayment::class,
            BulkTransferRecipient::class,
            'batch_id',
            'bulk_transfer_recipient_id'
        );
    }
}
