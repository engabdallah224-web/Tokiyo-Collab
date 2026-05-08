import React from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Clock, Users, TrendingUp, BarChart } from 'lucide-react';
import { useParams } from 'react-router-dom';

const MeetingAnalyticsPage = () => {
  const { projectId } = useParams();

  // Mock data for now - will be replaced with real API
  const stats = {
    totalMeetings: 12,
    totalDuration: 480, // minutes
    avgDuration: 40,
    attendanceRate: 85
  };

  const recentMeetings = [
    { id: 1, title: 'Sprint Planning', date: '2024-10-10', duration: 60, participants: 5 },
    { id: 2, title: 'Daily Standup', date: '2024-10-09', duration: 15, participants: 5 },
    { id: 3, title: 'Code Review', date: '2024-10-08', duration: 45, participants: 3 }
  ];

  return (
    <div className="min-h-screen bg-[#f3f3f3] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meeting Analytics</h1>
        <p className="text-gray-600 mt-2">Track team meetings and collaboration</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          whileHover={{ scale: 1.02, y: -4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Meetings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalMeetings}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          whileHover={{ scale: 1.02, y: -4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDuration}m</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-between">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          whileHover={{ scale: 1.02, y: -4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgDuration}m</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          whileHover={{ scale: 1.02, y: -4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Attendance Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.attendanceRate}%</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Meetings</h2>
        <div className="space-y-4">
          {recentMeetings.map((meeting) => (
            <motion.div
              key={meeting.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Video className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {meeting.duration}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.participants}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeetingAnalyticsPage;

