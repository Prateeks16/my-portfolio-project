import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id) => {
    setIsOpen(false); 
    const element = document.getElementById(id);
    if (element) {
        const y = element.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
  };

  const navLinks = ['Home', 'Projects', 'About', 'Work experience', 'Contact'];

  return (
    <>
      {/* --- DESKTOP NAVBAR (Simple & Clean) --- */}
      <div className="hidden md:flex fixed top-8 left-0 right-0 justify-center z-50 pointer-events-none">
        <nav className="pointer-events-auto bg-white/80 backdrop-blur-md px-2 py-2 rounded-full shadow-sm border border-stone-200 flex items-center gap-1 transition-all hover:shadow-md">
          {navLinks.map((item) => (
            <button 
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="px-6 py-2 rounded-full text-sm font-medium text-stone-600 hover:text-black hover:bg-white hover:shadow-sm transition-all duration-300"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      {/* --- MOBILE HAMBURGER BUTTON --- */}
      <div className="md:hidden fixed top-6 right-6 z-50 pointer-events-auto">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="relative group bg-white/90 backdrop-blur-md w-12 h-12 rounded-full shadow-lg border border-stone-200 text-black flex items-center justify-center transition-transform active:scale-95"
        >
          <span className={`absolute transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${
            isOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}>
            <Menu size={24} />
          </span>
          <span className={`absolute transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${
            isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}>
            <X size={24} />
          </span>
        </button>
      </div>

      {/* --- MOBILE FLOATING MENU ITEMS (Separate & Smooth) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex flex-col items-end justify-start pt-24 pr-6 pointer-events-none">
          {navLinks.map((item, index) => (
            <button 
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="pointer-events-auto bg-white/95 backdrop-blur-sm border border-stone-100 shadow-xl px-8 py-3 rounded-full mb-3 text-lg font-serif font-medium text-stone-800 active:scale-95 origin-right animate-slideInRight"
              style={{ 
                animationDelay: `${index * 0.1}s`, // Har item 0.1s late aayega (Smooth Sequence)
                animationFillMode: 'both' 
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Background Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] md:hidden transition-opacity duration-500 animate-fadeIn"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Navbar;