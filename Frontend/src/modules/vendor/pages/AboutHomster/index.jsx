import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUsers, FiShield, FiClock, FiAward, FiHeart, FiGlobe, FiSmile, FiSmartphone } from 'react-icons/fi';
import { motion } from 'framer-motion';

const AboutHomestr = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const features = [
    {
      icon: FiUsers,
      title: 'Expert Providers',
      description: 'Verified professionals for all your home needs'
    },
    {
      icon: FiShield,
      title: 'Safe & Secure',
      description: 'Your safety is our top priority'
    },
    {
      icon: FiClock,
      title: 'On-Time Service',
      description: 'Punctual delivery at your convenience'
    },
    {
      icon: FiAward,
      title: 'Quality Assured',
      description: 'Service with 100% satisfaction guarantee'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Happy Customers' },
    { number: '500+', label: 'Service Partners' },
    { number: '4.8', label: 'App Rating' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50 pb-10"
    >
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-xl font-bold text-[#0B132B]">About Zippto</span>
        </div>
      </header>

      <main className="px-5 py-6 space-y-8">
        <motion.div variants={itemVariants} className="text-center">
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div
              className="absolute inset-[-3px] rounded-full opacity-70"
              style={{
                background: 'conic-gradient(from 0deg, #0B132B, #FFC107, #0B132B)',
                animation: 'spin 4s linear infinite',
              }}
            />
            <div className="absolute inset-0 bg-white rounded-full shadow-lg flex items-center justify-center p-2">
              <img src="/zippto_logo.png" alt="Zippto" className="w-full h-full object-contain rounded-full" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Welcome to <span className="text-[#0B132B]">Zippto Pro</span>
          </h1>
          <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
            Your trusted ecosystem for home services & vendor growth.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-between bg-white rounded-2xl p-6 shadow-sm border border-gray-100 divide-x divide-gray-100">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 text-center px-2">
              <div className="text-xl font-bold text-[#0B132B]">
                {stat.number}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-br from-teal-50/80 via-slate-50 to-white text-slate-900 rounded-2xl p-6 relative overflow-hidden shadow-xs border border-teal-200/80">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-teal-700">
              <FiGlobe className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-bold text-teal-800 mb-3">Our Mission</h3>
            <p className="text-sm text-slate-600 leading-relaxed relative z-10 font-medium">
              Zippto is dedicated to empowering home service experts and agencies with transparent technology, live tracking, and steady customer bookings.
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Why Choose Zippto?</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-5 h-5 text-slate-800" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 mb-1">{feature.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 mb-1">Designed & Developed by</p>
          <span className="text-sm font-bold tracking-wide text-[#0B132B]">Zippto Engineering Team</span>
          <p className="text-[10px] text-gray-300 mt-4">v7.6.27 • Made with ❤️ in India</p>
        </motion.div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default AboutHomestr;
