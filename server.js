// server.js (Node.js with Express, Socket.IO, and updated OpenAI integration)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const OpenAI = require('openai');
require('dotenv').config();

app.use(express.static('public'));

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Customizable system prompt
let systemPrompt = "Imagine that you are a snake plant, and you are Iron Man character. Respond to all queries in character. Keep your responses concise, ideally no more than a paragraph.";

let maxTokens = 100; // This is roughly equivalent to about 75 words

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('transcript', async (transcript) => {
        console.log('Received transcript:', transcript);

        try {
            // Send transcript to GPT-4 with the system prompt
            const completion = await openai.chat.completions.create({
              model: "gpt-4",
              messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: transcript }
              ],
              max_tokens: maxTokens
          });

            const aiResponse = completion.choices[0].message.content;
            console.log('AI Response:', aiResponse);

            // Send both transcript and AI response back to client
            socket.emit('response', { transcript, aiResponse });
        } catch (error) {
            console.error('Error calling OpenAI:', error);
            socket.emit('response', {
                transcript,
                aiResponse: "Sorry, I couldn't process that request."
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Function to update the system prompt
function updateSystemPrompt(newPrompt) {
    systemPrompt = newPrompt;
    console.log('System prompt updated:', systemPrompt);
}

// Example usage:
// updateSystemPrompt("New system prompt here");

function updateMaxTokens(newMaxTokens) {
  maxTokens = newMaxTokens;
  console.log('Max tokens updated:', maxTokens);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Current system prompt:', systemPrompt);
});

// Export the updateSystemPrompt function if you want to use it in other files
module.exports = { updateSystemPrompt };
