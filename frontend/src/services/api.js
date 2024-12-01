export const api = {
  async testConnection() {
    try {
      console.log('Iniciando chamada para a API...');
      const response = await fetch('http://localhost:5000/api/test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos:', data);
      return data;
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  },

  async sendMessage(message, images = [], stream = true) {
    try {
      if (stream) {
        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message,
            image_urls: images,
            stream: true
          })
        });

        return response.body;
      } else {
        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            message,
            image_urls: images,
            stream: false
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro na API: ${response.status}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  },

  async regenerateResponse(previousMessage, imageUrl = null) {
    try {
      const response = await fetch('http://localhost:5000/api/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          previous_message: previousMessage,
          image_url: imageUrl
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao regenerar resposta:', error);
      throw error;
    }
  }
}; 