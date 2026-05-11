import { useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { 
  Users, 
  ArrowRight, 
  CheckCircle, 
  MessageSquare, 
  TrendingUp, 
  Zap, 
  Shield, 
  Sparkles,
  Search,
  Github
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToGlobalStats } from '../services/firestoreService';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

const AnimatedCounter = ({ value, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (isNaN(end)) return;
    if (start === end) return;

    let totalMiliseconds = 2000;
    let incrementTime = (totalMiliseconds / end);

    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}{suffix}</span>;
};

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ users: 0, projects: 0, collabs: 0, successRate: 98 });

  // Mouse tracking for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const moveX = (clientX - window.innerWidth / 2) / 25;
    const moveY = (clientY - window.innerHeight / 2) / 25;
    mouseX.set(moveX);
    mouseY.set(moveY);
  };

  useEffect(() => {
    const unsubscribe = subscribeToGlobalStats((newStats) => {
      setStats(newStats);
    });
    return () => unsubscribe();
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const scaleIn = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      {/* Hero Section */}
      <section 
        onMouseMove={handleMouseMove}
        className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden"
      >
        {/* CSS Particles Background with Parallax */}
        <motion.div 
          style={{ x: springX, y: springY }}
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        >
          {[...Array(100)].map((_, i) => {
            const size = Math.random() * 5 + 1; // Sizes between 1px and 6px
            return (
              <div
                key={i}
                className="absolute bg-white rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: size > 4 ? 0.4 : 0.2, // Larger dots are slightly more visible
                  animation: `float ${Math.random() * 10 + 20}s linear infinite`,
                  animationDelay: `-${Math.random() * 20}s`
                }}
              />
            );
          })}
        </motion.div>

        {/* CSS Keyframes for floating */}
        <style>{`
          @keyframes float {
            0% { transform: translate(0, 0); }
            33% { transform: translate(30px, -50px); }
            66% { transform: translate(-20px, 20px); }
            100% { transform: translate(0, 0); }
          }
        `}</style>

        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full animate-pulse"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={containerVariants} className="text-left">
              <motion.div variants={itemVariants} className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
                <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" /> The future of collaboration
                </span>
              </motion.div>
              <motion.h1 variants={itemVariants} className="text-5xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
                Connect.<br />
                Collaborate.<br />
                <span className="text-red-600">Create.</span>
              </motion.h1>
              <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 mb-10 max-w-lg leading-relaxed">
                The premier platform for students to discover projects, find teammates, and build amazing things together.
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link to="/discovery">
                    <motion.div className="inline-flex items-center justify-center bg-white text-black px-10 py-4 rounded-2xl font-black shadow-xl cursor-pointer hover:bg-red-600 hover:text-white transition-all" whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
                      Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                    </motion.div>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <motion.div className="inline-flex items-center justify-center bg-red-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl cursor-pointer hover:bg-red-700 transition-all" whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
                        Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                      </motion.div>
                    </Link>
                  </>
                )}
              </motion.div>
              <motion.div variants={itemVariants} className="mt-8 flex items-center gap-6 text-gray-500 font-bold uppercase tracking-widest text-[10px] md:text-xs">
                <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-red-600" /> Free forever</div>
                <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-red-600" /> No credit card</div>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={scaleIn} className="relative">
              <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: Users, count: stats.users, suffix: '+', label: 'Active Students' },
                    { icon: TrendingUp, count: stats.projects, suffix: '+', label: 'Projects' },
                    { icon: MessageSquare, count: stats.collabs, suffix: '+', label: 'Collaborations' },
                    { icon: Sparkles, count: stats.successRate, suffix: '%', label: 'Success Rate' },
                  ].map((stat, index) => (
                    <motion.div key={index} whileHover={{ y: -5, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} className="bg-white/5 p-6 rounded-2xl border border-white/5 transition-all">
                      <stat.icon className="h-8 w-8 mb-3 text-red-600" />
                      <div className="text-2xl md:text-3xl font-black text-white">
                        <AnimatedCounter value={stat.count} suffix={stat.suffix} />
                      </div>
                      <div className="text-gray-500 font-bold text-[10px] md:text-xs uppercase tracking-tight">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.3 }} variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tighter">
              Everything you need to <span className="text-red-600">collaborate</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for student collaboration and project growth.
            </p>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.2 }} variants={containerVariants}>
            {[
              { icon: Search, title: 'AI-Powered Matching', desc: 'Our semantic search engine matches you with perfect projects and teammates based on your skills.' },
              { icon: MessageSquare, title: 'Real-Time Collaboration', desc: 'Chat with your team, share files, manage tasks, and track progress all in one place.' },
              { icon: Users, title: 'Build Your Network', desc: 'Connect with talented students, earn endorsements, and build a portfolio that stands out.' },
              { icon: Github, title: 'GitHub Integration', desc: 'Link your repositories, track commits, and manage pull requests seamlessly.' },
              { icon: Zap, title: 'Fast & Efficient', desc: 'Lightning-fast performance with real-time updates to keep your projects moving forward.' },
              { icon: Shield, title: 'Secure & Private', desc: 'Your data is protected with enterprise-grade security and privacy controls.' }
            ].map((f, i) => (
              <motion.div key={i} variants={itemVariants} whileHover={{ y: -10 }} className="p-10 rounded-3xl bg-gray-50 border border-gray-100 transition-all hover:shadow-xl hover:bg-white">
                <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center mb-6">
                  <f.icon className="h-7 w-7 text-red-600" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight text-gray-900">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.3 }} variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-black mb-6 tracking-tighter">How It Works</h2>
            <p className="text-lg text-gray-700">Start collaborating in three simple steps</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { n: 1, t: 'Create Your Profile', d: 'Sign up and showcase your skills, interests, and previous projects.' },
              { n: 2, t: 'Discover & Apply', d: 'Browse projects tailored to your skills or post your own ideas.' },
              { n: 3, t: 'Collaborate & Build', d: 'Work with your team using our integrated collaboration tools.' }
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }} className="text-center group">
                <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-8 shadow-xl shadow-red-600/20 group-hover:scale-110 transition-transform">
                  {step.n}
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight text-black">{step.t}</h3>
                <p className="text-gray-600 leading-relaxed">{step.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-black text-white text-center overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent"></div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-none">Ready to start <span className="text-red-600">building?</span></h2>
          <p className="text-xl text-gray-400 mb-12">Join thousands of students and turn your ideas into reality.</p>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/register" className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 hover:-translate-y-1">
                Get Started Free
              </Link>
              <Link to="/login" className="bg-white text-black px-12 py-5 rounded-2xl font-black text-xl hover:bg-gray-100 transition-all shadow-xl hover:-translate-y-1">
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
