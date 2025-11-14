<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function check()
    {
        try {
            DB::connection()->getPdo();               
            return response()->json(['status' => 'ok']);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'error'  => 'Database unavailable'
            ], 503);
        }
    }
}