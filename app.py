from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from textblob import TextBlob
import requests
import re
import random
from datetime import datetime
from resources import enhanced_resources

# Download required NLTK resources
nltk.download('vader_lexicon')
nltk.download('punkt')

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Initialize NLP tools
sia = SentimentIntensityAnalyzer()
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform([item['concern'] for item in enhanced_resources])

# Conversation state
conversation_context = {
    "last_topics": [],
    "emotional_state": None,
    "follow_up_count": 0,
    "last_response_time": None
}

# Pixabay API configuration
PIXABAY_API_KEY = "49655416-231675e172976ac9757109a3d"
PIXABAY_API_URL = "https://pixabay.com/api/"

def preprocess_input(text):
    text = re.sub(r'[^\w\s.!?]', '', text.lower())
    return ' '.join([word for word in text.split() if len(word) > 2])

def detect_concern(user_input):
    processed_input = preprocess_input(user_input)

    if any(word in processed_input for word in ['happy', 'joy', 'excited', 'great']):
        return "positive_state"

    for concern in enhanced_resources:
        if (concern['concern'] in processed_input or 
            any(syn in processed_input for syn in concern['synonyms'])):
            return concern

    input_vec = vectorizer.transform([processed_input])
    similarity = cosine_similarity(input_vec, tfidf_matrix).flatten()
    if similarity.max() > 0.5:
        return enhanced_resources[similarity.argmax()]
    
    return None

def detect_emotion(text):
    blob_score = TextBlob(text).sentiment.polarity
    vader_score = sia.polarity_scores(text)['compound']
    polarity = (blob_score + vader_score) / 2

    if polarity > 0.3:
        return "happy", min(1.0, polarity * 2)
    elif polarity < -0.3:
        return "sad", min(1.0, abs(polarity) * 2)
    else:
        return "neutral", 0.5

def get_relevant_gif(emotion):
    keywords = {
        "happy": "excited celebration",
        "sad": "comforting hug",
        "neutral": "calming nature",
        "positive_state": "happy dance"
    }
    query = keywords.get(emotion, "happy")

    try:
        response = requests.get(
            PIXABAY_API_URL,
            params={
                'key': PIXABAY_API_KEY,
                'q': query,
                'image_type': 'photo',
                'orientation': 'horizontal',
                'category': 'people',
                'safesearch': 'true',
                'per_page': 5
            }
        )
        images = response.json().get('hits', [])
        if images:
            return images[0].get('previewURL')
    except Exception as e:
        app.logger.error(f"[Pixabay] Error fetching GIF: {e}")
    
    return None

def generate_response(user_input):
    global conversation_context

    sentiment = sia.polarity_scores(user_input)
    concern = detect_concern(user_input)
    current_time = datetime.now()

    if not conversation_context["last_response_time"]:
        hour = current_time.hour
        greeting = "Good morning" if 5 <= hour < 12 else "Good afternoon" if 12 <= hour < 17 else "Good evening"
        return f"{greeting}! I'm here to support you. How are you feeling today?", None

    if concern == "positive_state":
        conversation_context.update({
            "emotional_state": "positive",
            "last_topics": ["happiness"],
            "follow_up_count": 0
        })
        return random.choice([
            "That's wonderful to hear! 😊 What brought you this joy?",
            "Yay! I'd love to know what made your day!",
            "I'm happy you're happy! 🥳"
        ]), "happy"

    if isinstance(concern, dict):
        response = random.choice(concern['responses'])

        if sentiment['neg'] > 0.6:
            response = f"{random.choice(['I’m really sorry you’re going through this 💙', 'That sounds really tough 😔'])}\n\n{response}"
        
        if concern['concern'] not in conversation_context["last_topics"]:
            conversation_context["last_topics"].append(concern['concern'])
            conversation_context["follow_up_count"] = 1
            return f"{response}\n\n{concern.get('follow_up', '')}", "sad"
        else:
            conversation_context["follow_up_count"] += 1
            if conversation_context["follow_up_count"] > 2:
                conversation_context["last_topics"].pop()
                return "Let's try looking at this from another angle. What kind of support do you feel would help right now?", "neutral"
            return response, "sad"

    if conversation_context["last_topics"]:
        return "Tell me more about how this is impacting you lately.", "neutral"
    
    return "What’s been on your mind recently? I'm here to listen.", "neutral"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        message = request.json.get('message', '')
        if not message.strip():
            return jsonify({"error": "Message is empty"}), 400

        response, emotion = generate_response(message)
        gif_url = get_relevant_gif(emotion) if emotion and random.random() > 0.3 else None
        conversation_context["last_response_time"] = datetime.now()

        return jsonify({
            "response": response,
            "gif_url": gif_url,
            "sentiment": sia.polarity_scores(message)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_emotion():
    try:
        message = request.json.get('message', '')
        emotion, confidence = detect_emotion(message)
        gif_url = get_relevant_gif(emotion) if confidence > 0.6 else None

        return jsonify({
            "emotion": emotion,
            "confidence": confidence,
            "gif_url": gif_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
