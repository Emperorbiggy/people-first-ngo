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
use App\Http\Controllers\Admin\ManualDataPurchaseController as AdminManualDataPurchaseController;
use App\Http\Controllers\Admin\ImportedAirtimeController as AdminImportedAirtimeController;
use App\Http\Controllers\Admin\EasigatewayFundingController as AdminEasigatewayFundingController;
use App\Http\Controllers\Admin\AirtimeRecipientController as AdminAirtimeRecipientController;
use App\Http\Controllers\Admin\AirtimeController as AdminAirtimeController;
use App\Http\Controllers\Admin\NewFormDataController as AdminNewFormDataController;
use App\Http\Controllers\Databoy\RegistrationController;
use App\Http\Controllers\Databoy\AuthController as DataboyAuthController;
use App\Http\Controllers\Databoy\DashboardController as DataboyDashboardController;
use App\Http\Controllers\Databoy\ApplicationController as DataboyApplicationController;
use App\Http\Controllers\Databoy\PartyAgentController as DataboyPartyAgentController;
use App\Http\Controllers\Databoy\ApoOfficerController as DataboyApoOfficerController;
use App\Http\Controllers\Databoy\AttendanceController as DataboyAttendanceController;
use App\Http\Controllers\Admin\ApoOfficerController as AdminApoOfficerController;
use App\Http\Controllers\Admin\ApoRecipientController as AdminApoRecipientController;
use App\Http\Controllers\Admin\ApoPaymentController as AdminApoPaymentController;
use App\Http\Controllers\Admin\AccreditationOfficerController as AdminAccreditationOfficerController;
use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\Admin\EFormController as AdminEFormController;
use App\Http\Controllers\Databoy\ApoAccreditationController as DataboyApoAccreditationController;
use App\Http\Controllers\Databoy\AccreditationController as DataboyAccreditationController;
use App\Http\Controllers\NewFormController;
use App\Http\Controllers\CheckDocumentController;
use App\Http\Controllers\EFormController;
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

// Public e-form. With EFORM_DOMAIN set (e.g. form.peoplefirst.org.ng) the form
// lives at that host's root and /e-form no longer exists on the main domain —
// the address bar shows the short host and never changes, unlike a link
// shortener, which only disguises the link until it is clicked.
if ($eformDomain = config('app.eform_domain')) {
    Route::domain($eformDomain)->group(function () {
        Route::get('/', [EFormController::class, 'create'])->name('e-form.create');
        Route::post('/', [EFormController::class, 'store'])->name('e-form.store');
        Route::get('/submitted', [EFormController::class, 'success'])->name('e-form.success');
    });
} else {
    Route::get('/e-form', [EFormController::class, 'create'])->name('e-form.create');
    Route::post('/e-form', [EFormController::class, 'store'])->name('e-form.store');
    Route::get('/e-form/success', [EFormController::class, 'success'])->name('e-form.success');
}

// Public document check — enter an 11-digit phone number, get the PDF filed under it
Route::get('/check', [CheckDocumentController::class, 'index'])->name('check');
Route::get('/check/lookup', [CheckDocumentController::class, 'lookup'])
    ->middleware('throttle:30,1')
    ->name('check.lookup');
Route::get('/check/view/{phone}', [CheckDocumentController::class, 'view'])->name('check.view');
Route::get('/check/download/{phone}', [CheckDocumentController::class, 'download'])->name('check.download');

// Public "new form" registration (one registration per ward)
Route::get('/form', [NewFormController::class, 'create'])->name('new-form.create');
Route::post('/form', [NewFormController::class, 'store'])->name('new-form.store');
Route::get('/form/success', [NewFormController::class, 'success'])->name('new-form.success');
Route::get('/form/api/wards/{lga}', [NewFormController::class, 'getWards'])->name('new-form.api.wards');

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
    Route::get('/admin/new-form-data', [AdminNewFormDataController::class, 'index'])->name('admin.new-form-data');

    Route::get('/admin/apo-officers', [AdminApoOfficerController::class, 'index'])->name('admin.apo-officers');
    Route::get('/admin/apo-officers/export', [AdminApoOfficerController::class, 'exportExcel'])->name('admin.apo-officers.export');
    Route::get('/admin/new-form-data/export/excel', [AdminNewFormDataController::class, 'exportExcel'])->name('admin.new-form-data.export.excel');
    Route::get('/admin/new-form-data/export/zip', [AdminNewFormDataController::class, 'exportZip'])->name('admin.new-form-data.export.zip');

    Route::get('/admin/transport-fares', [AdminTransportFareController::class, 'index'])->name('admin.transport-fares');
    Route::post('/admin/transport-fares', [AdminTransportFareController::class, 'update'])->name('admin.transport-fares.update');

    // Ward Time Overrides
    Route::get('/admin/ward-time-overrides', [AdminWardTimeOverrideController::class, 'index'])->name('admin.ward-time-overrides');
    Route::post('/admin/ward-time-overrides/{ward}', [AdminWardTimeOverrideController::class, 'store'])->name('admin.ward-time-overrides.store');
    Route::delete('/admin/ward-time-overrides/{ward}', [AdminWardTimeOverrideController::class, 'destroy'])->name('admin.ward-time-overrides.destroy');

    // Accreditation Payments
    Route::get('/admin/accreditation-payments', [AdminAccreditationPaymentController::class, 'index'])->name('admin.accreditation-payments');
    Route::get('/admin/accreditation-payments/export', [AdminAccreditationPaymentController::class, 'exportExcel'])->name('admin.accreditation-payments.export');
    Route::post('/admin/accreditation-payments/{databoyApplication}/retry', [AdminAccreditationPaymentController::class, 'retry'])->name('admin.accreditation-payments.retry');
    Route::post('/admin/accreditation-payments/retry-bulk', [AdminAccreditationPaymentController::class, 'retryBulk'])->name('admin.accreditation-payments.retry-bulk');
    Route::get('/admin/databoy-accreditation-payments', [AdminDataboyAccreditationPaymentController::class, 'index'])->name('admin.databoy-accreditation-payments');
    Route::get('/admin/databoy-accreditation-payments/export', [AdminDataboyAccreditationPaymentController::class, 'exportExcel'])->name('admin.databoy-accreditation-payments.export');
    Route::get('/admin/databoy-accreditation-payments/pending', [AdminDataboyAccreditationPaymentController::class, 'pending'])->name('admin.databoy-accreditation-payments.pending');
    Route::post('/admin/databoy-accreditation-payments/pay', [AdminDataboyAccreditationPaymentController::class, 'pay'])->name('admin.databoy-accreditation-payments.pay');

    // APO officers — transfer recipients, payments, and the accounts that accredit them
    Route::get('/admin/apo-recipients', [AdminApoRecipientController::class, 'index'])->name('admin.apo-recipients');
    Route::post('/admin/apo-recipients/create', [AdminApoRecipientController::class, 'create'])->name('admin.apo-recipients.create');
    Route::get('/admin/apo-payments', [AdminApoPaymentController::class, 'index'])->name('admin.apo-payments');
    Route::post('/admin/apo-payments/{apoOfficer}/retry', [AdminApoPaymentController::class, 'retry'])->name('admin.apo-payments.retry');
    Route::post('/admin/apo-payments/pay-unpaid', [AdminApoPaymentController::class, 'payUnpaid'])->name('admin.apo-payments.pay-unpaid');
    Route::get('/admin/apo-payments/export', [AdminApoPaymentController::class, 'exportExcel'])->name('admin.apo-payments.export');
    Route::get('/admin/accreditation-officers', [AdminAccreditationOfficerController::class, 'index'])->name('admin.accreditation-officers');
    Route::post('/admin/accreditation-officers', [AdminAccreditationOfficerController::class, 'store'])->name('admin.accreditation-officers.store');
    Route::post('/admin/accreditation-officers/{databoy}/toggle', [AdminAccreditationOfficerController::class, 'toggle'])->name('admin.accreditation-officers.toggle');
    Route::delete('/admin/accreditation-officers/{databoy}', [AdminAccreditationOfficerController::class, 'destroy'])->name('admin.accreditation-officers.destroy');

    // E-Form submissions
    Route::get('/admin/e-forms', [AdminEFormController::class, 'index'])->name('admin.e-forms');
    Route::get('/admin/e-forms/export', [AdminEFormController::class, 'exportExcel'])->name('admin.e-forms.export');
    Route::delete('/admin/e-forms/{eForm}', [AdminEFormController::class, 'destroy'])->name('admin.e-forms.destroy');

    // Attendance
    Route::get('/admin/attendance', [AdminAttendanceController::class, 'index'])->name('admin.attendance');
    Route::get('/admin/attendance/import', [AdminAttendanceController::class, 'showImport'])->name('admin.attendance.import');
    Route::post('/admin/attendance/import', [AdminAttendanceController::class, 'import'])->name('admin.attendance.import.store');
    Route::post('/admin/attendance/{attendance}/toggle', [AdminAttendanceController::class, 'toggle'])->name('admin.attendance.toggle');
    Route::delete('/admin/attendance/{attendance}', [AdminAttendanceController::class, 'destroy'])->name('admin.attendance.destroy');

    // Data Plans (EasiGateway data bundles)
    Route::get('/admin/data-plans', [AdminDataPlanController::class, 'index'])->name('admin.data-plans');
    Route::get('/admin/data-plans/{categoryId}/products', [AdminDataPlanController::class, 'products'])->name('admin.data-plans.products');
    Route::post('/admin/data-plans', [AdminDataPlanController::class, 'save'])->name('admin.data-plans.save');

    // Data Purchase (buy configured data bundles for databoys)
    Route::get('/admin/data-purchase', [AdminDataPurchaseController::class, 'index'])->name('admin.data-purchase');
    Route::post('/admin/data-purchase', [AdminDataPurchaseController::class, 'send'])->name('admin.data-purchase.send');
    Route::get('/admin/data-purchase/history', [AdminDataPurchaseController::class, 'history'])->name('admin.data-purchase.history');

    // Airtime for an imported contact list (CSV/Excel, "Phone Number" column)
    Route::post('/admin/airtime/import/preview', [AdminImportedAirtimeController::class, 'preview'])->name('admin.airtime.import.preview');
    Route::post('/admin/airtime/import/send', [AdminImportedAirtimeController::class, 'send'])->name('admin.airtime.import.send');

    // Manual data purchase — records purchases made by hand and debits the
    // balance without calling EasiGateway. Intentionally NOT in the sidebar.
    Route::get('/admin/manual-data-purchase', [AdminManualDataPurchaseController::class, 'index'])->name('admin.manual-data-purchase');
    Route::post('/admin/manual-data-purchase', [AdminManualDataPurchaseController::class, 'store'])->name('admin.manual-data-purchase.store');

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
    // Retry a single failed airtime purchase (databoy, imported contact, or party agent)
    Route::post('/admin/airtime/history/{airtimePurchase}/retry', [AdminAirtimeController::class, 'retry'])->name('admin.airtime.retry');
    Route::post('/admin/airtime/history/party-agent/{partyAgentAirtimePurchase}/retry', [AdminAirtimeController::class, 'retryPartyAgent'])->name('admin.airtime.retry-party-agent');

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

        // Attendance register — accreditation boys only (enforced in controller)
        Route::get('/attendance', [DataboyAttendanceController::class, 'index'])->name('attendance.index');
        Route::post('/attendance/{attendance}/toggle', [DataboyAttendanceController::class, 'toggle'])->name('attendance.toggle');

        Route::get('/accreditation', [DataboyAccreditationController::class, 'index'])->name('accreditation.index');
        Route::post('/accreditation/{databoyApplication}/check-in', [DataboyAccreditationController::class, 'checkIn'])->name('accreditation.check-in');
        Route::post('/accreditation/{databoyApplication}/check-out', [DataboyAccreditationController::class, 'checkOut'])->name('accreditation.check-out');

        // Party agent's LGA/ward come from the databoy's own assignment (like applications);
        // only polling unit is an actual cascading lookup.
        Route::get('/party-agents/api/polling-units/{ward}', [DataboyPartyAgentController::class, 'getPollingUnits'])->name('party-agents.api.polling-units');

        Route::get('/party-agents', [DataboyPartyAgentController::class, 'index'])->name('party-agents.index');
        Route::get('/party-agents/create', [DataboyPartyAgentController::class, 'create'])->name('party-agents.create');
        Route::post('/party-agents', [DataboyPartyAgentController::class, 'store'])->name('party-agents.store');

        // APO accreditation — restricted to the apo_accreditation_officer role by DataboyAuth
        Route::get('/apo-accreditation', [DataboyApoAccreditationController::class, 'index'])->name('apo-accreditation.index');
        Route::post('/apo-accreditation/{apoOfficer}/check-in', [DataboyApoAccreditationController::class, 'checkIn'])->name('apo-accreditation.check-in');
        Route::post('/apo-accreditation/{apoOfficer}/check-out', [DataboyApoAccreditationController::class, 'checkOut'])->name('apo-accreditation.check-out');

        Route::get('/apo-officers', [DataboyApoOfficerController::class, 'index'])->name('apo-officers.index');
        Route::post('/apo-officers/{databoyApplication}/qualify', [DataboyApoOfficerController::class, 'qualify'])->name('apo-officers.qualify');
        Route::post('/apo-officers/{databoyApplication}/replace', [DataboyApoOfficerController::class, 'replace'])->name('apo-officers.replace');
    });
});

require __DIR__.'/auth.php';
