<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AirtimePurchase;
use App\Models\EasigatewayTransaction;
use App\Models\Setting;
use App\Support\PhoneListParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Records airtime that was bought by hand, outside the system, WITHOUT calling
 * EasiGateway. The rows written are identical to those a real purchase writes —
 * same table, same columns, same balance debit — so history and the running
 * balance line up with what was actually bought.
 *
 * Numbers can be typed in or imported from a sheet. Deliberately absent from
 * the sidebar: it moves the balance without buying anything.
 */
class ManualAirtimePurchaseController extends Controller
{
    private const NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];

    public function __construct(private PhoneListParser $parser)
    {
    }

    public function index()
    {
        return inertia('Admin/ManualAirtimePurchase', [
            'networks'      => self::NETWORKS,
            'balance'       => EasigatewayTransaction::currentBalance(),
            'defaultAmount' => (float) Setting::get('airtime_amount', 0),
            'recent'        => AirtimePurchase::whereNull('databoy_id')
                ->latest()
                ->limit(15)
                ->get(['id', 'phone_number', 'network', 'amount', 'status', 'created_at']),
        ]);
    }

    /** Read numbers out of an uploaded sheet without recording anything yet. */
    public function preview(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        try {
            $numbers = $this->parser->fromFile($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['import' => 'Could not read that file: ' . $e->getMessage()]);
        }

        if (empty($numbers)) {
            return back()->withErrors(['import' => 'No phone numbers found in that file.']);
        }

        return back()->with('importedContacts', ['numbers' => $numbers, 'count' => count($numbers)]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'network'         => 'required|string|max:50',
            'amount'          => 'required|numeric|min:1',
            'phone_numbers'   => 'required|array|min:1',
            'phone_numbers.*' => ['required', 'string', 'regex:/^\d{10,15}$/'],
        ], [
            'phone_numbers.*.regex' => 'One of the numbers is not a valid phone number.',
        ]);

        $amount  = (float) $validated['amount'];
        // Duplicates within a single submission collapse; a number already
        // topped up before is still allowed, matching the real purchase flow.
        $numbers = collect($validated['phone_numbers'])->unique()->values();

        $recorded = 0;

        foreach ($numbers as $number) {
            // One transaction per number so a mid-run failure can't leave a
            // purchase row without its matching balance debit.
            DB::transaction(function () use ($number, $validated, $amount, &$recorded) {
                $purchase = AirtimePurchase::create([
                    'databoy_id'          => null,
                    'phone_number'        => $number,
                    'network'             => $validated['network'],
                    'service_category_id' => null,
                    'amount'              => $amount,
                    'status'              => 'success',
                    'message'             => null,
                ]);

                EasigatewayTransaction::record(
                    'debit',
                    $amount,
                    "Airtime purchase for {$number} ({$validated['network']})",
                    $purchase
                );

                $recorded++;
            });
        }

        return back()->with('success', "Recorded {$recorded} manual airtime purchase(s) of ₦"
            . number_format($amount, 2) . " on {$validated['network']} and debited ₦"
            . number_format($amount * $recorded, 2) . '.');
    }
}
