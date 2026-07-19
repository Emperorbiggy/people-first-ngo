<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataPlan;
use App\Services\EasiGatewayService;
use Illuminate\Http\Request;

class DataPlanController extends Controller
{
    public function index(EasiGatewayService $easiGateway)
    {
        $result   = $easiGateway->getDataServiceCategories();
        $existing = DataPlan::all()->keyBy('network');

        $networks = collect($result['data'] ?? [])->map(fn ($category) => [
            'id'          => $category['_id'],
            'name'        => $category['name'],
            'identifier'  => $category['identifier'] ?? $category['name'],
            'logo_url'    => $category['logoUrl'] ?? null,
            'plan'        => $existing->get($category['name'])?->only(['bundle_code', 'amount', 'validity']),
        ])->values();

        return inertia('Admin/DataPlans', [
            'networks'     => $networks,
            'fetchFailed'  => $result['status'] !== 'success',
        ]);
    }

    public function products(string $categoryId, EasiGatewayService $easiGateway)
    {
        $result = $easiGateway->getServiceCategoryProducts($categoryId);

        return response()->json([
            'status'  => $result['status'] === 'success',
            'plans'   => $result['data'] ?? [],
        ]);
    }

    public function save(Request $request)
    {
        $validated = $request->validate([
            'network'              => 'required|string|max:100',
            'service_category_id'  => 'required|string|max:100',
            'bundle_code'          => 'required|string|max:100',
            'amount'               => 'required|numeric|min:0',
            'validity'             => 'nullable|string|max:255',
        ]);

        DataPlan::updateOrCreate(
            ['network' => $validated['network']],
            [
                'service_category_id' => $validated['service_category_id'],
                'bundle_code'         => $validated['bundle_code'],
                'amount'              => $validated['amount'],
                'validity'            => $validated['validity'] ?? null,
            ]
        );

        return back()->with('success', "Data plan saved for {$validated['network']}.");
    }
}
