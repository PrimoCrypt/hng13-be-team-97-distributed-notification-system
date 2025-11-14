<?php

namespace App\Jobs;

use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\ValueObjects\NotificationRequest;
use App\Services\NotificationManager;

class ProcessNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public array $payload) {}

    public function handle(NotificationManager $manager): void
    {
        $request = NotificationRequest::fromArray($this->payload);
        $manager->route($request);

         // Wrap with metadata
    $this->payload['correlation_id'] = $this->payload['correlation_id'] ?? \Illuminate\Support\Str::uuid()->toString();
    $this->payload['timestamp'] = now()->toISOString();

    // Log initial status (requires Component 4)
    \Illuminate\Support\Facades\Log::info('Notification queued', ['correlation_id' => $this->payload['correlation_id']]);

    $request = NotificationRequest::fromArray($this->payload);
    $manager->route($request);

    Notification::create([
    'correlation_id' => $this->payload['correlation_id'],
    'type' => $request->type,
    'recipient' => $request->recipient,
    'service' => $request->service,
    'status' => 'queued',
    'metadata' => $request->toArray(),
]);

    }
}