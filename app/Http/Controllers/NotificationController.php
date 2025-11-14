<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendNotificationRequest;
use App\Jobs\ProcessNotification;
use App\Helpers\CorrelationId;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function send(SendNotificationRequest $request)
{
    $correlationId = CorrelationId::get(); 

    try {
        Log::channel('notification')->info('Incoming notification request', [
            'correlation_id' => $correlationId,
            'payload'        => $request->validated(),
        ]);

        $payload = $request->validated();
        $payload['type'] = $request->type;
        $payload['correlation_id'] = $correlationId;

        $queueName = "{$payload['type']}-notifications";
        ProcessNotification::dispatch($payload)->onQueue($queueName);

        Log::channel('notification')->info('Job dispatched', [
            'correlation_id' => $correlationId,
            'queue' => $queueName,
        ]);

        return response()->json([
            'status' => 'queued',
            'correlation_id' => $correlationId,
            'queue' => $queueName,
        ])->withHeaders(['X-Correlation-Id' => $correlationId]);

    } catch (\Throwable $e) {
        Log::channel('notification')->error('Failed to queue notification', [
            'correlation_id' => $correlationId,
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'status' => 'error',
            'message' => 'Failed to queue notification',
            'correlation_id' => $correlationId,
        ], 500);
    }
}
}