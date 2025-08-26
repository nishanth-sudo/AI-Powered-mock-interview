// Enhanced UI Interactions
document.addEventListener("DOMContentLoaded", function() {
  // Add hover animations to buttons
  document.querySelectorAll('.primary-btn, .secondary-btn, .option-item, .interview-card').forEach(element => {
    element.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-3px)';
      this.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    });
    
    element.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '';
    });
  });
  
  // Animate elements on page load
  document.querySelectorAll('.interview-card, .mcq-container, .interview-header, .chat-box').forEach((element, index) => {
    setTimeout(() => {
      element.style.opacity = '0';
      element.style.animation = 'fadeIn 0.5s forwards';
      element.style.animationDelay = `${index * 0.1}s`;
    }, 100);
  });
  
  // Show loading indicator during API calls
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    // For technical interview
    const originalFetchQuestion = window.fetchNextQuestion;
    if (typeof originalFetchQuestion === 'function') {
      window.fetchNextQuestion = async function() {
        loadingIndicator.style.display = 'block';
        await originalFetchQuestion();
        loadingIndicator.style.display = 'none';
      };
    }
  }
  
  // Add typing animation for chat messages
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    // For regular interview
    document.querySelectorAll('.message').forEach(message => {
      message.style.opacity = '0';
      setTimeout(() => {
        message.style.opacity = '1';
        message.style.animation = 'fadeIn 0.5s forwards';
      }, 100);
    });
  }
  
  // Add focus effects for form elements
  document.querySelectorAll('textarea, input').forEach(element => {
    element.addEventListener('focus', function() {
      this.parentElement.classList.add('input-focused');
    });
    
    element.addEventListener('blur', function() {
      this.parentElement.classList.remove('input-focused');
    });
  });
  
  // Add smooth scrolling for all links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
});
