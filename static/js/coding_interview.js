document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chatBox");
    const codeEditor = document.getElementById("codeEditor") || document.getElementById("answerInput");
    const submitBtn = document.getElementById("submitAnswer");
    const resetBtn = document.getElementById("resetInterview");
    const domainTips = document.getElementById("domainTips");
    const progressFill = document.getElementById("progressFill");
    const currentQuestionDisplay = document.getElementById("currentQuestion");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const timerDisplay = document.getElementById("timer");
    
    // Get domain and level from the page
    const domain = selectedDomain || "Python";
    const level = selectedLevel || "intermediate";
    const type = interviewType || "coding";
    
    let isInterviewStarted = false;
    let currentQuestionIndex = 0;
    let totalQuestions = 10;
    let score = 0;
    
    // Timer variables
    const totalTime = 60 * 60; // 60 minutes in seconds
    let timeRemaining = totalTime;
    let timerInterval;
    
    // Initialize the timer
    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                endInterview();
            } else if (timeRemaining <= 60) { // Last minute
                timerDisplay.classList.add('danger');
            } else if (timeRemaining <= 300) { // Last 5 minutes
                timerDisplay.classList.add('warning');
                timerDisplay.classList.remove('danger');
            }
        }, 1000);
    }
    
    // Update the timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.innerHTML = `<i class="fas fa-clock"></i> ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // End the interview when time runs out
    function endInterview() {
        // Show results page or message
        chatBox.innerHTML += `<p><b>Interviewer:</b> <i>Time's up! Your coding interview has ended. You completed ${currentQuestionIndex} out of ${totalQuestions} questions.</i></p>`;
        codeEditor.disabled = true;
        submitBtn.disabled = true;
    }
    
    // Update progress indicators
    function updateProgress() {
        if (!progressFill || !currentQuestionDisplay) return;
        
        const progress = ((currentQuestionIndex) / totalQuestions) * 100;
        progressFill.style.width = `${progress}%`;
        currentQuestionDisplay.textContent = `Question: ${currentQuestionIndex + 1}/${totalQuestions}`;
        
        if (scoreDisplay) {
            scoreDisplay.textContent = `Score: ${score}`;
        }
    }
    
    // Populate domain-specific tips
    function updateDomainTips(tips) {
        if (!domainTips) return;
        
        // If we have tips from the API, use those
        if (tips && Array.isArray(tips) && tips.length > 0) {
            domainTips.innerHTML = '';
            tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                domainTips.appendChild(li);
            });
        }
    }
    
    // Function to start a new interview
    async function startInterview() {
        chatBox.innerHTML = '';
        codeEditor.value = '';
        isInterviewStarted = true;
        currentQuestionIndex = 0;
        score = 0;
        
        // Reset and start timer
        timeRemaining = totalTime;
        updateTimerDisplay();
        startTimer();
        
        updateProgress();
        
        chatBox.innerHTML += `<p><b>Interviewer:</b> <i>Loading first question about ${domain}...</i></p>`;
        
        try {
            const res = await fetch(`/start?domain=${encodeURIComponent(domain)}&level=${encodeURIComponent(level)}`, {
                method: "GET"
            });
            
            const data = await res.json();
            
            // Update domain tips if provided
            if (data.tips) {
                updateDomainTips(data.tips);
            }
            
            // Replace the loading message with the actual first question
            chatBox.innerHTML = `<p><b>Interviewer:</b> ${data.reply}</p>`;
            
        } catch (error) {
            console.error("Error starting interview:", error);
            chatBox.innerHTML = `<p><b>Interviewer:</b> Welcome to your ${domain} interview! Let's begin by discussing your experience with ${domain}. What aspects are you most comfortable with and what have you built using it?</p>`;
        }
        
        // Auto-scroll
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // Start the interview when the page loads
    startInterview();
    
    // Submit answer function
    async function submitAnswer() {
        const answer = codeEditor.value.trim();
        if (!answer) return;
        
        // Add user's answer to chat
        chatBox.innerHTML += `<p><b>You:</b> ${answer}</p>`;
        chatBox.innerHTML += `<p><b>Interviewer:</b> <i>Evaluating your answer...</i></p>`;
        
        // Clear input field
        codeEditor.value = "";
        
        try {
            const res = await fetch("/ask", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    answer: answer,
                    domain: domain,
                    level: level
                })
            });
            
            const data = await res.json();
            
            // Remove the "evaluating" message
            chatBox.innerHTML = chatBox.innerHTML.replace(`<p><b>Interviewer:</b> <i>Evaluating your answer...</i></p>`, '');
            
            // Add the AI's response with HTML formatting preserved
            chatBox.innerHTML += `<p class="interviewer-response"><b>Interviewer:</b> ${data.reply}</p>`;
            
            // Apply styling to the horizontal rule if present
            styleHorizontalRules();
            
            // Increment question counter after the answer has been evaluated
            currentQuestionIndex++;
            updateProgress();
            
            // Check if this was the last question
            if (currentQuestionIndex >= totalQuestions) {
                chatBox.innerHTML += `<p><b>Interviewer:</b> <i>This concludes our interview. Thank you for your participation!</i></p>`;
                
                // Disable inputs
                codeEditor.disabled = true;
                submitBtn.disabled = true;
                
                // Stop the timer
                clearInterval(timerInterval);
            }
            
        } catch (error) {
            console.error("Error submitting answer:", error);
            chatBox.innerHTML = chatBox.innerHTML.replace(`<p><b>Interviewer:</b> <i>Evaluating your answer...</i></p>`, '');
            chatBox.innerHTML += `<p><b>Interviewer:</b> I'm having trouble evaluating your answer. Let's continue with another ${domain} question. Could you explain a challenging problem you solved using ${domain}?</p>`;
            
            // Still increment the question counter even if there was an error
            currentQuestionIndex++;
            updateProgress();
        }
        
        // Auto-scroll
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // Style horizontal rules for better separation
    function styleHorizontalRules() {
        const hrElements = document.querySelectorAll('.chat-box hr');
        hrElements.forEach(hr => {
            hr.style.margin = '20px 0';
            hr.style.border = 'none';
            hr.style.height = '1px';
            hr.style.backgroundColor = '#e1e4e8';
        });
    }
    
    // Add event listeners
    submitBtn.addEventListener("click", submitAnswer);
    
    // Allow pressing Enter to submit
    codeEditor.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitAnswer();
        }
    });
    
    // Reset interview button
    resetBtn.addEventListener("click", startInterview);
});
