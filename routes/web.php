<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NgoContractApplicationController;
use App\Http\Controllers\ImportedContractApplicationController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\GeoImportController;
use App\Http\Controllers\Admin\DataboyController as AdminDataboyController;
use App\Http\Controllers\Admin\DataboyApplicationController as AdminDataboyApplicationController;
use App\Http\Controllers\Admin\DataboyPaymentController as AdminDataboyPaymentController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\DataboyAnalyticsController as AdminDataboyAnalyticsController;
use App\Http\Controllers\Admin\NgoDownloadsController as AdminNgoDownloadsController;
use App\Http\Controllers\Databoy\RegistrationController;
use App\Http\Controllers\Databoy\AuthController as DataboyAuthController;
use App\Http\Controllers\Databoy\DashboardController as DataboyDashboardController;
use App\Http\Controllers\Databoy\ApplicationController as DataboyApplicationController;
use App\Models\Country;
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

    // Admin Settings
    Route::get('/admin/settings', [AdminSettingsController::class, 'index'])->name('admin.settings');
    Route::post('/admin/settings', [AdminSettingsController::class, 'update'])->name('admin.settings.update');
    Route::post('/admin/settings/rename-files', [AdminSettingsController::class, 'renameFiles'])->name('admin.settings.rename-files');
    Route::post('/admin/settings/compress-files', [AdminSettingsController::class, 'compressFiles'])->name('admin.settings.compress-files');
    Route::post('/admin/settings/payment-gateway', [AdminSettingsController::class, 'updatePaymentGateway'])->name('admin.settings.payment-gateway');

    // Databoy Payments
    Route::get('/admin/databoy-payments', [AdminDataboyPaymentController::class, 'index'])->name('admin.databoy-payments');
    Route::post('/admin/databoy-payments', [AdminDataboyPaymentController::class, 'pay'])->name('admin.databoy-payments.pay');
    Route::get('/admin/databoy-payments/paid', [AdminDataboyPaymentController::class, 'paid'])->name('admin.databoy-payments.paid');

    // Downloads
    Route::get('/admin/ngo-downloads', [AdminNgoDownloadsController::class, 'index'])->name('admin.ngo-downloads');
    // NGO Applications
    Route::get('/admin/ngo-downloads/passports', [AdminNgoDownloadsController::class, 'downloadPassports'])->name('admin.ngo-downloads.passports');
    Route::get('/admin/ngo-downloads/id-cards', [AdminNgoDownloadsController::class, 'downloadIdCards'])->name('admin.ngo-downloads.id-cards');
    Route::get('/admin/ngo-downloads/certificates', [AdminNgoDownloadsController::class, 'downloadCertificates'])->name('admin.ngo-downloads.certificates');
    // Databoy Registrations
    Route::get('/admin/ngo-downloads/databoy-passports', [AdminNgoDownloadsController::class, 'downloadDataboyPassports'])->name('admin.ngo-downloads.databoy-passports');
    Route::get('/admin/ngo-downloads/databoy-id-cards', [AdminNgoDownloadsController::class, 'downloadDataboyIdCards'])->name('admin.ngo-downloads.databoy-id-cards');
    Route::get('/admin/ngo-downloads/databoy-certificates', [AdminNgoDownloadsController::class, 'downloadDataboyCertificates'])->name('admin.ngo-downloads.databoy-certificates');
    // Databoy Applications
    Route::get('/admin/ngo-downloads/databoy-app-passports', [AdminNgoDownloadsController::class, 'downloadDataboyAppPassports'])->name('admin.ngo-downloads.databoy-app-passports');
    Route::get('/admin/ngo-downloads/databoy-app-id-cards', [AdminNgoDownloadsController::class, 'downloadDataboyAppIdCards'])->name('admin.ngo-downloads.databoy-app-id-cards');
    Route::get('/admin/ngo-downloads/databoy-app-certificates', [AdminNgoDownloadsController::class, 'downloadDataboyAppCertificates'])->name('admin.ngo-downloads.databoy-app-certificates');

    // Admin Databoy Analytics
    Route::get('/admin/databoy-analytics', [AdminDataboyAnalyticsController::class, 'index'])->name('admin.databoy-analytics');
    Route::get('/admin/databoy-analytics/{databoy}', [AdminDataboyAnalyticsController::class, 'detail'])->name('admin.databoy-analytics.detail');

    // Admin Databoy overview
    Route::get('/admin/databoy', [AdminDataboyController::class, 'index'])->name('admin.databoy');
    Route::get('/admin/databoy-wards', [AdminDataboyController::class, 'wardAssignments'])->name('admin.databoy-wards');
    Route::post('/admin/databoy/{databoy}/toggle', [AdminDataboyController::class, 'toggle'])->name('admin.databoy.toggle');
    Route::post('/admin/databoy/{databoy}/release', [AdminDataboyController::class, 'release'])->name('admin.databoy.release');
    Route::post('/admin/databoy/{databoy}/assign', [AdminDataboyController::class, 'assign'])->name('admin.databoy.assign');
    Route::get('/admin/api/lgas/{lga}/available-wards', [AdminDataboyController::class, 'availableWards'])->name('admin.api.available-wards');

    // Admin Databoy Applications
    Route::get('/admin/databoy-applications/export/excel', [AdminDataboyApplicationController::class, 'exportExcel'])->name('admin.databoy-applications.export.excel');
    Route::get('/admin/databoy-applications/export/zip',   [AdminDataboyApplicationController::class, 'exportZip'])->name('admin.databoy-applications.export.zip');
    Route::get('/admin/databoy-applications/{databoyApplication}', [AdminDataboyApplicationController::class, 'show'])->name('admin.databoy-applications.show');
    Route::get('/admin/databoy-applications', [AdminDataboyApplicationController::class, 'index'])->name('admin.databoy-applications.index');

    // Geo Import
    Route::get('/geo-import', [GeoImportController::class, 'showPage'])->name('geo.import');
    Route::get('/geo/countries', [GeoImportController::class, 'countries'])->name('geo.countries');
    Route::get('/geo/states/{country}', [GeoImportController::class, 'states'])->name('geo.states');
    Route::post('/geo/preview', [GeoImportController::class, 'preview'])->name('geo.import.preview');
    Route::post('/geo/import', [GeoImportController::class, 'import'])->name('geo.import.do');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ── Databoy (public) ─────────────────────────────────────────────────────────
Route::prefix('databoy')->name('databoy.')->group(function () {
    Route::get('/register', [RegistrationController::class, 'showForm'])->name('register');
    Route::post('/register', [RegistrationController::class, 'store'])->name('register.store');
    Route::get('/register/success', [RegistrationController::class, 'success'])->name('register.success');

    Route::get('/login', [DataboyAuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [DataboyAuthController::class, 'login'])->name('login.post');
    Route::post('/logout', [DataboyAuthController::class, 'logout'])->name('logout');

    // Public AJAX for registration form cascade
    Route::get('/api/lgas/{state}', [RegistrationController::class, 'getLgas'])->name('api.lgas');
    Route::get('/api/available-wards/{lga}', [RegistrationController::class, 'getAvailableWards'])->name('api.available-wards');

    // Protected databoy area
    Route::middleware('databoy.auth')->group(function () {
        Route::get('/dashboard', [DataboyDashboardController::class, 'index'])->name('dashboard');

        // Application cascade AJAX
        Route::get('/api/wards/{lga}', [DataboyApplicationController::class, 'getWards'])->name('api.wards');
        Route::get('/api/polling-units/{ward}', [DataboyApplicationController::class, 'getPollingUnits'])->name('api.polling-units');

        Route::get('/applications', [DataboyApplicationController::class, 'index'])->name('applications.index');
        Route::get('/applications/create', [DataboyApplicationController::class, 'create'])->name('applications.create');
        Route::post('/applications', [DataboyApplicationController::class, 'store'])->name('applications.store');
    });
});

require __DIR__.'/auth.php';
