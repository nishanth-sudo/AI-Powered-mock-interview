from flask import Flask, render_template, request, jsonify, redirect, url_for, session, make_response
import requests
import logging
import json
import re  # For regex pattern matching
import uuid
import os
from datetime import timedelta, datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
import io
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Required for session
app.permanent_session_lifetime = timedelta(hours=1)  # Session expires after 1 hour
# Setup logging
logging.basicConfig(level=logging.INFO)
# Only use the generate API since we're having issues with the chat API
OLLAMA_API_GENERATE = "http://localhost:11434/api/generate"
MODEL_NAME = "interview:optimized"   # Using optimized model for better performance

# Enhanced request configuration for better performance
REQUEST_CONFIG = {
    "timeout": 45,  # Increased timeout for longer responses
    "stream": False,  # Non-streaming for better error handling
    "options": {
        "temperature": 0.1,
        "top_p": 0.7,
        "top_k": 40,
        "num_predict": 256,
        "repeat_penalty": 1.15,
        "seed": 42  # For consistent responses during testing
    }
}
# Domain-specific interview tips
DOMAIN_TIPS = {
    "Python": [
        "Demonstrate understanding of Python-specific concepts like list comprehensions and generators",
        "Be ready to explain the GIL (Global Interpreter Lock) and its implications",
        "Show knowledge of Python's memory management and garbage collection",
        "Be familiar with popular libraries like NumPy, Pandas, or Django depending on the role"
    ],
    "JavaScript": [
        "Understand JavaScript's event loop and asynchronous programming",
        "Be comfortable explaining closures, prototypes, and 'this' keyword",
        "Demonstrate knowledge of ES6+ features",
        "Be familiar with popular frameworks like React, Vue, or Angular"
    ],
    "Java": [
        "Show understanding of Java's object-oriented principles",
        "Be ready to explain the JVM, garbage collection, and memory management",
        "Demonstrate knowledge of Java collections framework",
        "Be familiar with build tools like Maven or Gradle"
    ],
    "C++": [
        "Demonstrate understanding of memory management and pointers",
        "Show knowledge of C++ specific features like templates and STL",
        "Be ready to discuss efficiency and performance optimizations",
        "Be familiar with modern C++ standards (C++11 and beyond)"
    ],
    "C#": [
        "Show understanding of .NET framework and its components",
        "Demonstrate knowledge of LINQ and asynchronous programming",
        "Be ready to discuss garbage collection in .NET",
        "Be familiar with ASP.NET for web development roles"
    ],
    "SQL": [
        "Be able to write complex queries with joins and subqueries",
        "Demonstrate understanding of indexing and query optimization",
        "Show knowledge of database normalization principles",
        "Be familiar with database transactions and ACID properties"
    ],
    "Data Structures & Algorithms": [
        "Be prepared to analyze the time and space complexity of your solutions",
        "Practice implementing common data structures from scratch",
        "Be ready to optimize brute force solutions",
        "Understand graph algorithms and dynamic programming"
    ],
    "Web Development": [
        "Demonstrate knowledge of HTTP protocol and RESTful APIs",
        "Be familiar with frontend frameworks and backend technologies",
        "Show understanding of responsive design and accessibility",
        "Be ready to discuss web security and common vulnerabilities"
    ]
}

# Default domain and level if not specified
DEFAULT_DOMAIN = "Python"
DEFAULT_LEVEL = "intermediate"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/interview")
def interview():
    # Redirect to the new coding_interview route
    domain = request.args.get("domain", DEFAULT_DOMAIN)
    level = request.args.get("level", DEFAULT_LEVEL)
    return redirect(url_for('coding_interview', domain=domain, level=level))

@app.route("/coding_interview")
def coding_interview():
    # Get the selected domain and level from query parameters
    domain = request.args.get("domain", DEFAULT_DOMAIN)
    level = request.args.get("level", DEFAULT_LEVEL)
    
    # Make sure the domain is valid, default to Python if not
    if domain not in DOMAIN_TIPS:
        domain = DEFAULT_DOMAIN
    
    # Render the coding interview template with the selected domain and level
    return render_template("coding_interview.html", domain=domain, level=level)

@app.route("/technical_interview")
def technical_interview():
    # Get the selected topics and level from query parameters
    topics = request.args.getlist("topics") or ["DBMS"]
    level = request.args.get("level", DEFAULT_LEVEL)
    
    # Render the technical interview template
    return render_template("technical_interview.html", topics=topics, level=level)

def generate_question(domain=None, level=None, previous_questions=None):
    """Generate a clean interview question without any evaluation."""
    try:
        # Initialize previous_questions if None
        if previous_questions is None:
            previous_questions = []
        
        # Create a string of previous questions to avoid
        previous_questions_text = ""
        if previous_questions:
            previous_questions_text = "Previously asked questions (DO NOT REPEAT THESE):\n"
            for idx, q in enumerate(previous_questions):
                previous_questions_text += f"{idx+1}. {q}\n"
        
        prompt = f"""
        You are a technical interviewer for {domain} at the {level} level.
        
        Generate only ONE clear and concise interview question related to {domain}.
        
        {previous_questions_text}
        
        DO NOT repeat any previously asked questions.
        DO NOT include any evaluation, strengths, weaknesses, or scores in your response.
        DO NOT provide an answer to the question.
        DO NOT prefix with 'Question:' - I will add that formatting myself.
        DO NOT include any text about evaluating a previous answer.
        
        The question should be challenging but appropriate for the {level} level.
        Make sure it's a different question than anything previously asked.
        """
        
        response = requests.post(
            OLLAMA_API_GENERATE,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            question_text = response.json().get("response", "").strip()
            
            # Further clean the response to remove any potential evaluation
            if "STRENGTHS:" in question_text:
                question_text = question_text.split("STRENGTHS:")[0].strip()
            if "WEAKNESSES:" in question_text:
                question_text = question_text.split("WEAKNESSES:")[0].strip()
            if "Score:" in question_text:
                question_text = question_text.split("Score:")[0].strip()
            if "Areas to Focus:" in question_text:
                question_text = question_text.split("Areas to Focus:")[0].strip()
            
            # Format the question
            formatted_question = f"<strong class='question-heading'>Question:</strong> {question_text}"
            formatted_question = formatted_question.replace('\n', '<br>')
            
            # Store the raw question text (without formatting) for history tracking
            return formatted_question, question_text
        else:
            return f"<strong class='question-heading'>Question:</strong> Could not generate a question. Error: {response.status_code}", None
    except Exception as e:
        app.logger.error(f"Error generating question: {str(e)}")
        return f"<strong class='question-heading'>Question:</strong> Could not generate a question. Error: {str(e)}", None

@app.route("/start", methods=["GET"])
def start_interview():
    """Start a new interview with a domain-specific programming question"""
    domain = request.args.get("domain", DEFAULT_DOMAIN)
    level = request.args.get("level", DEFAULT_LEVEL)
    
    # Create a new session ID for this interview session
    session_id = str(uuid.uuid4())
    session['interview_id'] = session_id
    session['domain'] = domain
    session['level'] = level
    session['asked_questions'] = []
    session['answers'] = []
    session['scores'] = []
    
    try:
        # Generate only a question, no evaluation
        first_question, raw_question = generate_question(domain, level, [])
        
        if not first_question or "Error:" in first_question:
            # Use fallback question if generation failed
            first_question = f"<strong class='question-heading'>Question:</strong> Welcome to the {domain} interview! What aspects of {domain} are you most comfortable with, and what projects have you built using {domain}?"
            raw_question = f"Welcome to the {domain} interview! What aspects of {domain} are you most comfortable with, and what projects have you built using {domain}?"
        
        # Store the question in session history
        if raw_question:
            session['asked_questions'] = [raw_question]
        
        return jsonify({"reply": first_question, "tips": DOMAIN_TIPS.get(domain, [])})
    
    except Exception as e:
        app.logger.error(f"Error starting interview: {str(e)}")
        fallback_question = f"<strong class='question-heading'>Question:</strong> Welcome to the {domain} interview! What aspects of {domain} are you most comfortable with, and what projects have you built using {domain}?"
        return jsonify({"reply": fallback_question, "tips": DOMAIN_TIPS.get(domain, [])})

def evaluate_answer(answer, domain=None, level=None):
    """Evaluate the candidate's answer with strengths and weaknesses."""
    try:
        prompt = f"""
        You are a technical interviewer for {domain} at the {level} level.
        
        The candidate's answer was: '{answer}'
        
        Evaluate their answer with:
        1. Score: Give a mark out of 10
        2. STRENGTHS: 2-3 positive points about the answer
        3. WEAKNESSES: 2-3 improvement points (label as "Areas to Focus:")
        
        Use a professional but encouraging tone.
        Format your response clearly with headings.
        DO NOT include any questions in your evaluation.
        DO NOT provide the next question - I will handle that separately.
        Just focus on evaluating the answer provided.
        """
        
        response = requests.post(
            OLLAMA_API_GENERATE,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            evaluation_text = response.json().get("response", "").strip()
            
            # Format the evaluation
            evaluation_text = format_evaluation(evaluation_text)
            return evaluation_text
        else:
            return f"<strong>Evaluation Error:</strong> Could not evaluate the answer. Error: {response.status_code}"
    except Exception as e:
        app.logger.error(f"Error evaluating answer: {str(e)}")
        return f"<strong>Evaluation Error:</strong> Could not evaluate the answer. Error: {str(e)}"

@app.route("/technical_question", methods=["POST"])
def get_technical_question():
    """Generate a multiple-choice technical question"""
    topics = request.json.get("topics", ["DBMS"])
    level = request.json.get("level", "intermediate")
    
    # Convert list to comma-separated string for the prompt
    topics_str = ", ".join(topics)
    
    try:
        # Using more structured prompt to ensure proper JSON output
        prompt = f"""
        Create a single multiple-choice technical question about {topics_str} for a {level} level interview.
        
        FOLLOW THIS FORMAT EXACTLY:
        {{
          "question": "A clear, concise question statement",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_index": 0,
          "explanation": "Brief explanation of the correct answer."
        }}
        
        IMPORTANT RULES:
        1. The correct_index must be 0-based (0,1,2,3)
        2. Only include valid JSON - no additional text, code blocks, or comments
        3. Keep options short (1-2 lines each)
        4. Make sure string quotes are properly escaped
        5. Ensure all JSON brackets and quotes are properly closed

        [STOP]
        """
        
        response = requests.post(
            OLLAMA_API_GENERATE,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "raw": True  # Use raw output for better JSON handling
            }
        )
        
        if response.status_code == 200:
            question_text = response.json().get("response", "").strip()
            
            # Clean the response to get valid JSON
            question_text = question_text.replace("```json", "").replace("```", "").strip()
            
            # Remove any non-JSON prefix/suffix text
            json_start = question_text.find('{')
            json_end = question_text.rfind('}')
            
            if json_start >= 0 and json_end >= 0:
                question_text = question_text[json_start:json_end+1]
            
            try:
                # Parse the JSON
                question_data = json.loads(question_text)
                
                # Validate the structure to ensure all required fields exist
                required_fields = ["question", "options", "correct_index", "explanation"]
                if all(field in question_data for field in required_fields):
                    if isinstance(question_data["options"], list) and len(question_data["options"]) >= 3:
                        return jsonify({"question": question_data})
                
                # If structure validation fails, return a predefined fallback question
                fallback_question = {
                    "question": f"Which of the following best describes a key concept in {topics_str}?",
                    "options": [
                        "Option A - This is a placeholder option",
                        "Option B - This is the correct answer about " + topics_str,
                        "Option C - This is another placeholder option",
                        "Option D - This is a final placeholder option"
                    ],
                    "correct_index": 1,
                    "explanation": f"Option B correctly describes a fundamental concept in {topics_str}."
                }
                return jsonify({"question": fallback_question})
                
            except json.JSONDecodeError as e:
                app.logger.error(f"Error parsing JSON: {str(e)}, text: {question_text}")
                # Return a fallback question instead of an error
                fallback_question = {
                    "question": f"Which of the following is true about {topics_str}?",
                    "options": [
                        "First statement - This is a placeholder",
                        "Second statement - This is the correct statement",
                        "Third statement - This is incorrect",
                        "Fourth statement - This is also incorrect"
                    ],
                    "correct_index": 1,
                    "explanation": f"The second statement correctly describes {topics_str}."
                }
                return jsonify({"question": fallback_question})
        else:
            # Return a fallback question if API call fails
            fallback_question = {
                "question": f"What is a primary advantage of using {topics_str}?",
                "options": [
                    "Advantage A - This is a placeholder",
                    "Advantage B - This is the correct answer",
                    "Advantage C - This is incorrect",
                    "Advantage D - This is also incorrect"
                ],
                "correct_index": 1,
                "explanation": "Advantage B provides the most significant benefit in this context."
            }
            return jsonify({"question": fallback_question})
    except Exception as e:
        app.logger.error(f"Error generating technical question: {str(e)}")
        return jsonify({"error": f"Could not generate a question. Error: {str(e)}"})

@app.route("/ask", methods=["POST"])
def ask():
    user_answer = request.json.get("answer", "")
    domain = request.json.get("domain", DEFAULT_DOMAIN)
    level = request.json.get("level", DEFAULT_LEVEL)
    
    # Get session data
    asked_questions = session.get('asked_questions', [])
    answers = session.get('answers', [])
    scores = session.get('scores', [])
    
    try:
        # Step 1: Evaluate the candidate's answer
        evaluation = evaluate_answer(user_answer, domain, level)
        
        # Extract score from evaluation if possible
        score_match = re.search(r'Score:?\s*(\d+(?:\.\d+)?)', evaluation)
        score = float(score_match.group(1)) if score_match else 5.0
        
        # Store answer and score
        answers.append(user_answer)
        scores.append(score)
        session['answers'] = answers
        session['scores'] = scores
        
        # Step 2: Generate a new question, passing the history of questions
        next_question, raw_question = generate_question(domain, level, asked_questions)
        
        # Add the new question to the history if it's valid
        if raw_question and raw_question not in asked_questions:
            asked_questions.append(raw_question)
            session['asked_questions'] = asked_questions
        
        # Combine with clear separation
        combined_response = f"{evaluation}<hr>{next_question}"
        
        return jsonify({"reply": combined_response})
    except Exception as e:
        app.logger.error(f"General error in ask route: {str(e)}")
        return jsonify({"reply": f"I'm having trouble processing your response. Please try again."})

def format_evaluation(evaluation):
    """Format the evaluation response"""
    # Replace plain text bullet points with HTML bullet points
    evaluation = re.sub(r'•\s*', '• ', evaluation)
    # Add HTML styling for better formatting
    evaluation = evaluation.replace("STRENGTHS:", "<strong>STRENGTHS:</strong>")
    evaluation = evaluation.replace("WEAKNESSES:", "<strong>WEAKNESSES:</strong>")
    evaluation = evaluation.replace("Areas to Focus:", "<strong>Areas to Focus:</strong>")
    evaluation = evaluation.replace("Score:", "<strong>Score:</strong>")
    
    # Convert line breaks to HTML breaks
    evaluation = evaluation.replace('\n', '<br>')
    
    return evaluation

@app.route("/end_interview", methods=["POST"])
def end_interview():
    """End the current interview and generate a comprehensive report"""
    try:
        domain = request.json.get("domain", "General")
        level = request.json.get("level", "intermediate")
        
        # Get interview data from session
        interview_id = session.get('interview_id', str(uuid.uuid4()))
        asked_questions = session.get('asked_questions', [])
        answers = session.get('answers', [])
        scores = session.get('scores', [])
        
        # Generate final evaluation
        total_questions = len(asked_questions)
        total_score = sum(scores) if scores else 0
        average_score = (total_score / total_questions) if total_questions > 0 else 0
        
        # Generate comprehensive feedback
        feedback_prompt = f"""
        Generate a comprehensive interview evaluation report for a {domain} interview at {level} level.
        
        Interview Summary:
        - Total Questions: {total_questions}
        - Average Score: {average_score:.1f}/10
        - Domain: {domain}
        - Level: {level}
        
        Provide a professional evaluation with:
        1. Overall Performance Summary
        2. Strengths Demonstrated
        3. Areas for Improvement
        4. Recommendations for Future Learning
        5. Final Assessment (Excellent/Good/Average/Needs Improvement)
        
        Keep it constructive and encouraging.
        """
        
        try:
            response = requests.post(
                OLLAMA_API_GENERATE,
                json={
                    "model": MODEL_NAME,
                    "prompt": feedback_prompt,
                    "stream": False
                },
                timeout=15
            )
            
            if response.status_code == 200:
                comprehensive_feedback = response.json().get("response", "").strip()
            else:
                comprehensive_feedback = generate_fallback_report(domain, level, average_score, total_questions)
        except:
            comprehensive_feedback = generate_fallback_report(domain, level, average_score, total_questions)
        
        # Store report data in session for download
        report_data = {
            'interview_id': interview_id,
            'domain': domain,
            'level': level,
            'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'total_questions': total_questions,
            'average_score': average_score,
            'questions': asked_questions,
            'answers': answers,
            'scores': scores,
            'feedback': comprehensive_feedback
        }
        
        session['report_data'] = report_data
        
        # Return formatted response for display
        evaluation_html = f"""
        <div class="interview-summary">
            <h2><i class="fas fa-chart-bar"></i> Interview Complete!</h2>
            <div class="score-summary">
                <div class="score-circle">
                    <span class="score">{average_score:.1f}</span>
                    <span class="score-label">Average Score</span>
                </div>
            </div>
            <div class="summary-stats">
                <p><strong>Domain:</strong> {domain}</p>
                <p><strong>Level:</strong> {level}</p>
                <p><strong>Questions Answered:</strong> {total_questions}</p>
                <p><strong>Interview Date:</strong> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            </div>
            <div class="feedback-section">
                <h3>Comprehensive Feedback</h3>
                <p>{comprehensive_feedback.replace(chr(10), '<br>')}</p>
            </div>
            <div class="action-buttons">
                <button id="downloadReport" class="primary-btn">
                    <i class="fas fa-download"></i> Download Report
                </button>
                <button onclick="window.location.href='/'" class="secondary-btn">
                    <i class="fas fa-home"></i> Back to Home
                </button>
            </div>
        </div>
        """
        
        return jsonify({
            "evaluation": evaluation_html,
            "score": f"{average_score:.1f}/10",
            "feedback": comprehensive_feedback,
            "can_download": True
        })
        
    except Exception as e:
        app.logger.error(f"Error ending interview: {str(e)}")
        return jsonify({
            "evaluation": "Thank you for completing the interview! Your performance summary is being generated.",
            "score": "N/A",
            "feedback": "Interview completed successfully."
        })

def generate_fallback_report(domain, level, average_score, total_questions):
    """Generate a fallback report when AI generation fails"""
    performance_level = "Excellent" if average_score >= 8 else "Good" if average_score >= 6 else "Average" if average_score >= 4 else "Needs Improvement"
    
    return f"""
    **Overall Performance:** {performance_level}
    
    **Summary:** You completed {total_questions} questions in the {domain} interview at {level} level with an average score of {average_score:.1f}/10.
    
    **Strengths:** You demonstrated good problem-solving approach and technical understanding in several areas.
    
    **Areas for Improvement:** Continue practicing core concepts and consider working on more complex scenarios.
    
    **Recommendations:** Keep practicing {domain} concepts, work on personal projects, and consider reviewing fundamental principles.
    
    **Final Assessment:** {performance_level} - Keep up the good work and continue learning!
    """

@app.route("/download_report")
def download_report():
    """Generate and download PDF report"""
    try:
        report_data = session.get('report_data')
        if not report_data:
            return jsonify({"error": "No report data found. Please complete an interview first."}), 404
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title = Paragraph(f"Technical Interview Report - {report_data['domain']}", styles['Title'])
        story.append(title)
        story.append(Spacer(1, 0.2*inch))
        
        # Interview Details
        details = f"""
        <b>Interview ID:</b> {report_data['interview_id']}<br/>
        <b>Domain:</b> {report_data['domain']}<br/>
        <b>Level:</b> {report_data['level']}<br/>
        <b>Date:</b> {report_data['date']}<br/>
        <b>Total Questions:</b> {report_data['total_questions']}<br/>
        <b>Average Score:</b> {report_data['average_score']:.1f}/10
        """
        story.append(Paragraph(details, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Feedback Section
        feedback_title = Paragraph("Comprehensive Feedback", styles['Heading2'])
        story.append(feedback_title)
        story.append(Spacer(1, 0.1*inch))
        
        feedback_text = report_data['feedback'].replace('\n', '<br/>')
        story.append(Paragraph(feedback_text, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Questions and Scores (if available)
        if report_data.get('questions') and report_data.get('scores'):
            qa_title = Paragraph("Question Performance", styles['Heading2'])
            story.append(qa_title)
            story.append(Spacer(1, 0.1*inch))
            
            for i, (question, score) in enumerate(zip(report_data['questions'], report_data['scores'])):
                qa_text = f"<b>Q{i+1}:</b> {question}<br/><b>Score:</b> {score}/10<br/><br/>"
                story.append(Paragraph(qa_text, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Create response
        response = make_response(buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=interview_report_{report_data["interview_id"]}.pdf'
        
        return response
        
    except Exception as e:
        app.logger.error(f"Error generating PDF report: {str(e)}")
        return jsonify({"error": "Failed to generate report"}), 500
    
    return evaluation
    
    return evaluation
if __name__ == "__main__":
    app.run(debug=True)
