<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2299.4">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 10.0px 36.0px; text-indent: -36.0px; font: 16.0px 'Helvetica Neue'; color: #181818; background-color: #ffffff}
    p.p2 {margin: 0.0px 0.0px 10.0px 36.0px; text-indent: -36.0px; font: 16.0px 'Helvetica Neue'; color: #181818; background-color: #ffffff; min-height: 18.0px}
  </style>
</head>
<body>
<p class="p1">let dailyData = {};</p>
<p class="p1">const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');</p>
<p class="p1">const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');</p>
<p class="p2"><br></p>
<p class="p1">function isCorrectAnswer(guess, answer) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>return guess.trim().toLowerCase() === answer.trim().toLowerCase();</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">function updateResult(isCorrect, resultElement) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>if (isCorrect) {</p>
<p class="p1"><span class="Apple-converted-space">        </span>resultElement.textContent = 'YESSSS!';</p>
<p class="p1"><span class="Apple-converted-space">        </span>resultElement.className = 'correct'; // Triggers the pulse animation</p>
<p class="p1"><span class="Apple-converted-space">        </span>correctSound.play();</p>
<p class="p1"><span class="Apple-converted-space">    </span>} else {</p>
<p class="p1"><span class="Apple-converted-space">        </span>resultElement.textContent = 'Nope. Give it another shot.';</p>
<p class="p1"><span class="Apple-converted-space">        </span>resultElement.className = 'incorrect'; // Triggers the shake animation</p>
<p class="p1"><span class="Apple-converted-space">        </span>wrongSound.play();</p>
<p class="p1"><span class="Apple-converted-space">    </span>}</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">function getThirtyMinuteIntervalSeed() {</p>
<p class="p1"><span class="Apple-converted-space">    </span>const now = new Date();</p>
<p class="p1"><span class="Apple-converted-space">    </span>const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());</p>
<p class="p1"><span class="Apple-converted-space">    </span>const millisecondsPerThirtyMinutes = 30 * 60 * 1000;</p>
<p class="p1"><span class="Apple-converted-space">    </span>return Math.floor((now - startOfDay) / millisecondsPerThirtyMinutes);</p>
<p class="p1">}</p>
<p class="p1">function loadDailyQuestion() {</p>
<p class="p1"><span class="Apple-converted-space">    </span>fetch('https://raw.githubusercontent.com/khobster/myprojects/main/badwillafishing.json')</p>
<p class="p1"><span class="Apple-converted-space">        </span>.then(response =&gt; response.json())</p>
<p class="p1"><span class="Apple-converted-space">        </span>.then(data =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">            </span>if (Array.isArray(data)) {</p>
<p class="p1"><span class="Apple-converted-space">                </span>const seed = getThirtyMinuteIntervalSeed();</p>
<p class="p1"><span class="Apple-converted-space">                </span>Math.seedrandom(seed);</p>
<p class="p1"><span class="Apple-converted-space">                </span>const questionIndex = Math.floor(Math.random() * data.length);</p>
<p class="p2"><span class="Apple-converted-space">                </span></p>
<p class="p1"><span class="Apple-converted-space">                </span>dailyData = data[questionIndex];</p>
<p class="p1"><span class="Apple-converted-space">                </span>document.getElementById('questionText').textContent = dailyData.question;</p>
<p class="p1"><span class="Apple-converted-space">            </span>} else {</p>
<p class="p1"><span class="Apple-converted-space">                </span>console.error('JSON data is not an array:', data);</p>
<p class="p1"><span class="Apple-converted-space">                </span>document.getElementById('dailyQuestion').textContent = 'Error in JSON data format.';</p>
<p class="p1"><span class="Apple-converted-space">            </span>}</p>
<p class="p1"><span class="Apple-converted-space">        </span>})</p>
<p class="p1"><span class="Apple-converted-space">        </span>.catch(error =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">            </span>console.error('Error loading JSON:', error);</p>
<p class="p1"><span class="Apple-converted-space">            </span>document.getElementById('dailyQuestion').textContent = 'Error loading question.';</p>
<p class="p1"><span class="Apple-converted-space">        </span>});</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">document.addEventListener('DOMContentLoaded', () =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">    </span>loadDailyQuestion();</p>
<p class="p1">});</p>
<p class="p2"><br></p>
<p class="p2"><br></p>
<p class="p1">document.addEventListener('DOMContentLoaded', () =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">    </span>loadDailyQuestion();</p>
<p class="p1"><span class="Apple-converted-space">    </span>document.getElementById('submitAnswerBtn').addEventListener('click', function() {</p>
<p class="p1"><span class="Apple-converted-space">        </span>const userGuess = document.getElementById('userAnswer').value;</p>
<p class="p1"><span class="Apple-converted-space">        </span>let isCorrect = isCorrectAnswer(userGuess, dailyData.answer);</p>
<p class="p1"><span class="Apple-converted-space">        </span>updateResult(isCorrect, document.getElementById('result'));</p>
<p class="p1"><span class="Apple-converted-space">    </span>});</p>
<p class="p1">});</p>
</body>
</html>
