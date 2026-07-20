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
use App\Http\Controllers\Admin\AccreditationController as AdminAccreditationController;
use App\Http\Controllers\Admin\ApplicantRecipientController as AdminApplicantRecipientController;
use App\Http\Controllers\Admin\ApplicantPaymentController as AdminApplicantPaymentController;
use App\Http\Controllers\Admin\PartyAgentRecipientController as AdminPartyAgentRecipientController;
use App\Http\Controllers\Admin\PartyAgentPaymentController as AdminPartyAgentPaymentController;
use App\Http\Controllers\Admin\QueueMonitorController as AdminQueueMonitorController;
use App\Http\Controllers\Admin\TransportFareController as AdminTransportFareController;
use App\Http\Controllers\Admin\WardTimeOverrideController as AdminWardTimeOverrideController;
use App\Http\Controllers\Admin\AccreditationPaymentController as AdminAccreditationPaymentController;
use App\Http\Controllers\Admin\DataboyAccreditationPaymentController as AdminDataboyAccreditationPaymentController;
use App\Http\Controllers\Admin\DataPlanController as AdminDataPlanController;
use App\Http\Controllers\Admin\DataPurchaseController as AdminDataPurchaseController;
use App\Http\Controllers\Admin\EasigatewayFundingController as AdminEasigatewayFundingController;
use App\Http\Controllers\Admin\AirtimeRecipientController as AdminAirtimeRecipientController;
use App\Http\Controllers\Admin\AirtimeController as AdminAirtimeController;
use App\Http\Controllers\Databoy\RegistrationController;
use App\Http\Controllers\Databoy\AuthController as DataboyAuthController;
use App\Http\Controllers\Databoy\DashboardController as DataboyDashboardController;
use App\Http\Controllers\Databoy\ApplicationController as DataboyApplicationController;
use App\Http\Controllers\Databoy\PartyAgentController as DataboyPartyAgentController;
use App\Http\Controllers\Databoy\AccreditationController as DataboyAccreditationController;
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
    Route::get('/admin/databoy-payments/analytics', [AdminDataboyPaymentController::class, 'analytics'])->name('admin.databoy-payments.analytics');

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
    Route::post('/admin/databoy/{databoy}/role', [AdminDataboyController::class, 'updateRole'])->name('admin.databoy.role');
    Route::post('/admin/databoy/{databoy}/release', [AdminDataboyController::class, 'release'])->name('admin.databoy.release');
    Route::post('/admin/databoy/{databoy}/assign', [AdminDataboyController::class, 'assign'])->name('admin.databoy.assign');
    Route::get('/admin/api/lgas/{lga}/available-wards', [AdminDataboyController::class, 'availableWards'])->name('admin.api.available-wards');

    // Admin Databoy Applications
    Route::get('/admin/databoy-applications/export/excel', [AdminDataboyApplicationController::class, 'exportExcel'])->name('admin.databoy-applications.export.excel');
    Route::get('/admin/databoy-applications/export/zip',   [AdminDataboyApplicationController::class, 'exportZip'])->name('admin.databoy-applications.export.zip');
    Route::get('/admin/databoy-applications/{databoyApplication}', [AdminDataboyApplicationController::class, 'show'])->name('admin.databoy-applications.show');
    Route::get('/admin/databoy-applications', [AdminDataboyApplicationController::class, 'index'])->name('admin.databoy-applications.index');

    // Admin Accreditation
    Route::get('/admin/accreditation', [AdminAccreditationController::class, 'index'])->name('admin.accreditation');
    Route::post('/admin/accreditation/{databoyApplication}', [AdminAccreditationController::class, 'accredit'])->name('admin.accreditation.accredit');
    Route::get('/admin/accredited', [AdminAccreditationController::class, 'list'])->name('admin.accredited');
    Route::get('/admin/accreditation/ward-stats', [AdminAccreditationController::class, 'wardStats'])->name('admin.accreditation.ward-stats');
    Route::get('/admin/accreditation/checked-in-stats', [AdminAccreditationController::class, 'checkedInStats'])->name('admin.accreditation.checked-in-stats');

    // Applicant Recipients
    Route::get('/admin/applicant-recipients', [AdminApplicantRecipientController::class, 'index'])->name('admin.applicant-recipients');
    Route::post('/admin/applicant-recipients', [AdminApplicantRecipientController::class, 'create'])->name('admin.applicant-recipients.create');

    // Applicant Payments
    Route::get('/admin/applicant-payments', [AdminApplicantPaymentController::class, 'index'])->name('admin.applicant-payments');
    Route::post('/admin/applicant-payments', [AdminApplicantPaymentController::class, 'pay'])->name('admin.applicant-payments.pay');
    Route::get('/admin/applicant-payments/paid', [AdminApplicantPaymentController::class, 'paid'])->name('admin.applicant-payments.paid');

    // Party Agent Recipients
    Route::get('/admin/party-agent-recipients', [AdminPartyAgentRecipientController::class, 'index'])->name('admin.party-agent-recipients');
    Route::post('/admin/party-agent-recipients', [AdminPartyAgentRecipientController::class, 'create'])->name('admin.party-agent-recipients.create');

    // Party Agent Payments
    Route::get('/admin/party-agent-payments', [AdminPartyAgentPaymentController::class, 'index'])->name('admin.party-agent-payments');
    Route::post('/admin/party-agent-payments', [AdminPartyAgentPaymentController::class, 'pay'])->name('admin.party-agent-payments.pay');
    Route::get('/admin/party-agent-payments/paid', [AdminPartyAgentPaymentController::class, 'paid'])->name('admin.party-agent-payments.paid');

    // Queue Monitor
    Route::get('/admin/queue-monitor', [AdminQueueMonitorController::class, 'index'])->name('admin.queue-monitor');
    Route::post('/admin/queue-monitor/retry-all', [AdminQueueMonitorController::class, 'retryAll'])->name('admin.queue-monitor.retry-all');
    Route::post('/admin/queue-monitor/{uuid}/retry', [AdminQueueMonitorController::class, 'retry'])->name('admin.queue-monitor.retry');
    Route::post('/admin/queue-monitor/{uuid}/forget', [AdminQueueMonitorController::class, 'forget'])->name('admin.queue-monitor.forget');

    // Transport Fares
    Route::get('/admin/transport-fares', [AdminTransportFareController::class, 'index'])->name('admin.transport-fares');
    Route::post('/admin/transport-fares', [AdminTransportFareController::class, 'update'])->name('admin.transport-fares.update');

    // Ward Time Overrides
    Route::get('/admin/ward-time-overrides', [AdminWardTimeOverrideController::class, 'index'])->name('admin.ward-time-overrides');
    Route::post('/admin/ward-time-overrides/{ward}', [AdminWardTimeOverrideController::class, 'store'])->name('admin.ward-time-overrides.store');
    Route::delete('/admin/ward-time-overrides/{ward}', [AdminWardTimeOverrideController::class, 'destroy'])->name('admin.ward-time-overrides.destroy');

    // Accreditation Payments
    Route::get('/admin/accreditation-payments', [AdminAccreditationPaymentController::class, 'index'])->name('admin.accreditation-payments');
    Route::get('/admin/databoy-accreditation-payments', [AdminDataboyAccreditationPaymentController::class, 'index'])->name('admin.databoy-accreditation-payments');

    // Data Plans (EasiGateway data bundles)
    Route::get('/admin/data-plans', [AdminDataPlanController::class, 'index'])->name('admin.data-plans');
    Route::get('/admin/data-plans/{categoryId}/products', [AdminDataPlanController::class, 'products'])->name('admin.data-plans.products');
    Route::post('/admin/data-plans', [AdminDataPlanController::class, 'save'])->name('admin.data-plans.save');

    // Data Purchase (buy configured data bundles for databoys)
    Route::get('/admin/data-purchase', [AdminDataPurchaseController::class, 'index'])->name('admin.data-purchase');
    Route::post('/admin/data-purchase', [AdminDataPurchaseController::class, 'send'])->name('admin.data-purchase.send');
    Route::get('/admin/data-purchase/history', [AdminDataPurchaseController::class, 'history'])->name('admin.data-purchase.history');

    // EasiGateway Wallet Funding
    Route::get('/admin/easigateway-funding', [AdminEasigatewayFundingController::class, 'index'])->name('admin.easigateway-funding');
    Route::post('/admin/easigateway-funding', [AdminEasigatewayFundingController::class, 'create'])->name('admin.easigateway-funding.create');
    Route::post('/admin/easigateway-funding/{funding}/verify', [AdminEasigatewayFundingController::class, 'verify'])->name('admin.easigateway-funding.verify');

    // Airtime Recipients
    Route::get('/admin/airtime-recipients', [AdminAirtimeRecipientController::class, 'index'])->name('admin.airtime-recipients');
    Route::post('/admin/airtime-recipients', [AdminAirtimeRecipientController::class, 'create'])->name('admin.airtime-recipients.create');

    // Airtime
    Route::get('/admin/airtime', [AdminAirtimeController::class, 'index'])->name('admin.airtime');
    Route::post('/admin/airtime', [AdminAirtimeController::class, 'send'])->name('admin.airtime.send');
    Route::get('/admin/airtime/history', [AdminAirtimeController::class, 'history'])->name('admin.airtime.history');

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
        Route::put('/applications/{databoyApplication}/polling-unit', [DataboyApplicationController::class, 'updatePollingUnit'])->name('applications.update-polling-unit');

        Route::get('/accreditation', [DataboyAccreditationController::class, 'index'])->name('accreditation.index');
        Route::post('/accreditation/{databoyApplication}/check-in', [DataboyAccreditationController::class, 'checkIn'])->name('accreditation.check-in');
        Route::post('/accreditation/{databoyApplication}/check-out', [DataboyAccreditationController::class, 'checkOut'])->name('accreditation.check-out');

        // Party agent's LGA/ward come from the databoy's own assignment (like applications);
        // only polling unit is an actual cascading lookup.
        Route::get('/party-agents/api/polling-units/{ward}', [DataboyPartyAgentController::class, 'getPollingUnits'])->name('party-agents.api.polling-units');

        Route::get('/party-agents', [DataboyPartyAgentController::class, 'index'])->name('party-agents.index');
        Route::get('/party-agents/create', [DataboyPartyAgentController::class, 'create'])->name('party-agents.create');
        Route::post('/party-agents', [DataboyPartyAgentController::class, 'store'])->name('party-agents.store');
    });
});

require __DIR__.'/auth.php';
