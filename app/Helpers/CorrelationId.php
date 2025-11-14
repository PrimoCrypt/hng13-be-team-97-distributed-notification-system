<?php

namespace App\Helpers;

use Illuminate\Support\Str;

/**
 * Helper class for generating and retrieving a unique correlation ID
 * that flows through the entire request → job → webhook lifecycle.
 */
class CorrelationId
{
    /**
     * Generate a new UUID v4 as correlation ID.
     */
    public static function generate(): string
    {
        return (string) Str::uuid();
    }

    /**
     * Get the current correlation ID from:
     * 1. X-Correlation-Id header
     * 2. Request attribute (set by middleware)
     * 3. Session (fallback)
     * 4. null if none exists
     */
    public static function get(): ?string
    {
        return request()->header('X-Correlation-Id')
            ?? request()->attributes->get('correlation_id')
            ?? session()->get('correlation_id');
    }

    /**
     * Set the correlation ID in multiple places so it's available everywhere:
     * - HTTP header (for response)
     * - Request attributes (for same request)
     * - Session (for long-lived requests)
     */
    public static function set(string $id): void
    {
        // Set on request for current execution
        request()->headers->set('X-Correlation-Id', $id);
        request()->attributes->set('correlation_id', $id);

        // Persist in session (optional, for multi-request flows)
        session()->put('correlation_id', $id);
    }
}