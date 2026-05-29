// Copy-prompt buttons for cookbook recipes.
//
// Each recipe page embeds a single <div data-copy-prompt="…"> element
// declaring the underlying context bundle's raw-markdown URL (and an
// optional task description). This script finds every such element and
// renders a button that copies an LLM-ready prompt to the clipboard.
//
// One prompt template, no per-agent variants. The bundle URL is what's
// canonical; Claude / Cursor / Codex all consume the same .md fetch.

(function () {
    'use strict';

    function copyPromptFor(bundleUrl, task) {
        const prompt =
            (task ? task + '\n\n' : '') +
            'Reference: ' + bundleUrl + '\n' +
            '\n' +
            'Fetch that URL for the SDK API surface, idiomatic usage ' +
            'patterns, common pitfalls, and version pin. Then implement ' +
            'the integration in this project.';

        return navigator.clipboard.writeText(prompt);
    }

    function attachButtons() {
        const hosts = document.querySelectorAll('[data-copy-prompt]');
        hosts.forEach(function (host) {
            // Idempotent — re-runs on Material's instant navigation skip
            // hosts already wired up.
            if (host.dataset.wired === 'true') return;
            host.dataset.wired = 'true';

            const bundleUrl = host.dataset.copyPrompt;
            const task = host.dataset.task || '';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'md-button md-button--primary';
            button.innerHTML =
                '<span class="twemoji">📋</span> ' +
                'Copy prompt for your agent';
            button.addEventListener('click', function () {
                copyPromptFor(bundleUrl, task).then(function () {
                    const original = button.innerHTML;
                    button.innerHTML =
                        '<span class="twemoji">✅</span> Copied — paste into Claude / Cursor / Codex';
                    setTimeout(function () {
                        button.innerHTML = original;
                    }, 2500);
                }).catch(function (err) {
                    console.error('Clipboard write failed:', err);
                    button.innerHTML =
                        '<span class="twemoji">⚠️</span> Copy failed — see console';
                });
            });

            host.appendChild(button);

            // Also surface the raw context URL as a plain link so users
            // (and crawlers) can see / share it without copying.
            const rawLink = document.createElement('a');
            rawLink.href = bundleUrl;
            rawLink.className = 'md-button';
            rawLink.style.marginLeft = '0.5rem';
            rawLink.innerHTML = '<span class="twemoji">📄</span> View raw context bundle';
            host.appendChild(rawLink);
        });
    }

    // Initial wiring + Material's instant navigation re-wires on every
    // page change.
    if (typeof document$ !== 'undefined') {
        document$.subscribe(attachButtons);
    } else {
        document.addEventListener('DOMContentLoaded', attachButtons);
    }
})();
