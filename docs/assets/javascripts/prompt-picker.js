/* ─────────────────────────────────────────────────────────────────────
 * Prompt picker — landing-page interactive widget.
 *
 * Pick a task (recipe) + an agent (Claude / Cursor / Codex / generic),
 * the widget assembles the same prompt template every recipe page's
 * "Copy prompt" button uses, with agent-specific phrasing. The output
 * is live and copyable; a sibling button opens the raw context bundle
 * the agent fetches.
 *
 * The state lives entirely in `aria-pressed` on the chip buttons —
 * idempotent under Material's instant navigation and accessible by
 * default. No framework, no dependencies.
 * ───────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    const RAW_BASE =
        'https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/';

    function init() {
        const picker = document.querySelector('#kuira-picker');
        if (!picker || picker.dataset.wired === 'true') return;
        picker.dataset.wired = 'true';

        const taskChips = picker.querySelectorAll('[data-task-key]');
        const agentChips = picker.querySelectorAll('[data-agent-key]');
        const outputEl = picker.querySelector('#kuira-picker-output');
        const copyBtn = picker.querySelector('#kuira-picker-copy');
        const rawLink = picker.querySelector('#kuira-picker-raw');

        if (!outputEl || !copyBtn || !rawLink) return;

        function bindGroup(chips) {
            chips.forEach(chip => {
                chip.addEventListener('click', () => {
                    chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
                    chip.setAttribute('aria-pressed', 'true');
                    render();
                });
            });
        }

        bindGroup(taskChips);
        bindGroup(agentChips);

        function selectedTask() {
            return Array.from(taskChips).find(
                c => c.getAttribute('aria-pressed') === 'true',
            ) || taskChips[0];
        }
        function selectedAgent() {
            return Array.from(agentChips).find(
                c => c.getAttribute('aria-pressed') === 'true',
            ) || agentChips[0];
        }

        function promptFor(taskTitle, agentKey, agentName, bundleUrl) {
            // One template; agent-specific framing nudges the model
            // toward its conventional persona. The reference URL gives
            // the agent context about which project to act in — we
            // don't need to belabour "in this Android project" in the
            // instruction itself.
            const lines = [];
            if (agentKey === 'claude') {
                lines.push(`Claude, ${lower(taskTitle)} in my current project.`);
            } else if (agentKey === 'cursor') {
                lines.push(`Help me ${lower(taskTitle)} in this project.`);
            } else if (agentKey === 'codex') {
                lines.push(`Task: ${taskTitle}.`);
            } else {
                lines.push(`${taskTitle} in this project.`);
            }
            lines.push('');
            lines.push(`Reference: ${bundleUrl}`);
            lines.push('');
            lines.push(
                `Fetch that URL for the SDK API surface, idiomatic patterns,`,
                `common pitfalls, and the exact version pin. Then implement`,
                `the integration, asking for confirmation before any`,
                `irreversible step (deploy, install, spend).`,
            );
            return lines.join('\n');
        }

        function lower(s) {
            // Lowercase the first character — produces natural inline
            // sentences like "Claude, add Kuira to this project."
            return s.charAt(0).toLowerCase() + s.slice(1);
        }

        function render() {
            const task = selectedTask();
            const agent = selectedAgent();
            const bundleUrl = RAW_BASE + task.dataset.taskKey + '.md';
            const prompt = promptFor(
                task.dataset.taskTitle,
                agent.dataset.agentKey,
                agent.dataset.agentName,
                bundleUrl,
            );
            outputEl.textContent = prompt;
            rawLink.href = bundleUrl;
        }

        copyBtn.addEventListener('click', () => {
            const text = outputEl.textContent || '';
            navigator.clipboard.writeText(text).then(() => {
                const original = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span aria-hidden="true">✓</span> Copied — paste into your agent';
                setTimeout(() => {
                    copyBtn.innerHTML = original;
                }, 2400);
            }).catch(() => {
                copyBtn.innerHTML = '<span aria-hidden="true">⚠️</span> Copy failed — select &amp; copy manually';
            });
        });

        render();
    }

    if (typeof document$ !== 'undefined') {
        document$.subscribe(init);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
