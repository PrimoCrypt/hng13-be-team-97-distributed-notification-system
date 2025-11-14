<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\NotificationManager;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
{
    $this->app->singleton(NotificationManager::class);
}


    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }

}
