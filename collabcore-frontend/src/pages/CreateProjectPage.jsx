import { useState } from 'react';
import { Rocket, Tag, Plus, X, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { projectAPI } from '../services/api';
import { auth, db } from '../config/firebase';
import { createProjectInFirestore } from '../services/firestoreService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: [],
    team_size_limit: 5,
    category: 'research',
    difficulty: 'intermediate',
    duration: '',
    tags: [],
    repository_url: '',
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentTag, setCurrentTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addSkill = () => {
    if (currentSkill.trim() && !formData.required_skills.includes(currentSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, currentSkill.trim()],
      }));
      setCurrentSkill('');
    }
  };

  const removeSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s !== skill),
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const projectData = {
      title: formData.title,
      description: formData.description,
      required_skills: formData.required_skills,
      team_size_limit: parseInt(formData.team_size_limit),
      category: formData.category,
      difficulty: formData.difficulty,
      duration: formData.duration || 'flexible',
      tags: formData.tags,
      repository_url: formData.repository_url?.trim() || '',
    };

    try {
      // Try backend first
      console.log('Attempting to create project via backend...');
      const response = await projectAPI.createProject(projectData);
      if (response.data.project_id) {
        console.log('✅ Project created via backend:', response.data.project_id);
        navigate(`/projects/${response.data.project_id}/workspace`);
      } else {
        navigate('/projects');
      }
    } catch (err) {
      console.warn('⚠️ Backend submission failed, trying direct Firestore write:', err.message);
      
      try {
        const result = await createProjectInFirestore(projectData);
        console.log('✅ Project created via Firestore (fallback):', result.id);
        
        // Brief delay to allow Firestore to propagate
        setTimeout(() => {
          navigate(`/projects/${result.id}/workspace`);
        }, 500);
        return;
      } catch (firestoreErr) {
        console.error('❌ Firestore direct write failed:', firestoreErr);
        setError(`Failed to create project: ${firestoreErr.message || 'Please check your connection.'}`);
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <div className="container mx-auto px-4 max-w-6xl py-6">
        {/* Header */}
        <div
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-600 rounded-xl mb-3">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create New Project
          </h1>
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-red-500" />
            Share your project idea and find amazing teammates
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4"
          >
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form Container */}
        <div
          className="bg-white rounded-xl shadow-md border border-gray-200"
        >
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Project Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    placeholder="e.g., AI-Powered Study Assistant"
                    required
                  />
                </div>

                {/* Category & Difficulty */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                      required
                    >
                      <option value="web_development">Web Development</option>
                      <option value="mobile_development">Mobile Development</option>
                      <option value="machine_learning">Machine Learning</option>
                      <option value="data_science">Data Science</option>
                      <option value="blockchain">Blockchain</option>
                      <option value="research">Research</option>
                      <option value="design">Design</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty *
                    </label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                      required
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      name="team_size_limit"
                      min="2"
                      max="20"
                      value={formData.team_size_limit}
                      onChange={handleChange}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-red"
                    />
                    <span className="text-lg font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg min-w-[3rem] text-center">
                      {formData.team_size_limit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum team members (including you)
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Duration
                  </label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  >
                    <option value="">Select duration</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="2-3 months">2-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6+ months">6+ months</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all resize-none text-sm"
                    placeholder="Describe your project, what you're building, and what you hope to achieve..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific about your project goals and what makes it unique
                  </p>
                </div>

                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                      placeholder="e.g., Python, React, Machine Learning..."
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                  {formData.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg border border-red-200"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="p-0.5 hover:bg-red-200 rounded-full transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                      placeholder="e.g., AI, Education, Social Impact..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Repository URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Repository URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="repository_url"
                    value={formData.repository_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    placeholder="https://github.com/username/repository"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link your GitHub repository so collaborators can view your code.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="col-span-1 lg:col-span-2 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectPage;

