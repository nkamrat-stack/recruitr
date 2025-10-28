import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function CultureSurvey() {
  const getBackendURL = () => {
    if (typeof window === 'undefined') return ''
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8000`
  }
  
  const BACKEND_URL = getBackendURL()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [currentSection, setCurrentSection] = useState(1)

  // Work Style Dimensions (1-10)
  const [paceScore, setPaceScore] = useState(5)
  const [autonomyScore, setAutonomyScore] = useState(5)
  const [communicationScore, setCommunicationScore] = useState(5)
  const [decisionMakingScore, setDecisionMakingScore] = useState(5)
  const [riskToleranceScore, setRiskToleranceScore] = useState(5)
  const [workLocationScore, setWorkLocationScore] = useState(5)
  const [scheduleFlexibilityScore, setScheduleFlexibilityScore] = useState(5)
  const [growthPathScore, setGrowthPathScore] = useState(5)

  // Core Values
  const [selectedValues, setSelectedValues] = useState([])

  // Soft Skills Importance (1-10)
  const [communicationImportance, setCommunicationImportance] = useState(5)
  const [problemSolvingImportance, setProblemSolvingImportance] = useState(5)
  const [adaptabilityImportance, setAdaptabilityImportance] = useState(5)
  const [leadershipImportance, setLeadershipImportance] = useState(5)
  const [technicalDepthImportance, setTechnicalDepthImportance] = useState(5)
  const [collaborationImportance, setCollaborationImportance] = useState(5)

  const AVAILABLE_VALUES = [
    'Accountability', 'Innovation', 'Transparency', 'Excellence',
    'Customer Focus', 'Work-Life Balance', 'Collaboration', 'Integrity', 
    'Diversity', 'Speed', 'Quality', 'Autonomy', 'Mentorship', 'Results', 
    'Creativity', 'Ownership', 'Empathy', 'Growth', 'Impact', 'Learning', 
    'Trust', 'Respect', 'Inclusion', 'Sustainability', 'Efficiency', 
    'Fun', 'Flexibility', 'Courage', 'Humility', 'Teamwork'
  ]

  const WORK_STYLE_DIMENSIONS = [
    {
      key: 'pace',
      label: 'Work Pace',
      question: 'How fast-paced is your work environment?',
      leftLabel: 'Deliberate / Thoughtful',
      rightLabel: 'Fast-paced / Urgent',
      help: 'Does your team take time for careful planning, or move quickly to ship fast?',
      value: paceScore,
      setValue: setPaceScore
    },
    {
      key: 'autonomy',
      label: 'Employee Autonomy',
      question: 'How much autonomy do employees have?',
      leftLabel: 'Heavily Managed',
      rightLabel: 'Self-Directed',
      help: 'Are employees given broad goals and freedom, or specific tasks with oversight?',
      value: autonomyScore,
      setValue: setAutonomyScore
    },
    {
      key: 'communication',
      label: 'Communication Style',
      question: 'How would you describe your communication style?',
      leftLabel: 'Formal / Structured',
      rightLabel: 'Casual / Informal',
      help: 'Do you use formal channels and meetings, or casual Slack messages and hallway chats?',
      value: communicationScore,
      setValue: setCommunicationScore
    },
    {
      key: 'decisionMaking',
      label: 'Decision Making',
      question: 'How are important decisions made?',
      leftLabel: 'Consensus-Driven',
      rightLabel: 'Top-Down',
      help: 'Do teams discuss and agree together, or do leaders make final calls?',
      value: decisionMakingScore,
      setValue: setDecisionMakingScore
    },
    {
      key: 'riskTolerance',
      label: 'Risk Tolerance',
      question: 'How does your company approach risk?',
      leftLabel: 'Conservative / Careful',
      rightLabel: 'Experimental / Bold',
      help: 'Do you prefer proven approaches, or encourage experimentation and learning from failure?',
      value: riskToleranceScore,
      setValue: setRiskToleranceScore
    },
    {
      key: 'workLocation',
      label: 'Work Location',
      question: 'What is your work location policy?',
      leftLabel: 'In-Office',
      rightLabel: 'Fully Remote',
      help: 'Are employees required in the office, hybrid, or fully distributed?',
      value: workLocationScore,
      setValue: setWorkLocationScore
    },
    {
      key: 'scheduleFlexibility',
      label: 'Schedule Flexibility',
      question: 'How flexible are work schedules?',
      leftLabel: 'Fixed Hours',
      rightLabel: 'Fully Flexible',
      help: 'Do you have core hours and strict schedules, or async work and flexible timing?',
      value: scheduleFlexibilityScore,
      setValue: setScheduleFlexibilityScore
    },
    {
      key: 'growthPath',
      label: 'Growth Path',
      question: 'What career growth paths do you support?',
      leftLabel: 'Specialist / Deep',
      rightLabel: 'Generalist / Broad',
      help: 'Do you reward deep expertise in one area, or versatility across multiple domains?',
      value: growthPathScore,
      setValue: setGrowthPathScore
    }
  ]

  const SOFT_SKILLS = [
    {
      key: 'communication',
      label: 'Communication Skills',
      help: 'Clear writing, presentation, and interpersonal skills',
      value: communicationImportance,
      setValue: setCommunicationImportance
    },
    {
      key: 'problemSolving',
      label: 'Problem-Solving Ability',
      help: 'Analytical thinking, debugging, and finding creative solutions',
      value: problemSolvingImportance,
      setValue: setProblemSolvingImportance
    },
    {
      key: 'adaptability',
      label: 'Adaptability',
      help: 'Comfort with change, learning new tools, and pivoting quickly',
      value: adaptabilityImportance,
      setValue: setAdaptabilityImportance
    },
    {
      key: 'leadership',
      label: 'Leadership Potential',
      help: 'Ability to guide teams, mentor others, and drive initiatives',
      value: leadershipImportance,
      setValue: setLeadershipImportance
    },
    {
      key: 'technicalDepth',
      label: 'Technical Depth',
      help: 'Deep expertise, mastery of fundamentals, and system design skills',
      value: technicalDepthImportance,
      setValue: setTechnicalDepthImportance
    },
    {
      key: 'collaboration',
      label: 'Collaboration Skills',
      help: 'Teamwork, empathy, and ability to work across functions',
      value: collaborationImportance,
      setValue: setCollaborationImportance
    }
  ]

  useEffect(() => {
    fetchCultureProfile()
  }, [])

  const fetchCultureProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/company/culture`)
      if (response.ok) {
        const data = await response.json()
        
        // Load Work Style Dimensions
        setPaceScore(data.pace_score || 5)
        setAutonomyScore(data.autonomy_score || 5)
        setCommunicationScore(data.communication_score || 5)
        setDecisionMakingScore(data.decision_making_score || 5)
        setRiskToleranceScore(data.risk_tolerance_score || 5)
        setWorkLocationScore(data.work_location_score || 5)
        setScheduleFlexibilityScore(data.schedule_flexibility_score || 5)
        setGrowthPathScore(data.growth_path_score || 5)
        
        // Load Core Values
        setSelectedValues(data.core_values || [])
        
        // Load Soft Skills Importance
        setCommunicationImportance(data.communication_importance || 5)
        setProblemSolvingImportance(data.problem_solving_importance || 5)
        setAdaptabilityImportance(data.adaptability_importance || 5)
        setLeadershipImportance(data.leadership_importance || 5)
        setTechnicalDepthImportance(data.technical_depth_importance || 5)
        setCollaborationImportance(data.collaboration_importance || 5)
      }
      // If 404, that's fine - new survey
    } catch (err) {
      console.error('Error fetching culture profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleValue = (value) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter(v => v !== value))
    } else {
      if (selectedValues.length < 10) {
        setSelectedValues([...selectedValues, value])
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (selectedValues.length < 5) {
      setError('Please select at least 5 core values')
      return
    }
    
    setSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      const response = await fetch(`${BACKEND_URL}/company/culture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pace_score: paceScore,
          autonomy_score: autonomyScore,
          communication_score: communicationScore,
          decision_making_score: decisionMakingScore,
          risk_tolerance_score: riskToleranceScore,
          work_location_score: workLocationScore,
          schedule_flexibility_score: scheduleFlexibilityScore,
          growth_path_score: growthPathScore,
          core_values: selectedValues,
          communication_importance: communicationImportance,
          problem_solving_importance: problemSolvingImportance,
          adaptability_importance: adaptabilityImportance,
          leadership_importance: leadershipImportance,
          technical_depth_importance: technicalDepthImportance,
          collaboration_importance: collaborationImportance
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save culture profile')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/settings/company')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getProgressPercentage = () => {
    return ((currentSection - 1) / 3) * 100
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔄</div>
          <p className="text-gray-600">Loading culture survey...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/settings/company"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center gap-1"
          >
            ← Back to Company Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Company Culture Survey</h1>
          <p className="text-gray-600 mt-2">
            Help us understand your company culture to better match candidates with your team.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium">Section {currentSection} of 3</span>
            <span className="text-gray-500">
              {currentSection === 1 && 'Work Style Dimensions'}
              {currentSection === 2 && 'Core Values'}
              {currentSection === 3 && 'Soft Skills Importance'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-6 flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h3 className="text-lg font-bold text-green-900">Culture Profile Saved!</h3>
              <p className="text-sm text-green-700">Redirecting to company profile...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Work Style Dimensions */}
          {currentSection === 1 && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Work Style Dimensions</h2>
              <p className="text-gray-600 mb-6">
                Rate each dimension on a scale of 1-10 to describe your company's work style.
              </p>

              <div className="space-y-8">
                {WORK_STYLE_DIMENSIONS.map((dim, idx) => (
                  <div key={dim.key} className="border-b border-gray-200 pb-6 last:border-0">
                    <label className="block font-semibold text-gray-900 mb-2">
                      {idx + 1}. {dim.question}
                    </label>
                    <p className="text-sm text-gray-500 mb-4">{dim.help}</p>
                    
                    <div className="mb-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={dim.value}
                        onChange={(e) => dim.setValue(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{dim.leftLabel}</span>
                      <span className="font-bold text-blue-600 text-lg">{dim.value}</span>
                      <span className="text-gray-600">{dim.rightLabel}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentSection(2)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Next: Core Values →
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Core Values */}
          {currentSection === 2 && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Core Values</h2>
              <p className="text-gray-600 mb-4">
                Select 5-10 values that best represent your company culture.
              </p>
              <div className="mb-6 text-center">
                <span className={`inline-block px-4 py-2 rounded-full font-semibold ${
                  selectedValues.length >= 5 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  Selected {selectedValues.length} of 10 maximum
                  {selectedValues.length < 5 && ' (minimum 5 required)'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {AVAILABLE_VALUES.map((value) => {
                  const isSelected = selectedValues.includes(value)
                  const canSelect = selectedValues.length < 10 || isSelected
                  
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => canSelect && toggleValue(value)}
                      disabled={!canSelect}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : canSelect
                          ? 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSelected && '✓ '}
                      {value}
                    </button>
                  )
                })}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSection(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedValues.length >= 5) {
                      setCurrentSection(3)
                      setError(null)
                    } else {
                      setError('Please select at least 5 core values')
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Next: Soft Skills →
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Soft Skills Importance */}
          {currentSection === 3 && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Soft Skills Importance</h2>
              <p className="text-gray-600 mb-6">
                Rate the importance of each soft skill for candidates joining your team (1-10).
              </p>

              <div className="space-y-8">
                {SOFT_SKILLS.map((skill, idx) => (
                  <div key={skill.key} className="border-b border-gray-200 pb-6 last:border-0">
                    <label className="block font-semibold text-gray-900 mb-2">
                      {idx + 1}. {skill.label}
                    </label>
                    <p className="text-sm text-gray-500 mb-4">{skill.help}</p>
                    
                    <div className="mb-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={skill.value}
                        onChange={(e) => skill.setValue(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Less Important</span>
                      <span className="font-bold text-green-600 text-lg">{skill.value}/10</span>
                      <span className="text-gray-600">Very Important</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSection(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {saving ? 'Saving...' : '✓ Save Culture Profile'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
