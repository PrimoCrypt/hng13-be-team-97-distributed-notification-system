<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Jobs\ProcessNotification;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Request;
use App\Models\Notification;
use App\Http\Requests\SendNotificationRequest; // Import

Route::post('/webhooks/email-received', function (SendNotificationRequest $request) { // Type-hint
    $payload = $request->validated();
    $payload['type'] = 'email';
    $payload['service'] = 'internal';

    ProcessNotification::dispatch($payload)->onQueue('email-notifications');
    return response()->json(['status' => 'received']);
});

Route::post('/notifications/send', [NotificationController::class, 'send']); 

//CHECHKING MAILGUN STATUS

Route::post('/webhooks/mailgun/status', function (Request $request) {
    $correlation_id = $request->input('event-data.signature'); // Adjust per provider docs
    $status = match ($request->input('event')) {
        'delivered' => 'delivered',
        'bounced' => 'bounced',
        'failed' => 'failed',
        default => 'sent',
    };

    Notification::where('correlation_id', $correlation_id)
        ->update(['status' => $status, 'updated_at' => now()]);

    // Optional: Dispatch event for further processing
    event(new \App\Events\NotificationStatusUpdated($correlation_id, $status));

    return response()->json(['status' => 'received']);
});

// Similar for Sendgrid: Route::post('/webhooks/sendgrid/status', ...);
// For push (Firebase): Route::post('/webhooks/firebase/status', ...);