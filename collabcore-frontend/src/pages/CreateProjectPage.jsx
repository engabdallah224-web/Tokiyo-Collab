import { useState } from 'react';
import { motion } from 'framer-motion';
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
      const response = await projectAPI.createProject(projectData);
      if (response.data.project_id) {
        navigate(`/projects/${response.data.project_id}/workspace`);
      } else {
        navigate('/projects');
      }
    } catch (err) {
      console.error('Backend submission failed:', err);
      
      // If backend is unreachable or returns 404/500, fallback to direct Firestore write
      // This ensures the app works even if the local Python backend isn't running
      try {
        const result = await createProjectInFirestore(projectData);
        console.log('Successfully saved to Firestore (fallback):', result.id);
        navigate(`/projects/${result.id}/workspace`);
        return;
      } catch (firestoreErr) {
        console.error('Firestore direct write failed:', firestoreErr);
        setError(`Failed to create project: ${firestoreErr.message || 'Please check your connection.'}`);
        setLoading(false);
        return;
      }
    }
 finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <div className="container mx-auto px-4 max-w-6xl py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
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
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4"
          >
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                    <motion.button
                      type="button"
                      onClick={addSkill}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </motion.button>
                  </div>
                  {formData.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.required_skills.map((skill, index) => (
                        <motion.span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg border border-red-200"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          layout
                        >
                          {skill}
                          <motion.button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="p-0.5 hover:bg-red-200 rounded-full transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="h-3 w-3" />
                          </motion.button>
                        </motion.span>
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
                    <motion.button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </motion.button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <motion.span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          layout
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <motion.button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="h-3 w-3" />
                          </motion.button>
                        </motion.span>
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
                <motion.button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
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
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateProjectPage;

