let messageHistory = [];
const BASE_URL = window.location.origin;

// Typing animation with 3D effect
function showTyping() {
    const chatBox = document.getElementById("chat-box");
    const typingHTML = `
    <div class="typing-indicator" id="typing-indicator">
        <div class="typing-dot" style="animation-delay: 0s"></div>
        <div class="typing-dot" style="animation-delay: 0.2s"></div>
        <div class="typing-dot" style="animation-delay: 0.4s"></div>
        <span class="typing-text">typing</span>
    </div>`;
    chatBox.insertAdjacentHTML('beforeend', typingHTML);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
        indicator.style.opacity = 0;
        setTimeout(() => indicator.remove(), 300);
    }
}

// Enhanced message creation with animations
function createMessage(sender, content) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = formatMessageContent(content);
    
    // 3D tilt effect on hover
    if (sender === 'bot') {
        messageDiv.style.transform = 'perspective(1000px) rotateY(15deg)';
        messageDiv.style.transition = 'transform 0.5s ease';
        messageDiv.addEventListener('mouseenter', () => {
            messageDiv.style.transform = 'perspective(1000px) rotateY(0deg) scale(1.02)';
        });
        messageDiv.addEventListener('mouseleave', () => {
            messageDiv.style.transform = 'perspective(1000px) rotateY(15deg)';
        });
    }
    
    // Store message
    messageHistory.push({
        sender,
        content,
        timestamp: new Date().toISOString()
    });
    
    // Animation
    messageDiv.style.opacity = 0;
    messageDiv.style.transform += ' translateY(20px)';
    chatBox.appendChild(messageDiv);
    
    let opacity = 0;
    const fadeIn = setInterval(() => {
        opacity += 0.1;
        messageDiv.style.opacity = opacity;
        messageDiv.style.transform = `perspective(1000px) rotateY(15deg) translateY(${20 - (20 * opacity)}px)`;
        if (opacity >= 1) clearInterval(fadeIn);
    }, 50);
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

function formatMessageContent(text) {
    // Convert markdown-like formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" class="resource-link">🔗 Learn More</a>')
        .replace(/➔/g, '→')
        .replace(/(^|\s)([•▪◦])(\s)/g, '$1•$3');
}

// Enhanced send function with history
async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value.trim();
    if (!message) return;
    
    createMessage('user', message);
    input.value = '';
    showTyping();
    
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: messageHistory.slice(-3)
            })
        });
        
        const data = await response.json();
        hideTyping();
        
        if (data.error) {
            createMessage('bot', `⚠️ Error: ${data.error}`);
        } else {
            createMessage('bot', data.response);
        }
    } catch (error) {
        hideTyping();
        createMessage('bot', "🌐 Connection issue - please try again");
        console.error('Fetch error:', error);
    }
}

// Initialize with animated greeting
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        createMessage('bot', "🌟 Welcome! I'm your mental health companion. How are you feeling right now?");
    }, 1500);
    
    document.getElementById("user-input").addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});