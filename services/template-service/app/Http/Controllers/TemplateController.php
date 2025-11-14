<?php

namespace App\Http\Controllers;

use App\Models\Template;
use Illuminate\Http\Request;
use Twig\Environment;
use Twig\Loader\ArrayLoader;

class TemplateController extends Controller
{
    protected $twig;

    public function __construct()
    {
        $this->twig = new Environment(new ArrayLoader());
    }

    // GET /api/v1/templates?type=email&language=en
    public function index(Request $request)
    {
        $request->validate([
            'type'     => 'sometimes|in:email,push',
            'language' => 'sometimes|string|size:2',
        ]);

        $query = Template::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('language')) {
            $query->where('language', $request->language);
        }

        return $query->get([
            'id', 'title', 'type', 'subject', 'body', 'version', 'language', 'is_active'
        ]);
    }

    // POST /api/v1/templates
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'type'     => 'required|in:email,push',
            'subject'  => 'nullable|string|max:255',
            'body'     => 'required|string',
            'language' => 'sometimes|string|size:2',
        ]);

        $validated['language'] = $validated['language'] ?? 'en';
        $validated['is_active'] = false;

        $latest = Template::where('title', $validated['title'])
            ->where('type', $validated['type'])
            ->where('language', $validated['language'])
            ->max('version');

        $validated['version'] = ($latest ?? 0) + 1;

        $template = Template::create($validated);

        return response()->json([
            'success' => true,
            'data'    => $template,
            'message' => 'Template created'
        ], 201);
    }

    // GET /api/v1/templates/{title}?language=en
    public function show(string $title, Request $request)
    {
        $language = $request->query('language', 'en');

        $template = Template::where('title', $title)
            ->where('language', $language)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();

        if (!$template) {
            return response()->json([
                'success' => false,
                'error'   => 'Template not found or not active'
            ], 404);
        }

        return response()->json($template);
    }

    // PUT /api/v1/templates/{title}
    public function update(string $title, Request $request)
    {
        $language = $request->input('language', 'en');

        $template = Template::where('title', $title)
            ->where('language', $language)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();

        if (!$template) {
            return response()->json(['success' => false, 'error' => 'Not found'], 404);
        }

        $template->update($request->only(['subject', 'body', 'is_active']));

        return response()->json([
            'success' => true,
            'data'    => $template->fresh(),
            'message' => 'Updated'
        ]);
    }

    // DELETE /api/v1/templates/{title}
    public function destroy(string $title, Request $request)
    {
        $language = $request->input('language', 'en');

        $template = Template::where('title', $title)
            ->where('language', $language)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();

        if ($template) {
            $template->delete();
        }

        return response()->json(['success' => true, 'message' => 'Deleted']);
    }

    // POST /api/v1/templates/{title}/render
    public function render(string $title, Request $request)
    {
        $request->validate([
            'type'      => 'required|in:email,push',
            'language'  => 'required|string|size:2',
            'variables' => 'required|array',
            'version'   => 'sometimes|integer'
        ]);

        $query = Template::where('title', $title)
            ->where('type', $request->type)
            ->where('language', $request->language);

        if ($request->has('version')) {
            $query->where('version', $request->version);
        } else {
            $query->where('is_active', true)->orderByDesc('version');
        }

        $template = $query->first();

        if (!$template) {
            return response()->json(['success' => false, 'error' => 'Template not found'], 404);
        }

        try {
            $rendered = $this->twig->createTemplate($template->body)->render($request->variables);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Render failed: ' . $e->getMessage()], 400);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'subject' => $template->subject,
                'body'    => $rendered
            ]
        ]);
    }

    // GET /api/v1/templates/{title}/versions?language=en
    public function versions(string $title, Request $request)
    {
        $language = $request->query('language', 'en');

        return Template::where('title', $title)
            ->where('language', $language)
            ->orderByDesc('version')
            ->get();
    }

    // POST /api/v1/templates/{title}/versions/{version}/activate
    // POST /activate
public function activateVersion(string $title, int $version, Request $request)
{
    // Accept from JSON body OR query string
    $language = $request->input('language') ?? $request->query('language', 'en');

    Template::where('title', $title)
        ->where('language', $language)
        ->update(['is_active' => false]);

    $template = Template::where('title', $title)
        ->where('language', $language)
        ->where('version', $version)
        ->first();

    if (!$template) {
        return response()->json([
            'success' => false,
            'error'   => 'Version not found'
        ], 404);
    }

    $template->update(['is_active' => true]);

    return response()->json([
        'success' => true,
        'data'    => $template,
        'message' => 'Version activated'
    ]);
}
// GET /api/v1/templates/active?type=email&language=en
public function active(Request $request)
{
    $request->validate([
        'type'     => 'required|in:email,push',
        'language' => 'sometimes|string|size:2',
    ]);

    // FIXED: Use query() for GET params
    $language = $request->query('language', 'en');

    $templates = Template::where('type', $request->type)
        ->where('language', $language)
        ->where('is_active', true)
        ->orderByDesc('version')
        ->get(['id', 'title', 'type', 'subject', 'body', 'version', 'language'])
        ->groupBy('title')
        ->map(fn($group) => $group->first())
        ->values();

    if ($templates->isEmpty()) {
        return response()->json([
            'success' => false,
            'error'   => "No active {$request->type} templates found for language: {$language}"
        ], 404);
    }

    return response()->json($templates);
}
}