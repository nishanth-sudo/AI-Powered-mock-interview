document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chatBox");
    const answerInput = document.getElementById("answerInput");
    const submitBtn = document.getElementById("submitAnswer");
    const endBtn = document.getElementById("endInterview");
    const resetBtn = document.getElementById("resetInterview");
    const domainTips = document.getElementById("domainTips");
    const typingIndicator = document.getElementById("typingIndicator");
    
    // Get domain and level from the page
    const domain = selectedDomain || "Python";
    const level = selectedLevel || "intermediate";
    
    let isInterviewStarted = false;
    let isWaitingForResponse = false;
    
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
    
    // Function to add a message to the chat
    function addMessage(role, content, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        if (isLoading) {
            messageDiv.innerHTML = `
                <div class="loading"><div></div><div></div><div></div></div>
                <p>${content}</p>
            `;
        } else {
            messageDiv.innerHTML = `<p>${content}</p>`;
        }
        
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        
        return messageDiv; // Return for potential updates later
    }
    
    // Function to start a new interview
    async function startInterview() {
        chatBox.innerHTML = '';
        answerInput.value = '';
        isInterviewStarted = true;
        isWaitingForResponse = true;
        
        // Show typing indicator
        typingIndicator.style.display = "flex";
        
        // Add loading message
        const loadingMessage = addMessage('interviewer', `<i>Loading first question about ${domain}...</i>`, true);
        
        try {
            const res = await fetch(`/start?domain=${encodeURIComponent(domain)}&level=${encodeURIComponent(level)}`, {
                method: "GET"
            });
            
            const data = await res.json();
            
            // Update domain tips if provided
            if (data.tips) {
                updateDomainTips(data.tips);
            }
            
            // Hide typing indicator
            typingIndicator.style.display = "none";
            isWaitingForResponse = false;
            
            // Replace the loading message with the actual first question
            chatBox.removeChild(loadingMessage);
            addMessage('interviewer', data.reply);
            
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
        const answer = answerInput.value.trim();
        if (!answer || isWaitingForResponse) return;
        
        // Set waiting state
        isWaitingForResponse = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        // Add user's answer to chat
        addMessage('candidate', answer);
        
        // Show typing indicator
        typingIndicator.style.display = "flex";
        
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
            
            // Hide typing indicator
            typingIndicator.style.display = "none";
            isWaitingForResponse = false;
            
            // Add the AI's response with HTML formatting preserved
            addMessage('interviewer', data.reply);
            
            // Apply styling to the horizontal rule if present
            styleHorizontalRules();
            
        } catch (error) {
            console.error("Error submitting answer:", error);
            
            // Hide typing indicator
            typingIndicator.style.display = "none";
            isWaitingForResponse = false;
            
            // Show error message
            addMessage('interviewer', `I'm having trouble evaluating your answer. Let's continue with another ${domain} question. Could you explain a challenging problem you solved using ${domain}?`);
            
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answer';
        }
        
        // Clear input field
        answerInput.value = "";
        
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
            hr.style.backgroundColor = 'var(--border-color)';
        });
    }
    
    // Function to end the interview
    async function endInterview() {
        if (!confirm("Are you sure you want to end this interview? This will generate your final report.")) {
            return;
        }

        isWaitingForResponse = true;
        endBtn.disabled = true;
        submitBtn.disabled = true;
        
        // Show typing indicator
        typingIndicator.style.display = "flex";
        
        try {
            const res = await fetch("/end_interview", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    domain: domain,
                    level: level
                })
            });
            
            const data = await res.json();
            
            // Hide typing indicator
            typingIndicator.style.display = "none";
            
            // Clear chat and show final evaluation
            chatBox.innerHTML = '';
            addMessage('interviewer', data.evaluation);
            
            // Add download functionality if report is available
            if (data.can_download) {
                setTimeout(() => {
                    const downloadBtn = document.getElementById("downloadReport");
                    if (downloadBtn) {
                        downloadBtn.addEventListener("click", () => {
                            window.open("/download_report", "_blank");
                        });
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error("Error ending interview:", error);
            typingIndicator.style.display = "none";
            addMessage('interviewer', 'An error occurred while generating your interview summary. Please try again.');
        }
        
        // Disable input area
        answerInput.disabled = true;
        submitBtn.style.display = 'none';
        endBtn.style.display = 'none';
    }

    // Add event listeners
    submitBtn.addEventListener("click", submitAnswer);
    endBtn.addEventListener("click", endInterview);
    
    // Allow pressing Enter to submit
    answerInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitAnswer();
        }
    });
    
    // Reset interview button
    resetBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to reset the interview? This will start a new conversation.")) {
            startInterview();
        }
    });
    
    // Add focus animation to text area
    answerInput.addEventListener("focus", () => {
        answerInput.parentElement.classList.add("focused");
    });
    
    answerInput.addEventListener("blur", () => {
        answerInput.parentElement.classList.remove("focused");
    });
});
