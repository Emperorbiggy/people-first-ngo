<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NgoContractApplicationController;
use App\Http\Controllers\ImportedContractApplicationController;
use App\Http\Controllers\VerificationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('ngo-contract-applications.create');
});

// Identity verification & application form (public, token-protected)
Route::get('/verify', [VerificationController::class, 'showVerify'])->name('verify');
Route::post('/verify', [VerificationController::class, 'verify'])->name('verify.check');
Route::get('/apply/success', [VerificationController::class, 'success'])->name('apply.success');
Route::get('/apply/{token}', [VerificationController::class, 'showApplicationForm'])->name('apply.form');
Route::post('/apply/{token}', [VerificationController::class, 'submitApplication'])->name('apply.submit');

Route::get('/ngo-contract-application', [NgoContractApplicationController::class, 'create'])->name('ngo-contract-applications.create');
Route::post('/ngo-contract-application', [NgoContractApplicationController::class, 'store'])->name('ngo-contract-applications.store');
Route::get('/ngo-contract-application/success', [NgoContractApplicationController::class, 'success'])->name('ngo-contract-applications.success');

Route::get('/dashboard', [NgoContractApplicationController::class, 'dashboard'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/ngo-contract-applications', [NgoContractApplicationController::class, 'index'])->name('ngo-contract-applications.index');
    Route::get('/ngo-contract-applications/{ngoContractApplication}', [NgoContractApplicationController::class, 'show'])->name('ngo-contract-applications.show');

    Route::get('/export/excel', [NgoContractApplicationController::class, 'exportExcel'])->name('export.excel');
    Route::get('/export/zip', [NgoContractApplicationController::class, 'exportZip'])->name('export.zip');

    // Imported contract applications
    Route::get('/imported-applications', [ImportedContractApplicationController::class, 'index'])->name('imported-applications.index');
    Route::get('/imported-applications/import', [ImportedContractApplicationController::class, 'showImport'])->name('imported-applications.import');
    Route::post('/imported-applications/import', [ImportedContractApplicationController::class, 'import'])->name('imported-applications.do-import');
    Route::get('/imported-applications/export', [ImportedContractApplicationController::class, 'exportExcel'])->name('imported-applications.export');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
