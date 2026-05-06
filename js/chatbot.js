/**
 * Huroof Studio — AI Chatbot
 * Powered by Gemini 1.5 Flash via Cloudflare Worker proxy.
 * GSAP-driven animations for open/close, messages, and typing dots.
 *
 * CONFIGURATION:
 * 1. Deploy cf-worker.js to Cloudflare Workers (see instructions inside).
 * 2. Add your GEMINI_API_KEY as a Worker Secret (Settings → Variables & Secrets).
 * 3. Replace the CLOUDFLARE_WORKER_URL below with your deployed worker URL.
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION — set your Cloudflare Worker URL here
// ═══════════════════════════════════════════════════════════════
const CLOUDFLARE_WORKER_URL = "https://huroof-chatbot.jubayerdcd.workers.dev/";
// ⬆ Replace with e.g. "https://huroof-chatbot.jubayer.workers.dev"

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
let chatIsOpen = false;
let isWaiting = false;  // true while waiting for API response
let greetingShown = false;

// Conversation history: [{role: "user"|"bot", text: "..."}]
let conversationHistory = JSON.parse(sessionStorage.getItem("hs_chat_history") || "[]");

// ═══════════════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════════════
const fab = document.getElementById("chatbot-fab");
const fabDot = document.getElementById("chatbot-fab-dot");
const windowEl = document.getElementById("chatbot-window");
const closeBtn = document.getElementById("chatbot-close-btn");
const bodyEl = document.getElementById("chatbot-body");
const inputEl = document.getElementById("chatbot-input");
const sendBtn = document.getElementById("chatbot-send-btn");
const typingIndicator = document.getElementById("chatbot-typing");
const suggestionsBar = document.getElementById("chatbot-suggestions");

// ─── Safety guard ────────────────────────────────────────────────
// If the chatbot HTML is missing OR GSAP hasn't loaded, bail out
// cleanly so no JS error breaks the rest of the page.
if (!fab || !windowEl || typeof gsap === "undefined") {
    console.warn("[Chatbot] Required elements or GSAP not found — chatbot disabled on this page.");
    // Stop executing the rest of this script
    throw new Error("Chatbot init aborted — missing elements or GSAP.");
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTED QUESTIONS (shown on first open)
// ═══════════════════════════════════════════════════════════════
const SUGGESTIONS = [
    "What services do you offer?",
    "How can I get a quote?",
    "Do you do calligraphy logos?",
    "Tell me about your process",
    "How do I contact Jubayer?",
];

// ═══════════════════════════════════════════════════════════════
// GSAP INITIAL STATE
// ═══════════════════════════════════════════════════════════════
gsap.set(windowEl, {
    scale: 0.85,
    opacity: 0,
    y: 20,
    visibility: "hidden",
    transformOrigin: "bottom right",
});

// ═══════════════════════════════════════════════════════════════
// TYPING DOTS — GSAP infinite bounce
// ═══════════════════════════════════════════════════════════════
let typingTl = null;

function startTypingAnimation() {
    const dots = typingIndicator.querySelectorAll(".typing-dot");
    typingTl = gsap.to(dots, {
        y: -5,
        stagger: { each: 0.12, yoyo: true, repeat: -1 },
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut",
        duration: 0.35,
    });
}

function stopTypingAnimation() {
    if (typingTl) {
        typingTl.kill();
        typingTl = null;
    }
}

// ═══════════════════════════════════════════════════════════════
// OPEN / CLOSE TOGGLE
// ═══════════════════════════════════════════════════════════════
function toggleChat() {
    chatIsOpen = !chatIsOpen;

    if (chatIsOpen) {
        // Hide notification dot
        if (fabDot) gsap.to(fabDot, { scale: 0, opacity: 0, duration: 0.2 });

        // Shrink FAB away
        gsap.to(fab, { scale: 0, opacity: 0, duration: 0.25, ease: "power2.in" });

        // Reveal window with elastic spring
        gsap.to(windowEl, {
            visibility: "visible",
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "back.out(1.7)",
        });

        // Show greeting + suggestions on first open
        if (!greetingShown) {
            greetingShown = true;
            setTimeout(() => {
                // Restore history OR show greeting
                if (conversationHistory.length > 0) {
                    restoreHistory();
                } else {
                    appendMessage("bot", "Salam! 👋 I'm the Huroof Studio assistant. How can I help you today?");
                    showSuggestions();
                }
            }, 420);
        }

        // Focus input
        setTimeout(() => inputEl.focus(), 480);

    } else {
        // Close animation
        gsap.to(windowEl, {
            scale: 0.88,
            opacity: 0,
            y: 16,
            duration: 0.28,
            ease: "power2.in",
            onComplete: () => gsap.set(windowEl, { visibility: "hidden" }),
        });

        // Bring FAB back with spring
        gsap.to(fab, {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            delay: 0.18,
            ease: "back.out(1.7)",
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTION CHIPS
// ═══════════════════════════════════════════════════════════════
function showSuggestions() {
    if (!suggestionsBar) return;
    suggestionsBar.innerHTML = "";
    SUGGESTIONS.forEach((text, i) => {
        const chip = document.createElement("button");
        chip.className = "suggestion-chip";
        chip.textContent = text;
        chip.addEventListener("click", () => {
            hideSuggestions();
            inputEl.value = text;
            handleSend();
        });
        gsap.from(chip, { opacity: 0, x: 10, duration: 0.3, delay: i * 0.06, ease: "power2.out" });
        suggestionsBar.appendChild(chip);
    });
}

function hideSuggestions() {
    if (!suggestionsBar) return;
    gsap.to(suggestionsBar.children, {
        opacity: 0, y: -6, stagger: 0.04, duration: 0.2, ease: "power2.in",
        onComplete: () => { suggestionsBar.innerHTML = ""; }
    });
}

// ═══════════════════════════════════════════════════════════════
// RESTORE PREVIOUS SESSION HISTORY
// ═══════════════════════════════════════════════════════════════
function restoreHistory() {
    conversationHistory.forEach(msg => {
        const msgDiv = createMessageEl(msg.role, msg.text);
        bodyEl.insertBefore(msgDiv, typingIndicator);
        gsap.set(msgDiv, { opacity: 1 }); // instantly visible for restore
    });
    scrollToBottom();
}

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════════
async function handleSend() {
    const text = inputEl.value.trim();
    if (!text || isWaiting) return;

    hideSuggestions();
    inputEl.value = "";
    sendBtn.disabled = true;

    appendMessage("user", text);
    showTyping(true);

    try {
        const reply = await callWorker(text);
        showTyping(false);
        appendMessage("bot", reply);
    } catch (err) {
        showTyping(false);
        appendMessage("bot", "⚠️ I'm having trouble connecting right now. Please email **jubayerdcd@gmail.com** directly!", "error");
        console.error("Chatbot error:", err);
    } finally {
        sendBtn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════════
// APPEND A MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════
function createMessageEl(role, text, type = "") {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${role}${type ? " " + type : ""}`;
    msgDiv.innerHTML = `${html}<span class="msg-time">${timeStr}</span>`;
    return msgDiv;
}

function appendMessage(role, text, type = "") {
    // Persist to session storage
    conversationHistory.push({ role, text });
    sessionStorage.setItem("hs_chat_history", JSON.stringify(conversationHistory));

    const msgDiv = createMessageEl(role, text, type);
    bodyEl.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();

    // GSAP slide-up + fade in
    gsap.fromTo(
        msgDiv,
        { opacity: 0, y: 18, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.4)" }
    );
}

// ═══════════════════════════════════════════════════════════════
// TYPING INDICATOR SHOW/HIDE
// ═══════════════════════════════════════════════════════════════
function showTyping(show) {
    isWaiting = show;
    if (show) {
        typingIndicator.style.display = "flex";
        bodyEl.appendChild(typingIndicator); // keep at bottom
        startTypingAnimation();
        scrollToBottom();
    } else {
        stopTypingAnimation();
        typingIndicator.style.display = "none";
    }
}

function scrollToBottom() {
    setTimeout(() => {
        bodyEl.scrollTo({ top: bodyEl.scrollHeight, behavior: "smooth" });
    }, 30);
}

// ═══════════════════════════════════════════════════════════════
// API CALL — always goes through Cloudflare Worker proxy
// ═══════════════════════════════════════════════════════════════
async function callWorker(userMessage) {
    const workerConfigured = CLOUDFLARE_WORKER_URL && !CLOUDFLARE_WORKER_URL.includes("your-worker-url");

    if (!workerConfigured) {
        // Warn loudly — direct API calls in production are insecure
        console.warn(
            "%c⚠ SECURITY WARNING",
            "color: red; font-weight: bold; font-size: 14px;",
            "\nYou are calling the Gemini API directly from the browser. " +
            "Your API key is exposed! Deploy cf-worker.js to Cloudflare Workers " +
            "and update CLOUDFLARE_WORKER_URL before going live."
        );
        throw new Error("Cloudflare Worker URL not configured. See js/chatbot.js for setup instructions.");
    }

    const response = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: userMessage,
            // Send history excluding the message we just added (it's sent as `message`)
            history: conversationHistory.slice(0, -1),
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Worker error: ${response.status}`);
    }

    return data.reply;
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
fab.addEventListener("click", toggleChat);
closeBtn.addEventListener("click", toggleChat);

inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

sendBtn.addEventListener("click", handleSend);

// ═══════════════════════════════════════════════════════════════
// FAB ENTRANCE — slides up on load with a delay
// ═══════════════════════════════════════════════════════════════
gsap.from(fab, {
    delay: 2.5,
    y: 60,
    opacity: 0,
    scale: 0.5,
    duration: 0.8,
    ease: "elastic.out(1, 0.6)",
});

// Pulse FAB dot to attract attention after 4 seconds
if (fabDot) {
    gsap.from(fabDot, { delay: 4, scale: 0, opacity: 0, duration: 0.4, ease: "back.out(2)" });
    gsap.to(fabDot, {
        delay: 4.5,
        scale: 1.4,
        repeat: 3,
        yoyo: true,
        duration: 0.5,
        ease: "sine.inOut",
    });
}
