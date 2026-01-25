import React, { useEffect, useState, useRef } from 'react';
import { X, Calendar, MapPin } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils'; // <--- Import from utils.js

const Experience = () => {
  const [experiences, setExperiences] = useState([]);
  const [selectedExp, setSelectedExp] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    api.get('/experiences/')
      .then(res => setExperiences(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = 350; 
    const gap = 32; 
    const itemTotalWidth = cardWidth + gap;
    const index = Math.round(container.scrollLeft / itemTotalWidth);
    if (index >= 0 && index < experiences.length) {
      setActiveIndex(index);
    }
  };

  useEffect(() => {
    if (selectedExp) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
  }, [selectedExp]);

  return (
    <section id="work experience" className="py-24 bg-[#ECEBE9] relative overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-5">
        <span className="text-[15rem] font-serif font-bold leading-none text-black">WORK</span>
      </div>

      <div className="text-center mb-12 px-6 relative z-10">
        <h2 className="heading-serif text-6xl md:text-7xl text-dark-text mb-4">Work Experience</h2>
        <sup className="text-sm font-bold text-soft-text">{experiences.length} Positions</sup>
      </div>

      <div className="relative w-full z-10">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-8 overflow-x-auto snap-x snap-mandatory py-16 no-scrollbar"
          style={{ 
            scrollBehavior: 'smooth',
            paddingLeft: 'calc(50vw - 175px)', 
            paddingRight: 'calc(50vw - 175px)' 
          }}
        >
          {experiences.map((exp, index) => {
            const isActive = index === activeIndex;
            return (
              <div 
                key={exp.id}
                onClick={() => setSelectedExp(exp)}
                className={`snap-center shrink-0 transition-all duration-500 ease-out cursor-pointer ${
                  isActive 
                    ? 'scale-110 opacity-100 z-10 blur-0' 
                    : 'scale-90 opacity-50 blur-[1px] hover:opacity-80 hover:blur-0'
                }`}
              >
                <ExperienceCard exp={exp} isActive={isActive} />
              </div>
            );
          })}
        </div>
      </div>

      {selectedExp && (
        <Modal exp={selectedExp} onClose={() => setSelectedExp(null)} />
      )}

    </section>
  );
};

const ExperienceCard = ({ exp, isActive }) => {
  return (
    <div className={`w-[350px] aspect-[4/5] bg-white rounded-[2.5rem] p-8 flex flex-col items-center justify-center shadow-2xl border border-stone-100 relative overflow-hidden transition-shadow duration-500 ${isActive ? 'shadow-2xl ring-4 ring-stone-100' : 'shadow-lg'}`}>
      
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-stone-50 to-transparent opacity-50"></div>

      <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 mb-6 transition-transform duration-500">
        {/* --- Image Fix Here --- */}
        {exp.company_logo ? (
          <img 
            src={getImageUrl(exp.company_logo)} 
            alt={exp.company_name} 
            className="w-full h-full object-contain drop-shadow-sm"
            onError={(e) => {
              e.target.onerror = null; 
              // Fallback agar image 404 ho
              e.target.src = "https://placehold.co/200x200?text=" + exp.company_name.charAt(0);
            }} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-100 rounded-full text-4xl font-serif font-bold text-stone-300">
            {exp.company_name?.charAt(0)}
          </div>
        )}
      </div>

      <div className="text-center relative z-10">
        <h3 className="font-bold text-xl text-dark-text mb-1">{exp.company_name}</h3>
        <p className="text-sm font-medium text-soft-text">{exp.position}</p>
      </div>

      <div className={`absolute bottom-8 transition-all duration-500 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-4 py-2 rounded-full">
          View Details
        </span>
      </div>
    </div>
  );
};

const Modal = ({ exp, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>
    <div className="relative bg-[#ECEBE9] w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fadeIn scale-100">
      <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-white/80 rounded-full hover:bg-black hover:text-white transition-colors">
        <X size={20} />
      </button>

      <div className="w-full md:w-1/3 bg-white p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-stone-200">
        <div className="w-20 h-20 mb-4 p-2 bg-stone-50 rounded-full flex items-center justify-center overflow-hidden">
           {/* --- Modal Image Fix --- */}
           {exp.company_logo ? (
             <img 
              src={getImageUrl(exp.company_logo)} 
              className="w-full h-full object-contain"
              onError={(e) => e.target.src = "https://placehold.co/200x200?text=" + exp.company_name.charAt(0)}
             />
           ) : (
             <span className="text-2xl font-bold">{exp.company_name[0]}</span>
           )}
        </div>
        <h3 className="font-bold text-lg mb-1">{exp.company_name}</h3>
        <p className="text-xs text-stone-500 font-bold uppercase mb-4">{exp.start_date.split('-')[0]} — {exp.end_date ? exp.end_date.split('-')[0] : 'Now'}</p>
      </div>

      <div className="w-full md:w-2/3 p-8 overflow-y-auto custom-scrollbar bg-[#FDFDFD]">
        <h4 className="heading-serif text-2xl mb-4">About Role</h4>
        <p className="text-sm text-soft-text leading-relaxed whitespace-pre-line mb-6">{exp.description}</p>
        <div className="flex flex-wrap gap-2">
          {exp.tech_stack?.map((t, i) => (
            <span key={i} className="px-2 py-1 bg-stone-100 rounded text-[10px] font-bold uppercase tracking-wide text-stone-600">{t}</span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Experience;