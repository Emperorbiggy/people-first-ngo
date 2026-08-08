<?php

namespace App\Http\Controllers\Admin;

use App\Exports\EFormsExport;
use App\Http\Controllers\Controller;
use App\Models\EForm;
use Maatwebsite\Excel\Facades\Excel;

class EFormController extends Controller
{
    public function index()
    {
        $submissions = EForm::latest()->get([
            'id', 'application_id', 'full_name', 'phone_number',
            'lga_of_training', 'gender', 'account_number', 'bank_name', 'created_at',
        ]);

        return inertia('Admin/EForms', [
            'submissions' => $submissions,
            'lgas'        => $submissions->pluck('lga_of_training')->filter()->unique()->sort()->values(),
            'stats'       => [
                'total'  => $submissions->count(),
                'male'   => $submissions->where('gender', 'Male')->count(),
                'female' => $submissions->where('gender', 'Female')->count(),
                'lgas'   => $submissions->pluck('lga_of_training')->filter()->unique()->count(),
            ],
        ]);
    }

    public function exportExcel()
    {
        return Excel::download(new EFormsExport(EForm::latest()->get()), 'e_forms.xlsx');
    }

    public function destroy(EForm $eForm)
    {
        $name = $eForm->full_name;
        $eForm->delete();

        return back()->with('success', "{$name}'s e-form submission has been deleted.");
    }
}
