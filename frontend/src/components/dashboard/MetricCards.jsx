import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

const MetricCards = ({ stats, alerts }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 p-6 shadow-sm animate-pulse">
            <div className="flex justify-between">
               <div className="h-4 bg-slate-200/70 rounded-full w-24 mb-6"></div>
               <div className="h-12 w-12 bg-slate-200/70 rounded-2xl"></div>
            </div>
            <div className="h-8 bg-slate-200/70 rounded-lg w-32 mb-3"></div>
            <div className="h-3 bg-slate-200/50 rounded-full w-48"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalAlerts = alerts?.length || 0;

  const cards = [
    {
      title: "Entities Monitored",
      value: (stats.accounts + stats.persons).toLocaleString(),
      subtext: `${stats.accounts.toLocaleString()} accounts, ${stats.persons.toLocaleString()} persons`,
      trend: "up",
      color: "text-blue-600",
      bg: "bg-gradient-to-br from-blue-50/50 to-blue-100/50",
      iconBg: "bg-blue-100",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Alerts Detected",
      value: totalAlerts.toLocaleString(),
      subtext: `${stats.suspicious_txns.toLocaleString()} suspicious txns`,
      trend: totalAlerts > 0 ? "up" : "neutral",
      color: "text-amber-600",
      bg: "bg-gradient-to-br from-amber-50/50 to-amber-100/50",
      iconBg: "bg-amber-100",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      title: "Suspicious Volume",
      value: formatCurrency(stats.total_suspicious_volume),
      subtext: "Total marked for review",
      trend: "up",
      color: "text-rose-600",
      bg: "bg-gradient-to-br from-rose-50/50 to-rose-100/50",
      iconBg: "bg-rose-100",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Transactions",
      value: stats.transactions.toLocaleString(),
      subtext: "Processed graph edges",
      trend: "up",
      color: "text-emerald-600",
      bg: "bg-gradient-to-br from-emerald-50/50 to-emerald-100/50",
      iconBg: "bg-emerald-100",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-4 gap-6"
    >
      {cards.map((card, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          whileHover={{ y: -6, transition: { duration: 0.2 } }}
          className={`
            group relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6
            shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]
            cursor-pointer overflow-hidden z-0
          `}
        >
          {/* Subtle gradient overlay on hover */}
          <div className={`
            absolute inset-0 opacity-0 group-hover:opacity-100
            transition-opacity duration-500 ease-out ${card.bg} -z-10
          `} />

          {/* Content */}
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-sm font-semibold text-slate-500 tracking-wide group-hover:text-slate-700 transition-colors">
              {card.title.toUpperCase()}
            </h3>
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center
              ${card.iconBg} ${card.color}
              transform group-hover:scale-110 group-hover:rotate-6
              transition-all duration-300 ease-out shadow-sm
            `}>
              {card.icon}
            </div>
          </div>

          <div>
            <span className={`
              text-3xl font-extrabold text-slate-900 tracking-tight
            `}>
              {card.value}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400 group-hover:text-slate-500 transition-colors font-medium">
            {card.subtext}
          </p>

          {/* Trend indicator */}
          {card.trend === "up" && (
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <svg className={`w-5 h-5 ${card.color} animate-bounce`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MetricCards;
