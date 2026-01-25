import React, { useState } from 'react';
import { Send, Loader2, Mail, Linkedin, Instagram, Github, CheckCircle } from 'lucide-react';
import api from '../api';

const Footer = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [status, setStatus] = useState('idle');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await api.post('/contact/', {
        ...formData,
        subject: "New Message from Portfolio Footer" // Subject auto-set
      });
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error("Error:", error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <footer className="bg-[#1C1C1C] text-[#ECEBE9] py-20 px-6 md:px-12 lg:px-24 rounded-t-[3rem] mt-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        
        {/* --- LEFT SIDE: Info & Social Links --- */}
        <div className="flex flex-col justify-between">
          <div>
            <h2 className="heading-serif text-5xl md:text-6xl mb-6">
              Get in touch
            </h2>
            <p className="text-stone-400 text-lg leading-relaxed max-w-md mb-8">
              Have a project in mind or just want to say hi? I'm always open to discussing new projects, creative ideas or opportunities.
            </p>
            
            <a href="mailto:prateeksahu529pvt@gmail.com" className="text-2xl md:text-3xl underline decoration-stone-600 underline-offset-8 hover:text-white hover:decoration-white transition-all">
              prateeksahu529pvt@gmail.com
            </a>
          </div>

          {/* Social Icons */}
          <div className="mt-12">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-6">Connect with me</h3>
            <div className="flex gap-6">
              {/* LinkedIn */}
              <SocialLink href="https://linkedin.com/in/Prateeks16" icon={<Linkedin size={24} />} label="LinkedIn" />
              
              {/* Instagram */}
              <SocialLink href="https://instagram.com/prateek.17" icon={<Instagram size={24} />} label="Instagram" />
              
              {/* GitHub (Optional but good for dev) */}
              <SocialLink href="https://github.com/Prateeks16" icon={<Github size={24} />} label="GitHub" />
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDE: Contact Form (Dark Theme) --- */}
        <div className="bg-[#2A2A2A] p-8 md:p-10 rounded-3xl border border-white/5 relative overflow-hidden">
          
          {/* Success Overlay */}
          {status === 'success' && (
            <div className="absolute inset-0 bg-[#2A2A2A] z-10 flex flex-col items-center justify-center text-center animate-fadeIn p-8">
              <CheckCircle size={48} className="text-green-400 mb-4" />
              <h3 className="heading-serif text-2xl mb-2">Message Sent!</h3>
              <button onClick={() => setStatus('idle')} className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white">Send Another</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Your Name</label>
              <input 
                type="text" name="name" required value={formData.name} onChange={handleChange}
                className="w-full bg-[#1C1C1C] border border-stone-700 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-stone-400 transition-colors"
                placeholder="Your name"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Email Address</label>
              <input 
                type="email" name="email" required value={formData.email} onChange={handleChange}
                className="w-full bg-[#1C1C1C] border border-stone-700 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-stone-400 transition-colors"
                placeholder="email@example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Message</label>
              <textarea 
                name="message" required rows="4" value={formData.message} onChange={handleChange}
                className="w-full bg-[#1C1C1C] border border-stone-700 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-stone-400 transition-colors resize-none"
                placeholder="Hello Prateek..."
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={status === 'submitting'}
              className="mt-2 bg-white text-black rounded-full py-4 px-8 font-bold text-sm uppercase tracking-widest hover:bg-stone-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {status === 'submitting' ? <Loader2 className="animate-spin" /> : <>Send Message <Send size={18} /></>}
            </button>
          </form>
        </div>

      </div>

      <div className="mt-20 pt-8 border-t border-white/10 text-center text-stone-500 text-xs uppercase tracking-widest flex flex-col md:flex-row justify-between items-center gap-4">
        <span>© 2026 Prateek Sahu</span>
        <span>Made with Django & React</span>
      </div>
    </footer>
  );
};

// Helper for Social Icons
const SocialLink = ({ href, icon, label }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="w-12 h-12 rounded-full border border-stone-700 flex items-center justify-center text-stone-400 hover:bg-white hover:text-black hover:border-white transition-all duration-300 group"
    aria-label={label}
  >
    {icon}
  </a>
);

export default Footer;