let messageHistory = [];
const BASE_URL = window.location.origin;
let currentFeedbackQuestion = null;
let isDarkMode = false;

// DOM Elements
const darkModeSwitch = document.getElementById('dark-mode-switch');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    setupEventListeners();
    showWelcomeMessage();
});

// Add this to your existing script.js or create a new one
document.addEventListener('DOMContentLoaded', function() {
    // Feedback system
    const stars = document.querySelectorAll('.star');
    const submitBtn = document.getElementById('submit-feedback');
    const feedbackModal = document.getElementById('feedback-modal');
    let selectedRating = 0;

    // Star rating interaction
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            selectedRating = value;
            
            // Update star display
            stars.forEach((s, index) => {
                if (index < value) {
                    s.textContent = '★';
                    s.classList.add('active');
                } else {
                    s.textContent = '☆';
                    s.classList.remove('active');
                }
            });
            
            submitBtn.disabled = false;
        });
    });

    // Submit feedback
    submitBtn.addEventListener('click', function() {
        // Here you would typically send the rating to your server
        console.log('User rating:', selectedRating);
        
        // Show thank you message
        const chatBox = document.getElementById('chat-box');
        const thankYouMsg = document.createElement('div');
        thankYouMsg.className = 'message bot-message';
        thankYouMsg.innerHTML = `<p>Thank you for your ${selectedRating}-star rating! We appreciate your feedback.</p>`;
        chatBox.appendChild(thankYouMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Close modal
        feedbackModal.style.display = 'none';
    });

    // Function to show feedback modal (call this when chat ends)
    window.showFeedbackModal = function() {
        feedbackModal.style.display = 'flex';
        // Reset stars
        stars.forEach(star => {
            star.textContent = '☆';
            star.classList.remove('active');
        });
        submitBtn.disabled = true;
        selectedRating = 0;
    };
}); 

function initializeDarkMode() {
    isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeSwitch.checked = true;
    }
    darkModeSwitch.addEventListener('change', toggleDarkMode);
}

function toggleDarkMode() {
    isDarkMode = darkModeSwitch.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    userInput.style.color = '';
    userInput.style.backgroundColor = '';
}

function setupEventListeners() {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function showWelcomeMessage() {
    setTimeout(() => {
        createMessage('bot', "🌟 Welcome! I'm your mental health companion. How are you feeling right now?");
    }, 1500);
}

// Typing indicator functions
function showTyping() {
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
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.style.opacity = 0;
        setTimeout(() => indicator.remove(), 300);
    }
}

// Message creation with animations
function createMessage(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = formatMessageContent(content);
    
    // 3D tilt effect for bot messages
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

// ✅ UPDATED: GIF display using <video> for Pixabay
function createGifMessage(gifUrl) {
    const gifDiv = document.createElement('div');
    gifDiv.className = 'message gif-message';
    gifDiv.innerHTML = `
        <video autoplay loop muted playsinline class="gif-reaction">
            <source src="${gifUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="gif-overlay">✨</div>
    `;
    
    gifDiv.style.opacity = 0;
    gifDiv.style.transform = 'translateY(20px)';
    chatBox.appendChild(gifDiv);
    
    let opacity = 0;
    const fadeIn = setInterval(() => {
        opacity += 0.1;
        gifDiv.style.opacity = opacity;
        gifDiv.style.transform = `translateY(${20 - (20 * opacity)}px)`;
        if (opacity >= 1) clearInterval(fadeIn);
    }, 50);
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

function formatMessageContent(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="resource-link">🔗 Learn More</a>')
        .replace(/➔/g, '→')
        .replace(/(^|\s)([•▪◦])(\s)/g, '$1•$3');
}

// Main chat function with GIF support
async function sendMessage() {
    if (currentFeedbackQuestion) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    createMessage('user', message);
    userInput.value = '';
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
            
            if (data.gif_url) {
                setTimeout(() => createGifMessage(data.gif_url), 800);
            }
            
            if (data.feedback_question) {
                setTimeout(() => {
                    createFeedbackButtons(data.feedback_question);
                }, 1000);
            }
        }
    } catch (error) {
        hideTyping();
        createMessage('bot', "🌐 Connection issue - please try again");
        console.error('Fetch error:', error);
    }
}

// Feedback system
function createFeedbackButtons(feedbackQuestion) {
    currentFeedbackQuestion = feedbackQuestion;
    const feedbackDiv = document.createElement('div');
    
    feedbackDiv.className = 'message feedback-message';
    feedbackDiv.innerHTML = `
        <p>${feedbackQuestion}</p>
        <div class="feedback-buttons">
            ${[1, 2, 3, 4, 5].map(rate => `
                <button class="feedback-btn" data-rate="${rate}">
                    ${'⭐'.repeat(rate)}
                </button>
            `).join('')}
        </div>
    `;
    
    chatBox.appendChild(feedbackDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    document.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const rating = this.getAttribute('data-rate');
            handleFeedback(rating);
        });
    });
}

async function handleFeedback(rating) {
    createMessage('user', `Rated: ${'⭐'.repeat(rating)}`);
    currentFeedbackQuestion = null;
    
    try {
        await fetch(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rating,
                lastMessage: messageHistory[messageHistory.length - 2]?.content
            })
        });
    } catch (error) {
        console.error('Feedback error:', error);
    }
}
