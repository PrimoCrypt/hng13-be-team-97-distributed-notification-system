<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\HealthController;

// Health check
Route::get('/health', [HealthController::class, 'check']);

// API v1
Route::prefix('v1')->group(function () {
    Route::prefix('templates')->group(function () {
        Route::get('/active', [TemplateController::class, 'active']);
        Route::get('/', [TemplateController::class, 'index']); 
        Route::post('/', [TemplateController::class, 'store']);
        Route::get('/{title}', [TemplateController::class, 'show']);
        Route::put('/{title}', [TemplateController::class, 'update']);
        Route::delete('/{title}', [TemplateController::class, 'destroy']);

        Route::post('/{title}/render', [TemplateController::class, 'render']);
        Route::get('/{title}/versions', [TemplateController::class, 'versions']);
        Route::post('/{title}/versions/{version}/activate', [TemplateController::class, 'activateVersion']);

       
    });
});