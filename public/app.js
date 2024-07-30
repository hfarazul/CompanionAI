// app.js
const socket = io('http://localhost:3000');
let recognition;

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const transcriptDiv = document.getElementById('transcript');
const responseDiv = document.getElementById('response');

startButton.addEventListener('click', startListening);
stopButton.addEventListener('click', stopListening);

function startListening() {
    startButton.disabled = true;
    stopButton.disabled = false;
    transcriptDiv.innerHTML = '<div class="message-header">You said:</div>';
    responseDiv.innerHTML = '<div class="message-header">AI response:</div>';

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        transcriptDiv.innerHTML = `<div class="message-header">You said:</div>${transcriptText}`;

        if (event.results[current].isFinal) {
            socket.emit('transcript', transcriptText);
        }
    };

    recognition.start();
}

function stopListening() {
    if (recognition) {
        recognition.stop();
    }
    startButton.disabled = false;
    stopButton.disabled = true;
}

socket.on('response', (data) => {
    transcriptDiv.innerHTML = `<div class="message-header">You said:</div>${data.transcript}`;
    responseDiv.innerHTML = `<div class="message-header">AI response:</div>${data.aiResponse}`;

    // Optional: Text-to-speech for AI response
    speakResponse(data.aiResponse);
});

// Optional: Text-to-speech function
function speakResponse(text) {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
}
