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

function getTenMinuteIntervalSeed() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const millisecondsPerTenMinutes = 10 * 60 * 1000;
    const intervalCount = Math.floor((now - startOfDay) / millisecondsPerTenMinutes);
    return intervalCount + now.getDate();
}

function loadDailyQuestion() {
    fetch('https://raw.githubusercontent.com/khobster/myprojects/main/badwillafishing.json')
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                const seed = getTenMinuteIntervalSeed();
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

function startCountdown() {
    const countdownElement = document.getElementById('timer');
    const interval = setInterval(() => {
        const currentTime = new Date();
        const resetTime = new Date(currentTime);
        resetTime.setMinutes(Math.ceil(currentTime.getMinutes() / 10) * 10, 0, 0);

        const timeDifference = resetTime - currentTime;
        if (timeDifference <= 0) {
            clearInterval(interval);
            loadDailyQuestion(); // Reload the question
            startCountdown(); // Immediately restart the countdown
            return;
        }

        const minutes = Math.floor(timeDifference / 60000);
        const seconds = Math.floor((timeDifference % 60000) / 1000);
        countdownElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadDailyQuestion();
    startCountdown();
    document.getElementById('submitAnswerBtn').addEventListener('click', function() {
        const userGuess = document.getElementById('userAnswer').value;
        let isCorrect = isCorrectAnswer(userGuess, dailyData.answer);
        updateResult(isCorrect, document.getElementById('result'));
    });
});
