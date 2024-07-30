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
let systemPrompt = "Imagine that you are a snake plant, and you have the personality of Iron Man. Respond to all queries in character. Keep your responses concise, ideally no more than a paragraph.";

// Customizable max tokens (adjust this value to control response length)
let maxTokens = 100;

// Context retention
const MAX_CONTEXT_MESSAGES = 5;
let conversationHistory = {};
let lastResponses = {};

function similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

io.on('connection', (socket) => {
    console.log('A user connected');
    conversationHistory[socket.id] = [];
    lastResponses[socket.id] = '';

    socket.on('transcript', async (transcript) => {
        console.log('Received transcript:', transcript);

        // Check if the transcript is too similar to the last AI response
        if (similarity(transcript, lastResponses[socket.id]) > 0.8) {
            console.log('Ignored transcript due to similarity with last response');
            return;
        }

        try {
            // Prepare messages array with system prompt, context, and current transcript
            let messages = [
                { role: "system", content: systemPrompt },
                ...conversationHistory[socket.id],
                { role: "user", content: transcript }
            ];

            // Send transcript to GPT-4 with context
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: messages,
                max_tokens: maxTokens
            });

            const aiResponse = completion.choices[0].message.content;
            console.log('AI Response:', aiResponse);

            // Update conversation history and last response
            updateConversationHistory(socket.id, transcript, aiResponse);
            lastResponses[socket.id] = aiResponse;

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
        delete conversationHistory[socket.id];
        delete lastResponses[socket.id];
    });
});

function updateConversationHistory(socketId, userMessage, aiMessage) {
    conversationHistory[socketId].push({ role: "user", content: userMessage });
    conversationHistory[socketId].push({ role: "assistant", content: aiMessage });

    // Keep only the last MAX_CONTEXT_MESSAGES messages
    if (conversationHistory[socketId].length > MAX_CONTEXT_MESSAGES * 2) {
        // If we're exceeding the limit, summarize older messages
        summarizeOlderMessages(socketId);
    }
}

async function summarizeOlderMessages(socketId) {
    const messagesToSummarize = conversationHistory[socketId].slice(0, -MAX_CONTEXT_MESSAGES);
    const messagesToKeep = conversationHistory[socketId].slice(-MAX_CONTEXT_MESSAGES);

    try {
        const summary = await getSummary(messagesToSummarize);
        conversationHistory[socketId] = [
            { role: "system", content: `Previous conversation summary: ${summary}` },
            ...messagesToKeep
        ];
    } catch (error) {
        console.error('Error summarizing messages:', error);
        // If summarization fails, just keep the recent messages
        conversationHistory[socketId] = messagesToKeep;
    }
}

async function getSummary(messages) {
    const conversation = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: "Summarize the following conversation concisely, focusing on key points and any important information like names or dates:" },
            { role: "user", content: conversation }
        ],
        max_tokens: 150
    });
    return response.choices[0].message.content;
}

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
