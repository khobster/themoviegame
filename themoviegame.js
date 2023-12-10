let dailyData = {};
const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

function isCorrectAnswer(guess, answer) {
    return guess.trim().toLowerCase() === answer.trim().toLowerCase();
}

function updateResult(isCorrect, resultElement) {
    if (isCorrect) {
        resultElement.textContent = 'YESSSS!';
        resultElement.className = 'correct'; // Triggers the pulse animation
        correctSound.play();
    } else {
        resultElement.textContent = 'Nope. Give it another shot.';
        resultElement.className = 'incorrect'; // Triggers the shake animation
        wrongSound.play();
    }
}

function getThirtyMinuteIntervalSeed() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const millisecondsPerThirtyMinutes = 30 * 60 * 1000;
    const intervalCount = Math.floor((now - startOfDay) / millisecondsPerThirtyMinutes);
    return intervalCount + now.getDate();
}

function loadDailyQuestion() {
    fetch('https://raw.githubusercontent.com/khobster/myprojects/main/badwillafishing.json')
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                const seed = getThirtyMinuteIntervalSeed();
                Math.seedrandom(seed);
                const questionIndex = Math.floor(Math.random() * data.length);
                
                dailyData = data[questionIndex];
                document.getElementById('questionText').textContent = dailyData.question;
            } else {
                console.error('JSON data is not an array:', data);
                document.getElementById('dailyQuestion').textContent = 'Error in JSON data format.';
            }
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            document.getElementById('dailyQuestion').textContent = 'Error loading question.';
        });
}

document.addEventListener('DOMContentLoaded', () => {
    loadDailyQuestion();
    document.getElementById('submitAnswerBtn').addEventListener('click', function() {
        const userGuess = document.getElementById('userAnswer').value;
        let isCorrect = isCorrectAnswer(userGuess, dailyData.answer);
        updateResult(isCorrect, document.getElementById('result'));
    });
});
