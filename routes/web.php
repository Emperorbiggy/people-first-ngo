<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NgoContractApplicationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('ngo-contract-applications.create');
});

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

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
