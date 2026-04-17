# ResumeIQ - AI-Powered Resume Analyzer

A sophisticated Resume Analysis application built with React and Vite, powered by Claude AI. Upload your resume for deep analysis including scores, ATS checks, rewrites, job matches, and more.

## Features

✨ **Comprehensive Resume Analysis**
- Overall quality score (0-100)
- 5-dimension category breakdown: formatting, content, impact, keywords, completeness
- Detailed strengths and improvement suggestions
- Grammar and formatting corrections

🎯 **ATS Compatibility Check**
- ATS score and recommendations
- Keyword analysis for Applicant Tracking Systems
- Missing keywords identification

✦ **STAR-Method Bullet Rewrites**
- AI-powered rewrite of weak bullet points
- Strong action verbs and industry impact
- Situation-Task-Action-Result framework

💼 **Job Matching**
- Curated job suggestions based on resume profile
- Match percentage for each position
- Top hiring companies for matched roles

⊕ **JD Matcher**
- Match resume against specific job descriptions
- Keywords analysis (matched vs. missing)
- Tailoring recommendations

📝 **Cover Letter Generator**
- Auto-generate tailored cover letters
- Input job title/company info
- Copy-ready text

§ **Professional Summary Generator**
- AI-generated compelling summaries
- Tailored to resume content
- 3-4 sentence format

◎ **Skills Gap Analysis**
- Identify missing in-demand skills
- Importance levels (high/medium)
- Recommended courses/resources

ℓ **LinkedIn Optimization Tips**
- Profile enhancement suggestions
- Keyword strategies
- Visibility improvements

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Anthropic API key (get one at https://console.anthropic.com)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your Anthropic API key
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

⚠️ **Important:** The app currently makes API calls directly from the browser. For production, you should implement a backend proxy to keep your API key secure.

### Running the Application

```bash
npm run dev
```

The application will open at `http://localhost:5173/`

### Building for Production

```bash
npm run build
```

Preview the build:
```bash
npm run preview
```

## How to Use

1. **Upload Resume**
   - Drag and drop a resume file (TXT, PDF, DOC, DOCX)
   - Or paste text directly

2. **Configure Analysis**
   - Select target region (Auto-detect, India, USA/Canada, UK/Europe)
   - Select experience level (Auto-detect, Fresher, Mid-level, Senior)

3. **Review Results**
   - Navigate through 11 different analysis tabs
   - Explore scores, improvements, corrections
   - Generate cover letters and summaries
   - View job matches and skill gaps

4. **Export & Apply**
   - Copy generated content (cover letters, summaries)
   - Use recommendations to improve your resume
   - Match against specific job descriptions

## Technology Stack

- **Frontend:** React 18.2
- **Build Tool:** Vite 5.0
- **AI Engine:** Anthropic Claude (API)
- **Styling:** CSS-in-JS (inline styles)
- **Design:** Modern glassmorphism UI with gradient accents

## Project Structure

```
resume-analyzer/
├── src/
│   ├── App.jsx        # Main application component
│   └── main.jsx       # React entry point
├── index.html         # HTML entry point
├── vite.config.js     # Vite configuration
├── package.json       # Dependencies
├── .env.example       # Environment variable template
└── README.md          # This file
```

## API Integration

The app uses the Anthropic API (`claude-sonnet-4-20250514` model) to:
- Analyze resume content and structure
- Generate ATS scores and feedback
- Rewrite resume bullets
- Suggest job matches
- Generate cover letters
- Create professional summaries
- Analyze job description matches

**Note:** Each analysis call costs API credits. Monitor your usage in the Anthropic dashboard.

## Features Breakdown

### Resume Analysis Tabs

| Tab | Purpose |
|-----|---------|
| Overview | High-level resume assessment with category scores |
| ATS Check | Applicant Tracking System compatibility analysis |
| Rewrites | STAR-method bullet point improvements |
| Skills Gap | Missing skills and learning resources |
| Improve | Actionable improvement suggestions |
| Corrections | Grammar, formatting, and content fixes |
| Job Matches | AI-curated job recommendations |
| LinkedIn | Profile optimization tips |
| JD Matcher | Match against specific job descriptions |
| Cover Letter | Auto-generate tailored cover letters |
| Summary | Create compelling professional summaries |

## Styling & Design

The application features:
- Dark theme with teal, blue, amber, and rose accent colors
- Glassmorphism cards with backdrop blur effects
- Smooth animations and transitions
- Responsive grid layouts
- Custom fonts (Instrument Serif, Outfit)
- SVG-based circular progress indicators

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Requires JavaScript enabled

## Performance Considerations

- Large resume files (>8000 chars) are truncated for API calls
- Animations use CSS for better performance
- Lazy-loaded tab content
- Optimized re-renders with React hooks

## Security Notes

⚠️ **Important Security Warning:**
The current implementation sends your API key from the browser. For production:
1. Create a backend endpoint to handle API calls
2. Never expose your API key in client-side code
3. Implement rate limiting and usage monitoring
4. Add authentication if distributing wider

## Troubleshooting

### "Analysis failed" errors
- Check your API key is valid
- Verify your Anthropic account has credits
- Ensure the resume text is valid

### Port 5173 already in use
```bash
# Use a different port
npm run dev -- --port 3000
```

### Build size concerns
- Consider code-splitting for production
- Tree-shake unused CSS
- Minify inline styles

## Future Enhancements

- [ ] PDF parsing with OCR
- [ ] Real-time score updates
- [ ] Resume template suggestions
- [ ] Career path recommendations
- [ ] Salary insights
- [ ] Interview preparation tips
- [ ] LinkedIn/GitHub integration
- [ ] Batch resume analysis
- [ ] Multi-language support
- [ ] Custom analysis templates

## License

Built with ❤️ for job seekers everywhere

## Credits

- AI Analysis: Anthropic Claude
- Original Design: Sayan Das
- Built with: React + Vite

## Support

For issues or questions:
1. Check this README
2. Review the app's error messages
3. Check your Anthropic API dashboard
4. Verify your network connection

---

**Ready to land your dream job? Upload your resume now! 🚀**
