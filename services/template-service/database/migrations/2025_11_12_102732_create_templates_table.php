<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->enum('type', ['email', 'push']);
            $table->string('subject')->nullable();
            $table->text('body');
            $table->integer('version')->default(1);
            $table->string('language', 10)->default('en');
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            // UNIQUE: One version per title + type + language + version
            $table->unique(
                ['title', 'type', 'language', 'version'],
                'templates_title_type_lang_version_unique'
            );

            // Optional: Index for fast active lookup
            $table->index(['title', 'type', 'language', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates');
    }
};