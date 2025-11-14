<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up(): void
{
    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->string('correlation_id')->unique();
        $table->string('type');
        $table->string('recipient');
        $table->string('service');
        $table->enum('status', ['queued', 'sent', 'delivered', 'failed', 'bounced'])->default('queued');
        $table->json('metadata')->nullable();
        $table->timestamps();
    });
}

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};