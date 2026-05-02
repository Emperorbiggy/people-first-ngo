<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\NgoContractApplicationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::group([
    'middleware' => 'api',
    'prefix' => 'auth'
], function ($router) {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/me', [AuthController::class, 'me']);
});

// Protected routes for NGO applications
Route::group([
    'middleware' => 'api',
    'prefix' => 'ngo'
], function ($router) {
    Route::get('/applications', [NgoContractApplicationController::class, 'apiIndex']);
    Route::get('/applications/{id}', [NgoContractApplicationController::class, 'apiShow']);
    Route::post('/applications', [NgoContractApplicationController::class, 'apiStore']);
});

// Public route for application submission (no auth required)
Route::post('/public/applications', [NgoContractApplicationController::class, 'apiStore']);

// Paystack API routes (public)
Route::group([
    'middleware' => 'api',
    'prefix' => 'paystack'
], function ($router) {
    Route::get('/banks', [NgoContractApplicationController::class, 'getBanks']);
    Route::post('/resolve-account', [NgoContractApplicationController::class, 'resolveAccount']);
});
