<?php

namespace App\Services;

use App\ValueObjects\NotificationRequest;
use Illuminate\Support\Facades\Mail;
use Illuminate\Mail\Message; // For custom mailing if needed
// Assume we have service integrations; for demo, we'll mock two email services

class NotificationManager
{

    
    public function route(NotificationRequest $request): void
    {
        if ($request->type !== 'email') {
            // Handle other types if needed, e.g., SMS
            throw new \Exception('Unsupported notification type: ' . $request->type);
        }

        match ($request->service) {
            'mailgun' => $this->sendViaMailgun($request),
            'sendgrid' => $this->sendViaSendgrid($request),
            default => throw new \Exception('Unknown service: ' . $request->service),
        };
    }

    private function sendViaMailgun(NotificationRequest $request): void
    {
        // In a real app, integrate Mailgun SDK or HTTP client
        // For demo, use Laravel's Mail facade with a custom transport if needed
        Mail::raw($request->body, function (Message $message) use ($request) {
            $message->to($request->recipient)
                    ->subject($request->subject);
            // Configure Mailgun in config/mail.php
        });
        // Log or handle success/failure
    }

    private function sendViaSendgrid(NotificationRequest $request): void
    {
        // Similar to above; integrate SendGrid SDK
        Mail::raw($request->body, function (Message $message) use ($request) {
            $message->to($request->recipient)
                    ->subject($request->subject);
            // Configure SendGrid in config/mail.php
        });
    }

    private function sendViaPush(NotificationRequest $request): void
{
    // Integrate Firebase SDK or HTTP; for demo, log
    \Illuminate\Support\Facades\Log::info('Push sent via Firebase', ['correlation_id' => $request->correlation_id]);
}
}