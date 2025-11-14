<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\ValueObjects\NotificationRequest;

class NorificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
   
public function __construct(public NotificationRequest $request) {}

public function envelope(): Envelope
{
    return new Envelope(subject: $this->request->subject);
}

public function content(): Content
{
    return new Content(
        markdown: 'emails.notification',
        with: ['body' => $this->request->body]
    );
}

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
