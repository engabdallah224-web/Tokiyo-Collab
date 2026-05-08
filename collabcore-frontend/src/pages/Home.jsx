import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCallback } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  CheckCircle,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Github,
  Zap,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

const Home = () => {
  const { isAuthenticated } = useAuth();

  // Particles initialization
  const particlesInit = useCallback(async (engine) => {
    console.log("Initializing particles...");
    await loadSlim(engine);
    console.log("Particles initialized!");
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    console.log("Particles loaded:", container);
  }, []);

  // Simplified Particles configuration for debugging
  const particlesConfig = {
    particles: {
      number: {
        value: 50,
      },
      color: {
        value: "#ffffff",
      },
      shape: {
        type: "circle",
      },
      opacity: {
        value: 1,
      },
      size: {
        value: 5,
      },
      links: {
        enable: true,
        distance: 150,
        color: "#ffffff",
        opacity: 0.8,
        width: 2,
      },
      move: {
        enable: true,
        speed: 2,
      },
    },
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: "repulse",
        },
      },
    },
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const scaleIn = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-black from-blue-600 via-purple-600 to-purple-700 text-white py-12 md:py-20 px-4 overflow-hidden relative">
        {/* Particles Background - CSS Fallback */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}>
          {/* CSS Particles */}
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 6 + 2 + 'px',
                height: Math.random() * 6 + 2 + 'px',
                backgroundColor: 'white',
                borderRadius: '50%',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.8 + 0.2,
                animation: `float ${Math.random() * 4 + 2}s ease-in-out infinite alternate`,
                animationDelay: 2 * i + 's'
              }}
            />
          ))}

          {/* Try tsparticles as well */}
          <Particles
            id="tsparticles"
            init={particlesInit}
            loaded={particlesLoaded}
            options={particlesConfig}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
        </div>

        {/* Add CSS keyframes */}
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            25% { transform: translateY(-15px) translateX(15px) rotate(90deg); }
            50% { transform: translateY(-30px) translateX(-10px) rotate(180deg); }
            75% { transform: translateY(-15px) translateX(-20px) rotate(270deg); }
            100% { transform: translateY(0px) translateX(0px) rotate(360deg); }
          }
        `}</style>

        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-3 pointer-events-none" style={{ zIndex: 2 }}>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="container mx-auto max-w-6xl relative" style={{ zIndex: 20 }}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.h1 
                variants={itemVariants}
                className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6 leading-tight"
              >
                Connect. Collaborate. Create.
              </motion.h1>
              <motion.p 
                variants={itemVariants}
                className="text-base sm:text-xl text-blue-100 mb-6 md:mb-8"
              >
                The premier platform for students to discover projects, find teammates, 
                and build amazing things together.
              </motion.p>
              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4"
              >
                {isAuthenticated ? (
                  <Link to="/discovery">
                    <motion.div
                      className="inline-flex items-center justify-center bg-white px-8 py-4 rounded-lg font-semibold shadow-lg cursor-pointer"
                      style={{
                        color: 'rgb(200, 16, 47)'
                      }}
                      whileHover={{
                        scale: 1.05,
                        y: -4,
                        backgroundColor: 'rgb(200, 16, 47)',
                        color: 'rgb(255, 255, 255)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </motion.div>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <motion.div
                        className="inline-flex items-center justify-center text-white px-8 py-4 rounded-lg font-semibold shadow-lg cursor-pointer"
                        style={{
                          backgroundColor: 'rgb(200, 16, 47)'
                        }}
                        whileHover={{
                          scale: 1.05,
                          y: -4,
                          backgroundColor: 'rgb(255, 255, 255)',
                          color: 'rgb(200, 16, 47)',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        Get Started Free
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </motion.div>
                    </Link>
                    <Link to="/login">
                      <motion.div
                        className="inline-flex items-center justify-center bg-white px-8 py-4 rounded-lg font-semibold shadow-lg cursor-pointer"
                        style={{
                          color: 'rgb(200, 16, 47)'
                        }}
                        whileHover={{
                          scale: 1.05,
                          y: -4,
                          backgroundColor: 'rgb(200, 16, 47)',
                          color: 'rgb(255, 255, 255)',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        Sign In
                      </motion.div>
                    </Link>
                  </>
                )}
              </motion.div>
              <motion.div 
                variants={itemVariants}
                className="mt-6 md:mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-blue-100 text-sm sm:text-base"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>No credit card</span>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={scaleIn}
              className="relative hidden sm:block"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-8 border border-white/20">
                <motion.div 
                  className="grid grid-cols-2 gap-3 sm:gap-4"
                  variants={containerVariants}
                >
                  {[
                    { icon: Users, count: '10K+', label: 'Active Students' },
                    { icon: TrendingUp, count: '5K+', label: 'Projects' },
                    { icon: MessageSquare, count: '50K+', label: 'Collaborations' },
                    { icon: Sparkles, count: '98%', label: 'Success Rate' },
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                      className="bg-white/10 p-4 sm:p-6 rounded-xl"
                    >
                      <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 mb-2" />
                      <div className="text-xl sm:text-2xl font-bold">{stat.count}</div>
                      <div className="text-blue-100 text-sm sm:text-base">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={fadeInUp}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to collaborate
            </h2>
            <p className="text-base sm:text-xl text-gray-600">
              Powerful features designed for student collaboration
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={containerVariants}
          >
            {[
              {
                gradient: 'from-red-25 to-red-50',
                iconBg: '',
                iconBgStyle: { backgroundColor: 'rgba(200, 16, 47, 0.1)' },
                iconStyle: { color: 'rgb(200, 16, 47)' },
                icon: Search,
                title: 'AI-Powered Matching',
                description: 'Our semantic search engine matches you with perfect projects and teammates based on your skills and interests.'
              },
              {
                gradient: 'from-red-25 to-red-50',
                iconBg: '',
                iconBgStyle: { backgroundColor: 'rgba(200, 16, 47, 0.1)' },
                iconStyle: { color: 'rgb(200, 16, 47)' },
                icon: MessageSquare,
                title: 'Real-Time Collaboration',
                description: 'Chat with your team, share files, manage tasks, and track progress all in one place.'
              },
              {
                gradient: 'from-red-25 to-red-50',
                iconBg: '',
                iconBgStyle: { backgroundColor: 'rgba(200, 16, 47, 0.1)' },
                iconStyle: { color: 'rgb(200, 16, 47)' },
                icon: Users,
                title: 'Build Your Network',
                description: 'Connect with talented students, earn endorsements, and build a portfolio that stands out.'
              },
              {
                gradient: 'from-red-25 to-red-50',
                iconBg: '',
                iconBgStyle: { backgroundColor: 'rgba(200, 16, 47, 0.1)' },
                iconStyle: { color: 'rgb(200, 16, 47)' },
                icon: Github,
                title: 'GitHub Integration',
                description: 'Link your repositories, track commits, and manage pull requests seamlessly.'
              },
              {
                gradient: 'from-red-25 to-red-50',
                iconBg: '',
                iconBgStyle: { backgroundColor: 'rgba(200, 16, 47, 0.1)' },
                iconStyle: { color: 'rgb(200, 16, 47)' },
                icon: Zap,
                title: 'Fast & Efficient',
                description: 'Lightning-fast performance with real-time updates to keep your projects moving forward.'
              },
              {
                gradient: 'from-red-25 to-red-50',
                iconBg: '',
                iconBgStyle: { backgroundColor: 'rgba(200, 16, 47, 0.1)' },
                iconStyle: { color: 'rgb(200, 16, 47)' },
                icon: Shield,
                title: 'Secure & Private',
                description: 'Your data is protected with enterprise-grade security and privacy controls.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className={`${feature.gradient} p-5 sm:p-8 rounded-2xl cursor-pointer`}
                style={{ backgroundColor: 'rgba(200, 16, 47, 0.02)' }}
              >
                <motion.div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4`}
                  style={feature.iconBgStyle}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <feature.icon className="h-6 w-6" style={feature.iconStyle} />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-700">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={fadeInUp}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-xl text-gray-700">
              Start collaborating in three simple steps
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={containerVariants}
          >
            {[
              {
                number: 1,
                color: 'bg-red-600',
                title: 'Create Your Profile',
                description: 'Sign up and showcase your skills, interests, and previous projects to attract the right opportunities.'
              },
              {
                number: 2,
                color: 'bg-black',
                colorStyle: {},
                numberStyle: { color: 'white' },
                title: 'Discover & Apply',
                description: 'Browse projects tailored to your skills or post your own. Apply to opportunities that excite you.'
              },
              {
                number: 3,
                color: 'bg-red-600',
                title: 'Collaborate & Build',
                description: 'Work with your team using our collaboration tools. Build amazing projects and grow your network.'
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="text-center"
              >
                <motion.div 
                  className={`${step.color} text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6`}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {step.number}
                </motion.div>
                <h3 className="text-xl font-bold text-black mb-3">{step.title}</h3>
                <p className="text-gray-700">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, red 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <motion.div 
          className="container mx-auto max-w-4xl text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.5 }}
          variants={fadeInUp}
        >
          <motion.h2 
            className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
          >
            Ready to start collaborating?
          </motion.h2>
          <motion.p 
            className="text-base sm:text-xl text-gray-300 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Join thousands of students already building amazing projects together.
          </motion.p>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center bg-white text-red-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-lg"
              >
                Sign In
              </Link>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default Home;

