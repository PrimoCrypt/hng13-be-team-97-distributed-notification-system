<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Helpers\CorrelationId;

class SendNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Or add auth logic
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['email', 'push', 'sms'])], // By type for queue routing
            'recipient' => ['required', 'email'], // Or 'string' for phone, etc.
            'subject' => ['required_if:type,email', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'service' => ['required', Rule::in(['mailgun', 'sendgrid', 'firebase'])], // Add push services
        ];
    }

    public function messages(): array
    {
        return [
            'recipient.email' => 'Valid email required for notifications.',
            'type.in' => 'Supported types: email, push, sms.',
        ];
    }
}