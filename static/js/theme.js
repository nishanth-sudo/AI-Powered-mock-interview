// Theme toggle functionality
document.addEventListener("DOMContentLoaded", function() {
  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  
  // Check for saved theme preference or respect OS preference
  const savedTheme = localStorage.getItem('theme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  // Apply saved theme on page load
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.checked = true;
    themeLabel.textContent = 'Light Mode';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.checked = false;
    themeLabel.textContent = 'Dark Mode';
  }
  
  // Theme toggle event listener
  themeToggle.addEventListener('change', function() {
    if (this.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeLabel.textContent = 'Light Mode';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      themeLabel.textContent = 'Dark Mode';
    }
  });
  
  // Add smooth animations for UI elements
  const animateElements = document.querySelectorAll('.interview-card, .mcq-options .option-item, .primary-btn, .secondary-btn');
  animateElements.forEach(element => {
    element.classList.add('animate__animated', 'animate__fadeIn');
  });
  
  // Enhance message display in chat interfaces
  const enhanceMessages = () => {
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
      // Add animation if it doesn't have one already
      if (!message.classList.contains('animate__fadeIn')) {
        message.classList.add('animate__animated', 'animate__fadeIn');
      }
    });
  };
  
  // Call this function initially and also when new messages are added
  enhanceMessages();
  
  // Add hover effects to buttons
  const buttons = document.querySelectorAll('button, .select-btn');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
    });
  });
  
  // Improve focus states for accessibility
  const focusableElements = document.querySelectorAll('button, a, textarea, .option-item');
  focusableElements.forEach(element => {
    element.addEventListener('focus', () => {
      element.style.outline = 'none';
      element.style.boxShadow = '0 0 0 3px rgba(67, 97, 238, 0.5)';
    });
    element.addEventListener('blur', () => {
      element.style.boxShadow = '';
    });
  });
});
