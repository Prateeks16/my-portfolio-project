import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils';

const About = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Profile data fetch karna
    api.get('/profile/')
      .then(res => {
        if(res.data.length > 0) setProfile(res.data[0]);
      })
      .catch(err => console.error("Profile load error", err));
  }, []);

  if (!profile) return null; // Jab tak data na aaye, kuch mat dikhao

  return (
    <section id="about" className="py-24 px-6 md:px-12 lg:px-24 bg-[#ECEBE9] border-t border-stone-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Side: Big Heading (Like Blog Section) */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="heading-serif text-5xl md:text-6xl text-dark-text leading-[0.9] mb-8">
              About <br /> Me
            </h2>
            
            {/* Optional Decorative Line or Icon */}
            <div className="w-16 h-1 bg-black mb-8"></div>
          </div>

          {/* Icon (Hidden on mobile for cleaner look) */}
          <div className="hidden lg:block opacity-10">
            <User size={120} />
          </div>
        </div>

        {/* Right Side: Bio Text */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Main Bio Text */}
          <div className="text-lg md:text-xl text-soft-text leading-relaxed font-medium">
            <p className="whitespace-pre-line">
              {profile.bio || "Hi, I'm a developer passionate about building clean and functional web experiences."}
            </p>
          </div>

          {/* Extra Info Grid (Optional but looks good) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 pt-8 border-t border-stone-300/50">
            <div>
              <h3 className="font-serif font-bold text-lg mb-2 text-dark-text">Focus</h3>
              <p className="text-sm text-soft-text">
                Machine Learning, Data Science, <br/> Backend Architecture.
              </p>
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg mb-2 text-dark-text">Based In</h3>
              <p className="text-sm text-soft-text">
                {profile.location || "India"} <br/> Available for remote work.
              </p>
            </div>
          </div>

          {/* Signature (Stylish End) */}
          <div className="mt-8">
            <span className="font-serif italic text-4xl text-stone-400">
              {profile.full_name?.split(' ')[0] || "Prateek"}
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};

export default About;