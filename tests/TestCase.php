<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase; // optional
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Queue;

// This is the missing import!
use CreatesApplication;

abstract class TestCase extends BaseTestCase
{
    // use CreatesApplication; 

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
    }
}