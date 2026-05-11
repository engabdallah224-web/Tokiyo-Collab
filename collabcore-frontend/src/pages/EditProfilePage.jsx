import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, User, Code, Camera, ArrowLeft, Plus, Upload, Search, ChevronDown } from 'lucide-react';
import { WORLD_UNIVERSITIES } from '../data/universities';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { authAPI, uploadAPI, userAPI } from '../services/api';
import { fetchUserProfile, uploadUserProfileImage, deleteUserProfileImage } from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Trash2 } from 'lucide-react';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  // Fetch current user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      if (authUser?.uid) {
        const profile = await fetchUserProfile(authUser.uid);
        if (profile) return { user: profile };
      }
      return null;
    },
    retry: 1,
  });

  const user = userData?.user;

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    skills: [],
    avatar_url: '',
    banner_url: '',
    university: ''
  });

  const [newSkill, setNewSkill] = useState('');
  const [uploadingField, setUploadingField] = useState('');
  const [uniSearch, setUniSearch] = useState('');
  const [uniDropdownOpen, setUniDropdownOpen] = useState(false);
  const uniRef = useRef(null);

  // Close university dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (uniRef.current && !uniRef.current.contains(e.target)) {
        setUniDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        bio: user.bio || '',
        skills: user.skills || [],
        avatar_url: user.avatar_url || '',
        banner_url: user.banner_url || '',
        university: user.university || ''
      });
      setUniSearch(user.university || '');
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (!authUser?.uid) throw new Error('User not found');
      
      // Update Firestore
      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          ...data,
          uid: authUser.uid,
          email: authUser.email || auth.currentUser?.email || '',
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      return { ...data, uid: authUser.uid };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['current-user']);
      navigate('/profile');
    },
    onError: (error) => {
      alert(error.message || 'Failed to update profile');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleImageSelect = async (field, file) => {
    if (!file || !user?.uid) return;
    
    setUploadingField(field);
    try {
      const type = field === 'avatar_url' ? 'profile' : 'banner';
      const downloadURL = await uploadUserProfileImage(user.uid, file, type);
      setFormData(prev => ({ ...prev, [field]: downloadURL }));
      queryClient.invalidateQueries(['current-user']);
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Failed to upload image: ${err.message || 'Unknown error'}. Please check your Firebase Storage Rules.`);
    } finally {
      setUploadingField('');
    }
  };

  const handleImageDelete = async (field) => {
    if (!user?.uid) return;
    
    const confirmDelete = window.confirm('Are you sure you want to remove this photo?');
    if (!confirmDelete) return;

    setUploadingField(field);
    try {
      const type = field === 'avatar_url' ? 'profile' : 'banner';
      await deleteUserProfileImage(user.uid, type);
      setFormData(prev => ({ ...prev, [field]: '' }));
      queryClient.invalidateQueries(['current-user']);
    } catch (err) {
      alert('Failed to remove image.');
    } finally {
      setUploadingField('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/profile"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-red-600 mb-4 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
            <p className="text-gray-600 text-sm">Update your personal information and settings</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover & Profile Pictures Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Camera className="h-5 w-5 text-red-600" />
              Profile Images
            </h2>
            
            {/* Banner Image */}
            <div className="mb-10">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Cover/Banner Image
              </label>
              <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 hover:border-red-400 transition-all">
                <div className="h-48 w-full bg-gray-50 flex items-center justify-center overflow-hidden">
                  {formData.banner_url ? (
                    <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-medium">No banner image uploaded</p>
                    </div>
                  )}
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <label className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-red-600 hover:text-white transition-all shadow-lg flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {uploadingField === 'banner_url' ? 'Uploading...' : 'Change Banner'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect('banner_url', e.target.files?.[0])} />
                    </label>
                    {formData.banner_url && (
                      <button type="button" onClick={() => handleImageDelete('banner_url')} className="bg-red-600 text-white p-2.5 rounded-xl hover:bg-red-700 transition-all shadow-lg">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                {uploadingField === 'banner_url' && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-bold text-red-600">Uploading Banner...</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3 font-medium italic">Recommended size: 1200x300px (Max 5MB)</p>
            </div>

            {/* Profile Picture */}
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative group">
                <div className="h-40 w-40 rounded-3xl bg-gray-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-gray-300" />
                  )}
                  
                  {/* Upload Overlay */}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-2">
                    <Camera className="h-8 w-8" />
                    <span>CHANGE PHOTO</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect('avatar_url', e.target.files?.[0])} />
                  </label>
                </div>
                
                {uploadingField === 'avatar_url' && (
                  <div className="absolute inset-0 bg-white/80 rounded-3xl flex items-center justify-center">
                    <div className="h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold text-gray-900">Profile Picture</h3>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  A professional photo helps you build trust and connect with potential collaborators.
                </p>
                <div className="flex gap-3 mt-1">
                  <label className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-red-700 transition-all shadow-md inline-flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect('avatar_url', e.target.files?.[0])} />
                  </label>
                  {formData.avatar_url && (
                    <button type="button" onClick={() => handleImageDelete('avatar_url')} className="bg-gray-100 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all border border-gray-200 inline-flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-red-600" />
              Personal Information
            </h2>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* University (Searchable dropdown) */}
              <div ref={uniRef}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  University
                </label>
                <div className="relative">
                  <div
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-red-500 flex items-center gap-2 bg-white cursor-text"
                    onClick={() => setUniDropdownOpen(true)}
                  >
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={uniSearch}
                      onChange={(e) => {
                        setUniSearch(e.target.value);
                        setUniDropdownOpen(true);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, university: '' }));
                        }
                      }}
                      onFocus={() => setUniDropdownOpen(true)}
                      placeholder="Search for your university..."
                      className="flex-1 outline-none text-sm bg-transparent"
                    />
                    {formData.university && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUniSearch('');
                          setFormData(prev => ({ ...prev, university: '' }));
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${uniDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {uniDropdownOpen && (() => {
                      const filtered = WORLD_UNIVERSITIES.filter(u =>
                        u.toLowerCase().includes(uniSearch.toLowerCase())
                      ).slice(0, 50);
                      return filtered.length > 0 ? (
                        <motion.ul
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto"
                        >
                          {filtered.map((uni, idx) => (
                            <li
                              key={idx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFormData(prev => ({ ...prev, university: uni }));
                                setUniSearch(uni);
                                setUniDropdownOpen(false);
                              }}
                              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-red-50 hover:text-red-700 ${
                                formData.university === uni ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-700'
                              }`}
                            >
                              {uni}
                            </li>
                          ))}
                        </motion.ul>
                      ) : null;
                    })()}
                  </AnimatePresence>
                </div>
                {formData.university && (
                  <p className="text-xs text-green-600 mt-1 font-medium">✓ {formData.university}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-500 mt-1">Brief description for your profile</p>
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Code className="h-5 w-5 text-red-600" />
              Skills
            </h2>

            {/* Add Skill Input */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill (e.g., React, Python)"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
              <motion.button
                type="button"
                onClick={addSkill}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 shadow-md transition-all flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="h-4 w-4" />
                Add
              </motion.button>
            </div>

            {/* Skills List */}
            <div className="flex flex-wrap gap-2">
              {formData.skills.length > 0 ? (
                formData.skills.map((skill, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg border border-gray-200"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No skills added yet. Add your first skill above!</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Link to="/profile">
              <motion.button
                type="button"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 shadow-md transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </Link>
            <motion.button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              whileHover={{ scale: updateProfileMutation.isPending ? 1 : 1.02 }}
              whileTap={{ scale: updateProfileMutation.isPending ? 1 : 0.98 }}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
