from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai
import base64
from PIL import Image
import io
import json
from googletrans import Translator

# Carrega variáveis de ambiente
load_dotenv()
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# Configura o Gemini
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro')

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Inicializa o tradutor
translator = Translator()

def translate_to_english(text):
    try:
        translation = translator.translate(text, dest='en')
        return translation.text
    except Exception as e:
        print(f"Erro na tradução: {str(e)}")
        return text

def base64_to_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        image_urls = data.get('image_urls', [])
        stream = data.get('stream', False)
        
        # Traduz a mensagem para inglês
        english_message = translate_to_english(message)
        print(f"Mensagem original: {message}")
        print(f"Mensagem traduzida: {english_message}")
        
        contents = []
        if english_message:
            # Adiciona instrução para responder em português
            contents.append("You must always respond in Brazilian Portuguese. Here's the user message: " + english_message)
            
        for image_url in image_urls:
            try:
                image = base64_to_image(image_url)
                contents.append(image)
            except Exception as e:
                print(f"Erro ao processar imagem: {str(e)}")
        
        if stream:
            def generate():
                response = model.generate_content(
                    contents,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=2048,
                        top_p=1
                    ),
                    stream=True
                )
                
                for chunk in response:
                    if chunk.text:
                        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream'
            )
        else:
            response = model.generate_content(
                contents,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=2048,
                    top_p=1
                )
            )
            
            return jsonify({
                "response": response.text,
                "status": "success"
            })
        
    except Exception as e:
        print(f"Erro no processamento: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/api/regenerate', methods=['POST'])
def regenerate():
    try:
        data = request.json
        previous_message = data.get('previous_message', '')
        image_urls = data.get('image_urls', [])
        
        # Traduz a mensagem para inglês
        english_message = translate_to_english(previous_message)
        
        contents = []
        if english_message:
            contents.append("You must always respond in Brazilian Portuguese. Here's the message: " + english_message)
            
        for image_url in image_urls:
            try:
                image = base64_to_image(image_url)
                contents.append(image)
            except Exception as e:
                print(f"Erro ao processar imagem: {str(e)}")
        
        response = model.generate_content(
            contents,
            generation_config=genai.types.GenerationConfig(
                temperature=0.9,
                max_output_tokens=2048,
                top_p=1
            )
        )
        
        return jsonify({
            "response": response.text,
            "status": "success"
        })
        
    except Exception as e:
        print(f"Erro no processamento: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

if __name__ == '__main__':
    print("\nServidor Flask iniciando...")
    app.run(host='0.0.0.0', port=5000, debug=True) 