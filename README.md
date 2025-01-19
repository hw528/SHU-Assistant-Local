# SHU-Assistant

## Overview
SHU-Assistant is an intelligent campus information assistant designed for Shanghai University students. It leverages Large Language Models (LLM) and Retrieval-Augmented Generation (RAG) to provide accurate and context-aware responses about campus life, including dining halls, library services, and campus facilities.

## Features
- **Real-time Streaming Responses**: Implements Server-Sent Events (SSE) for smooth conversation flow
- **Intelligent Image Integration**: Dynamically matches and displays relevant campus images
- **Multi-modal Interaction**: Supports both text and voice input
- **Responsive Design**: Adapts seamlessly to different screen sizes
- **Rich Text Formatting**: Markdown support for better readability

## Tech Stack
### Frontend
- HTML5/CSS3
- JavaScript (ES6+)
- Tailwind CSS
- Marked.js for Markdown rendering
- Voice recognition integration

### Backend
- Python
- DeepSeek API for LLM capabilities
- FAISS for vector similarity search
- FastAPI/Flask for web framework
- RAG system for knowledge retrieval

## Architecture
The system follows a three-tier architecture:
1. **Presentation Layer**: Responsive web interface
2. **Business Layer**: RAG system and dialogue management
3. **Data Layer**: Knowledge base and image resource management

## Getting Started
1. Clone the repository
```bash
git clone https://github.com/yourusername/shu-assistant.git
```

2. Install dependencies
```bash
pip install -r requirements.txt
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Add your API keys and configuration
```

4. Run the application
```bash
cd SHU-Assistant-Local
uvicorn backend.main:app --reload

#another terminal
cd frontend
python3 -m http.server 3000
```

## Usage
- Access the web interface at `http://localhost:3000`
- Use the quick access buttons for common queries
- Type your questions or use voice input
- View campus images in the integrated image viewer

## Project Structure
```
shu-assistant/
├── backend/
│   ├── main.py
│   ├── rag.py
│   └── utils/
├── frontend/
│   ├── index.html
│   ├── chat.html
│   ├── css/
│   └── js/
└── data/
    ├── knowledge_base/
    └── images/
```

## Contributing
We welcome contributions! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

