from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import random
from datetime import datetime
from resources import enhanced_resources

nltk.download('vader_lexicon')

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Enhanced initialization
sia = SentimentIntensityAnalyzer()
conversation_context = {
    "last_topics": [],
    "emotional_state": None,
    "follow_up_count": 0,
    "last_response_time": None
}
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform([item['concern'] for item in enhanced_resources])

def preprocess_input(text):
    text = re.sub(r'[^\w\s.!?]', '', text.lower())
    return ' '.join([word for word in text.split() if len(word) > 2])

def detect_concern(user_input):
    processed_input = preprocess_input(user_input)
    
    # Check for positive states
    positive_words = ['happy', 'joy', 'excited', 'proud', 'good', 'great']
    if any(word in processed_input for word in positive_words):
        return "positive_state"
    
    # Enhanced concern detection
    for concern in enhanced_resources:
        if (concern['concern'] in processed_input or 
            any(syn in processed_input for syn in concern['synonyms'])):
            return concern
    
    # Semantic similarity fallback
    input_vec = vectorizer.transform([processed_input])
    similarity = cosine_similarity(input_vec, tfidf_matrix).flatten()
    if similarity.max() > 0.5:
        return enhanced_resources[similarity.argmax()]
    return None

def generate_response(user_input):
    global conversation_context
    
    sentiment = sia.polarity_scores(user_input)
    concern = detect_concern(user_input)
    current_time = datetime.now()
    
    # Time-based greeting
    if not conversation_context["last_response_time"]:
        hour = current_time.hour
        greeting = "Good morning" if 5 <= hour < 12 else "Good afternoon" if 12 <= hour < 17 else "Good evening"
        return f"{greeting}! I'm here to support you. How are you feeling today?"
    
    # Handle positive states
    if concern == "positive_state":
        conversation_context.update({
            "emotional_state": "positive",
            "last_topics": ["happiness"],
            "follow_up_count": 0
        })
        positive_responses = [
            "That's wonderful to hear! 😊 Would you like to share what's brought you this happiness?",
            "Your joy brightens my day! 🌟 What specifically contributed to these good feelings?",
            "Celebrating with you! 🎉 What was the highlight of this positive experience?"
        ]
        return random.choice(positive_responses)
    
    # Handle identified concerns
    if isinstance(concern, dict):
        response = random.choice(concern['responses'])
        
        # Emotional validation
        if sentiment['neg'] > 0.6:
            emotional_support = [
                "I can see this is weighing heavily on you... 💙",
                "This sounds genuinely difficult to bear... 🌧️",
                "My heart goes out to you as you face this... 🤲"
            ]
            response = f"{random.choice(emotional_support)}\n\n{response}"
        
        # Context management
        if concern['concern'] not in conversation_context["last_topics"]:
            conversation_context["last_topics"].append(concern['concern'])
            conversation_context["follow_up_count"] = 1
            return f"{response}\n\n{concern.get('follow_up', '')}"
        else:
            conversation_context["follow_up_count"] += 1
            if conversation_context["follow_up_count"] > 2:
                conversation_context["last_topics"].pop()
                return "To better assist you, let's try approaching this differently. Could you describe what ideal support would look like for you right now?"
            return response
    
    # Default fallback with context awareness
    if conversation_context["last_topics"]:
        return "I want to understand this completely. Could you tell me more about how this affects your daily life?"
    return "Help me understand what's on your mind. What's been most present for you lately?"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        message = request.json.get('message', '')
        if not message:
            return jsonify({"error": "Empty message"}), 400
        
        response = generate_response(message)
        conversation_context["last_response_time"] = datetime.now()
        
        return jsonify({
            "response": response,
            "sentiment": sia.polarity_scores(message)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)



