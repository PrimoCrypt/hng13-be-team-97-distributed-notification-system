<?php

namespace App\ValueObjects;

use Illuminate\Contracts\Support\Arrayable;

class NotificationRequest implements Arrayable
{
    public function __construct(
        public string $type,
        public string $recipient,
        public string $subject,
        public string $body,
        public string $service, // e.g., 'mailgun', 'sendgrid', etc.
         public ?string $correlation_id = null, // Add
        public ?string $timestamp = null // Add
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            $data['type'],
            $data['recipient'],
            $data['subject'] ?? '',
            $data['body'] ?? '',
            $data['service'],
            $data['correlation_id'] ?? null,
            $data['timestamp'] ?? null
        );
    }

    public function toArray(): array
    {
        return get_object_vars($this);
    }
}