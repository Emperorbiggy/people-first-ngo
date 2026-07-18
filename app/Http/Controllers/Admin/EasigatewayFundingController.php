<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EasigatewayFunding;
use App\Models\EasigatewayTransaction;
use App\Services\EasiGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EasigatewayFundingController extends Controller
{
    public function index()
    {
        $fundings = EasigatewayFunding::with('createdBy:id,name')->latest()->get();
        $transactions = EasigatewayTransaction::latest('id')->take(100)->get();

        return inertia('Admin/EasigatewayFunding', [
            'balance'      => EasigatewayTransaction::currentBalance(),
            'fundings'     => $fundings,
            'transactions' => $transactions,
        ]);
    }

    public function create(Request $request, EasiGatewayService $easiGateway)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $admin = $request->user();

        $result = $easiGateway->initiateCollection($admin->name, $admin->email, (float) $request->amount);

        if ($result['status'] !== 'success') {
            return back()->withErrors(['amount' => $result['message'] ?? 'Failed to initiate funding.']);
        }

        // EasiGateway's response shape: { message, reference, amount, ..., data: { accountNumber, accountName, bankName, externalReference, ... } }
        $body  = $result['data'] ?? [];
        $inner = $body['data'] ?? [];

        $funding = EasigatewayFunding::create([
            'reference'      => $body['reference'] ?? $inner['externalReference'] ?? (string) Str::uuid(),
            'amount'         => $request->amount,
            // EasiGateway adds its own transfer fee on top of the requested amount —
            // total_amount is what the customer must actually send to the virtual
            // account; the wallet is still only credited the requested amount.
            'fee_amount'     => $body['fee_amount'] ?? 0,
            'total_amount'   => $body['total_amount'] ?? $request->amount,
            'customer_name'  => $admin->name,
            'customer_email' => $admin->email,
            'bank_name'      => $inner['bankName'] ?? null,
            'account_number' => $inner['accountNumber'] ?? null,
            'account_name'   => $inner['accountName'] ?? null,
            'status'         => 'pending',
            'expires_at'     => now()->addMinutes(30),
            'raw_response'   => $result['data'],
            'created_by'     => $admin->id,
        ]);

        return back()->with([
            'success'         => 'Virtual account created. Transfer the amount before it expires.',
            'checkoutFunding' => $funding->toArray(),
        ]);
    }

    public function verify(Request $request, EasigatewayFunding $funding, EasiGatewayService $easiGateway)
    {
        $silent = $request->boolean('silent');

        if ($funding->status === 'success') {
            return $silent ? back() : back()->with('success', 'This funding has already been verified.');
        }

        $result = $easiGateway->verifyCollection($funding->reference);

        if ($result['status'] !== 'success') {
            return $silent ? back() : back()->with('error', $result['message'] ?? 'Could not verify this payment yet.');
        }

        $body  = $result['data'] ?? [];
        $inner = $body['data'] ?? [];
        $statusValue = strtolower((string) ($inner['status'] ?? $body['status'] ?? ''));
        $paid = in_array($statusValue, ['success', 'successful', 'paid', 'completed'], true);

        if (!$paid) {
            return $silent ? back() : back()->with('error', 'Payment has not been received yet.');
        }

        $funding->update([
            'status'       => 'success',
            'verified_at'  => now(),
            'raw_response' => $result['data'],
        ]);

        EasigatewayTransaction::record(
            'credit',
            (float) $funding->amount,
            "Wallet funding via bank transfer (ref {$funding->reference})",
            $funding
        );

        return back()->with('success', 'Funding verified and wallet credited.');
    }
}
