import React, { useEffect, useState } from 'react';
import { Trophy, ArrowUpRight, ChevronDown } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils'; // Import helper

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [expandedId, setExpandedId] = useState(null); // Track which card is open

  useEffect(() => {
    api.get('/achievements/')
      .then(res => setAchievements(res.data))
      .catch(err => console.error(err));
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id); // Toggle logic
  };

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 border-t border-stone-300 bg-[#ECEBE9]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left: Heading Fixed */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="heading-serif text-5xl md:text-6xl text-dark-text mb-6">
              Achievements
            </h2>
            <p className="text-soft-text text-lg max-w-xs leading-relaxed">
              Recognition and milestones from my journey in tech and innovation.
            </p>
          </div>
          <div className="hidden lg:block mt-12 opacity-10">
            <Trophy size={120} />
          </div>
        </div>

        {/* Right: Expandable List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {achievements.map((item) => {
            const isOpen = expandedId === item.id;
            const badgeUrl = item.badge_image ? getImageUrl(item.badge_image) : null;

            return (
              <div 
                key={item.id} 
                onClick={() => toggleExpand(item.id)}
                className={`group flex flex-col p-6 rounded-3xl bg-white/50 border border-transparent transition-all duration-300 cursor-pointer ${
                  isOpen ? 'bg-white shadow-lg border-stone-100' : 'hover:bg-white hover:shadow-sm'
                }`}
              >
                {/* Header (Always Visible) */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Badge Image or Date Placeholder */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden transition-colors duration-300 border border-stone-100 ${
                      isOpen ? 'bg-black text-white' : 'bg-stone-200 group-hover:bg-stone-800 group-hover:text-white'
                    }`}>
                      {badgeUrl ? (
                        <img 
                          src={badgeUrl} 
                          alt="Badge" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'; // Hide if fails
                            e.target.nextSibling.style.display = 'block'; // Show fallback
                          }} 
                        />
                      ) : null}
                      
                      {/* Fallback Text (Date Year) if image fails or doesn't exist */}
                      <span 
                        className="font-serif font-bold text-sm" 
                        style={{ display: badgeUrl ? 'none' : 'block' }}
                      >
                        {item.date ? item.date.split('-')[0] : '202X'}
                      </span>
                    </div>

                    {/* Title & Meta */}
                    <div>
                      <h3 className="text-xl font-bold text-dark-text leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm text-soft-text mt-1">
                        {item.organization} • <span className="italic">{item.achievement_type}</span>
                      </p>
                    </div>
                  </div>

                  {/* Toggle Icon */}
                  <ChevronDown 
                    className={`text-stone-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-black' : ''}`} 
                    size={24} 
                  />
                </div>

                {/* Expanded Content (Collapsible) */}
                <div 
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="pl-[4rem] text-soft-text leading-relaxed">
                    <p className="mb-6 whitespace-pre-line">
                      {item.description}
                    </p>

                    {item.certificate_url && (
                      <a 
                        href={item.certificate_url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking button
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-100 text-stone-800 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white transition-all"
                      >
                        View Certificate <ArrowUpRight size={16} />
                      </a>
                    )}
                  </div>
                </div>

              </div>
            );
          })}

          {achievements.length === 0 && (
            <div className="p-8 text-center text-stone-400 italic">
              Loading achievements...
            </div>
          )}
        </div>
        
      </div>
    </section>
  );
};

export default Achievements;