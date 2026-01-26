import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils';

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
    // Mobile par width alag hai, Desktop par alag
    const isMobile = window.innerWidth < 768;
    const cardWidth = isMobile ? window.innerWidth * 0.85 : 350; 
    
    const index = Math.round(container.scrollLeft / (cardWidth + 32));
    if (index >= 0 && index < experiences.length) {
      setActiveIndex(index);
    }
  };

  return (
    <section id="work experience" className="py-24 bg-[#ECEBE9] relative overflow-hidden">
      
      {/* Background Text - Mobile pe hide ya chhota */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-5">
        <span className="text-[5rem] md:text-[15rem] font-serif font-bold leading-none text-black">WORK</span>
      </div>

      <div className="text-center mb-12 px-6 relative z-10">
        <h2 className="heading-serif text-4xl md:text-7xl text-dark-text mb-4">Work Experience</h2>
        <sup className="text-sm font-bold text-soft-text">{experiences.length} Positions</sup>
      </div>

      <div className="relative w-full z-10">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory py-10 md:py-16 no-scrollbar px-6 md:px-0"
          style={{ 
            scrollBehavior: 'smooth',
            // Mobile par centering logic hata di, simple padding rakhi hai
            paddingLeft: window.innerWidth < 768 ? '1.5rem' : 'calc(50vw - 175px)', 
            paddingRight: window.innerWidth < 768 ? '1.5rem' : 'calc(50vw - 175px)' 
          }}
        >
          {experiences.map((exp, index) => {
            const isActive = index === activeIndex;
            return (
              <div 
                key={exp.id}
                onClick={() => setSelectedExp(exp)}
                className={`snap-center shrink-0 transition-all duration-500 ease-out cursor-pointer ${
                  // Mobile par blur effect kam kiya taaki saaf dikhe
                  isActive 
                    ? 'scale-100 md:scale-110 opacity-100 z-10 blur-0' 
                    : 'scale-95 md:scale-90 opacity-100 md:opacity-50 md:blur-[1px] hover:opacity-80'
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
    // Width fixed 350px se hata kar flexible banayi
    <div className={`w-[85vw] md:w-[350px] aspect-[4/5] bg-white rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center shadow-xl border border-stone-100 relative overflow-hidden`}>
      
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-stone-50 to-transparent opacity-50"></div>

      <div className="relative z-10 w-24 h-24 md:w-40 md:h-40 mb-6">
        {exp.company_logo ? (
          <img 
            src={getImageUrl(exp.company_logo)} 
            alt={exp.company_name} 
            className="w-full h-full object-contain drop-shadow-sm"
            onError={(e) => { e.target.src = "https://placehold.co/200x200?text=" + exp.company_name.charAt(0); }} 
          />
        ) : (
           <div className="w-full h-full flex items-center justify-center bg-stone-100 rounded-full text-2xl font-bold">{exp.company_name[0]}</div>
        )}
      </div>

      <div className="text-center relative z-10">
        <h3 className="font-bold text-lg md:text-xl text-dark-text mb-1">{exp.company_name}</h3>
        <p className="text-sm font-medium text-soft-text">{exp.position}</p>
      </div>

      <div className="absolute bottom-6 md:bottom-8">
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
      {/* Modal Height fix for mobile */}
      <div className="relative bg-[#ECEBE9] w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fadeIn">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-white/80 rounded-full hover:bg-black hover:text-white transition-colors">
          <X size={20} />
        </button>
        
        {/* Content... same as before, bas scrolling ensure karein */}
        <div className="w-full md:w-1/3 bg-white p-6 flex flex-col items-center justify-center text-center shrink-0">
           <div className="w-16 h-16 mb-4 bg-stone-50 rounded-full flex items-center justify-center">
             {exp.company_logo ? <img src={getImageUrl(exp.company_logo)} className="w-full h-full object-contain"/> : <span className="font-bold">{exp.company_name[0]}</span>}
           </div>
           <h3 className="font-bold text-lg">{exp.company_name}</h3>
           <p className="text-xs text-stone-500 font-bold uppercase">{exp.start_date}</p>
        </div>
  
        <div className="w-full md:w-2/3 p-6 overflow-y-auto custom-scrollbar">
          <h4 className="heading-serif text-2xl mb-4">About Role</h4>
          <p className="text-sm text-soft-text leading-relaxed whitespace-pre-line mb-6">{exp.description}</p>
        </div>
      </div>
    </div>
  );

export default Experience;