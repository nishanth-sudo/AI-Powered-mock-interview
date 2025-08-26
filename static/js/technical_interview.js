document.addEventListener("DOMContentLoaded", () => {
    const mcqContainer = document.getElementById("mcqContainer");
    const mcqQuestion = document.getElementById("mcqQuestion");
    const mcqOptions = document.getElementById("mcqOptions");
    const mcqFeedback = document.getElementById("mcqFeedback");
    const submitMcqBtn = document.getElementById("submitMcq");
    const nextQuestionBtn = document.getElementById("nextQuestion");
    const endInterviewBtn = document.getElementById("endInterview");
    const resetBtn = document.getElementById("resetInterview");
    const progressFill = document.getElementById("progressFill");
    const currentQuestionDisplay = document.getElementById("currentQuestion");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const timerDisplay = document.getElementById("timer");
    
    // Get topics and level from the page
    const topics = selectedTopics || ["DBMS"];
    const level = selectedLevel || "intermediate";
    
    let currentQuestionIndex = 0;
    let totalQuestions = 10;
    let selectedOptionIndex = null;
    let score = 0;
    let questions = [];
    let isAnswerSubmitted = false;
    
    // Timer variables
    const totalTime = 30 * 60; // 30 minutes in seconds
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
        alert("Time's up! Your interview has ended. Final score: " + score);
        showResults();
    }
    
    // Update progress indicators
    function updateProgress() {
        const progress = ((currentQuestionIndex) / totalQuestions) * 100;
        progressFill.style.width = `${progress}%`;
        currentQuestionDisplay.textContent = `Question: ${currentQuestionIndex + 1}/${totalQuestions}`;
        scoreDisplay.textContent = `Score: ${score}`;
    }
    
    // Function to generate a question
    async function fetchNextQuestion() {
        mcqQuestion.textContent = "Loading question...";
        mcqOptions.innerHTML = "";
        isAnswerSubmitted = false;
        mcqFeedback.style.display = "none";
        submitMcqBtn.style.display = "block";
        nextQuestionBtn.style.display = "none";
        
        // Show loading indicator
        document.getElementById("loadingIndicator").style.display = "block";
        
        try {
            const res = await fetch("/technical_question", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    topics: topics,
                    level: level
                })
            });
            
            const data = await res.json();
            
            // Hide loading indicator
            document.getElementById("loadingIndicator").style.display = "none";
            
            if (data.question) {
                displayQuestion(data.question);
                questions[currentQuestionIndex] = data.question;
            } else {
                mcqQuestion.textContent = "Error loading question. Please try again.";
                submitMcqBtn.disabled = true;
                nextQuestionBtn.style.display = "block";
                nextQuestionBtn.textContent = "Try Again";
            }
            
        } catch (error) {
            console.error("Error fetching question:", error);
            mcqQuestion.textContent = "Error loading question. Please try again.";
        }
        
        updateProgress();
    }
    
    // Display a question and its options
    function displayQuestion(questionData) {
        mcqQuestion.textContent = questionData.question;
        mcqOptions.innerHTML = "";
        
        // Add animation class to the question
        mcqQuestion.classList.add('animate__animated', 'animate__fadeIn');
        
        questionData.options.forEach((option, index) => {
            const optionElement = document.createElement("div");
            optionElement.className = "option-item";
            optionElement.dataset.index = index;
            
            // Add animation with staggered delay
            optionElement.classList.add('animate__animated', 'animate__fadeInUp');
            optionElement.style.animationDelay = `${index * 0.1}s`;
            
            optionElement.innerHTML = `
                <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                <div class="option-text">${option}</div>
            `;
            
            // Add click handler to select this option
            optionElement.addEventListener("click", () => {
                if (!isAnswerSubmitted) {
                    // Remove selected class from all options
                    document.querySelectorAll(".option-item").forEach(opt => {
                        opt.classList.remove("selected");
                    });
                    
                    // Select this option
                    optionElement.classList.add("selected");
                    selectedOptionIndex = index;
                }
            });
            
            // Add keydown handler for accessibility
            optionElement.tabIndex = 0;
            optionElement.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isAnswerSubmitted) {
                        // Remove selected class from all options
                        document.querySelectorAll(".option-item").forEach(opt => {
                            opt.classList.remove("selected");
                        });
                        
                        // Select this option
                        optionElement.classList.add("selected");
                        selectedOptionIndex = index;
                    }
                }
            });
            
            mcqOptions.appendChild(optionElement);
        });
        
        // Reset selected option
        selectedOptionIndex = null;
    }
    
    // Submit the answer
    async function submitAnswer() {
        if (selectedOptionIndex === null) {
            alert("Please select an option before submitting.");
            return;
        }
        
        isAnswerSubmitted = true;
        submitMcqBtn.style.display = "none";
        nextQuestionBtn.style.display = "block";
        
        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = selectedOptionIndex === currentQuestion.correct_index;
        
        if (isCorrect) {
            score += 1;
            mcqFeedback.textContent = "Correct! " + currentQuestion.explanation;
            mcqFeedback.className = "mcq-feedback correct";
        } else {
            mcqFeedback.textContent = `Incorrect. The correct answer is: ${currentQuestion.options[currentQuestion.correct_index]}. ${currentQuestion.explanation}`;
            mcqFeedback.className = "mcq-feedback incorrect";
        }
        
        mcqFeedback.style.display = "block";
        
        // Mark the correct and incorrect options
        document.querySelectorAll(".option-item").forEach((option, index) => {
            if (index === currentQuestion.correct_index) {
                option.classList.add("correct");
            } else if (index === selectedOptionIndex) {
                option.classList.add("incorrect");
            }
        });
        
        updateProgress();
        
        // Check if this was the last question
        if (currentQuestionIndex === totalQuestions - 1) {
            nextQuestionBtn.textContent = "View Results";
        }
    }
    
    // Move to the next question
    function nextQuestion() {
        if (currentQuestionIndex < totalQuestions - 1) {
            currentQuestionIndex++;
            selectedOptionIndex = null;
            fetchNextQuestion();
        } else {
            // Show results
            showResults();
        }
    }
    
    // End interview early
    async function endInterviewEarly() {
        if (!confirm("Are you sure you want to end this interview? Your current score will be calculated for the report.")) {
            return;
        }
        
        // Stop the timer
        clearInterval(timerInterval);
        
        // Show loading
        document.getElementById("loadingIndicator").style.display = "block";
        
        try {
            const res = await fetch("/end_interview", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    domain: topics.join(", "),
                    level: level,
                    score: score,
                    totalQuestions: currentQuestionIndex + 1,
                    timeElapsed: totalTime - timeRemaining
                })
            });
            
            const data = await res.json();
            
            // Hide loading
            document.getElementById("loadingIndicator").style.display = "none";
            
            // Show results with download option
            showFinalResults(data);
            
        } catch (error) {
            console.error("Error ending interview:", error);
            document.getElementById("loadingIndicator").style.display = "none";
            showResults(); // Fall back to regular results
        }
    }
    
    // Show final results with download option
    function showFinalResults(data) {
        const finalScore = score;
        const totalScore = currentQuestionIndex + 1;
        const percentage = Math.round((finalScore / totalScore) * 100);
        
        // Clear the interview panel
        const interviewPanel = document.querySelector(".interview-panel");
        interviewPanel.innerHTML = `
            <div class="results-container fade-in">
                <div class="results-header">
                    <h2>Technical Interview Complete!</h2>
                    <div class="results-score">
                        <span>${finalScore}/${totalScore}</span> (${percentage}%)
                    </div>
                </div>
                
                <div class="results-section">
                    <h3>Performance Summary</h3>
                    <p>You answered ${finalScore} out of ${totalScore} questions correctly.</p>
                    <p>Topics covered: ${topics.join(", ")}</p>
                    <p>Difficulty level: ${level}</p>
                    ${data.feedback ? `<div class="feedback">${data.feedback}</div>` : ''}
                </div>
                
                <div class="action-buttons">
                    <button id="downloadReport" class="primary-btn"><i class="fas fa-download"></i> Download Report</button>
                    <button id="tryAgainBtn" class="secondary-btn"><i class="fas fa-redo"></i> Try Again</button>
                    <a href="/" class="secondary-btn"><i class="fas fa-home"></i> Back to Home</a>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById("downloadReport").addEventListener("click", () => {
            window.open("/download_report", "_blank");
        });
        
        document.getElementById("tryAgainBtn").addEventListener("click", () => {
            window.location.reload();
        });
    }

    // Show the final results
    function showResults() {
        // Stop the timer
        clearInterval(timerInterval);
        
        const finalScore = score;
        const totalScore = totalQuestions;
        const percentage = Math.round((finalScore / totalScore) * 100);
        
        // Clear the interview panel
        const interviewPanel = document.querySelector(".interview-panel");
        interviewPanel.innerHTML = `
            <div class="results-container fade-in">
                <div class="results-header">
                    <h2>Technical Interview Results</h2>
                    <div class="results-score">
                        <span>${finalScore}/${totalScore}</span> (${percentage}%)
                    </div>
                </div>
                
                <div class="results-section">
                    <h3>Performance Summary</h3>
                    <p>You answered ${finalScore} out of ${totalScore} questions correctly.</p>
                    <p>Topics covered: ${topics.join(", ")}</p>
                    <p>Difficulty level: ${level}</p>
                </div>
                
                <div class="action-buttons">
                    <button id="tryAgainBtn" class="primary-btn"><i class="fas fa-redo"></i> Try Again</button>
                    <a href="/" class="secondary-btn"><i class="fas fa-home"></i> Back to Home</a>
                </div>
            </div>
        `;
        
        // Add event listener to the try again button
        document.getElementById("tryAgainBtn").addEventListener("click", () => {
            window.location.reload();
        });
    }
    
    // Reset the interview
    function resetInterview() {
        currentQuestionIndex = 0;
        score = 0;
        questions = [];
        selectedOptionIndex = null;
        isAnswerSubmitted = false;
        
        // Reset and start timer
        timeRemaining = totalTime;
        updateTimerDisplay();
        startTimer();
        
        fetchNextQuestion();
    }
    
    // Add event listeners
    submitMcqBtn.addEventListener("click", submitAnswer);
    nextQuestionBtn.addEventListener("click", nextQuestion);
    endInterviewBtn.addEventListener("click", endInterviewEarly);
    resetBtn.addEventListener("click", resetInterview);
    
    // Start the interview
    resetInterview();
});
