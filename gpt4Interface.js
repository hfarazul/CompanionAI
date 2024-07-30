// gpt4Interface.js

require('dotenv').config()

const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Replace with your actual API key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function getGPT4Response(transcriptText) {
    try {
        const response = await axios.post(OPENAI_API_URL, {
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are a helpful assistant in a voice chat application. Provide concise responses." },
                { role: "user", content: transcriptText }
            ],
            max_tokens: 150 // Adjust as needed
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error calling GPT-4:', error);
        return "I'm sorry, I encountered an error while processing your request.";
    }
}

module.exports = { getGPT4Response };
