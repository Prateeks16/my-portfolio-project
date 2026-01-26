import React, { useEffect, useState } from 'react';
import { ArrowUpRight, X, Github, ExternalLink } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils';

const parseTechStack = (stack) => {
  if (!stack) return [];
  try {
    const parsed = JSON.parse(stack);
    return Array.isArray(parsed) ? parsed : [stack];
  } catch (e) {
    return stack.split(',').map(s => s.trim());
  }
};

const Work = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    api.get('/projects/')
      .then(res => setProjects(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <section id="projects" className="py-16 md:py-24 px-4 md:px-12 lg:px-24 bg-[#ECEBE9]">
      <div className="mb-12 md:mb-20">
         <h2 className="heading-serif text-4xl md:text-6xl text-dark-text mb-4">Projects</h2>
         <div className="w-full h-[1px] bg-stone-300 mt-4 md:mt-8"></div>
      </div>

      <div className="flex flex-col gap-12 md:gap-20">
        {projects.map((project, index) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            index={index} 
            onReadMore={() => setSelectedProject(project)} 
          />
        ))}
      </div>

      {selectedProject && (
        <ProjectModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </section>
  );
};

const ProjectCard = ({ project, index, onReadMore }) => {
  const isEven = index % 2 === 0;
  const imageUrl = getImageUrl(project.image);
  const tags = parseTechStack(project.tech_stack);

  const themes = [
    { bg: 'bg-[#111111]', text: 'text-[#EAEAEA]', btn: 'bg-white text-black', tag: 'text-stone-400' }, 
    { bg: 'bg-[#0B1221]', text: 'text-[#E0E6ED]', btn: 'bg-[#4CC9F0] text-black', tag: 'text-blue-200' }, 
    { bg: 'bg-[#1A1412]', text: 'text-[#EBE5E0]', btn: 'bg-[#E5D4C0] text-[#1A1412]', tag: 'text-[#9C8E85]' } 
  ];
  const theme = themes[index % 3];

  return (
    // Height 'min-h' mobile pe hata diya taaki empty space na bache
    <div className={`group relative rounded-[2rem] overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.01] ${theme.bg} ${theme.text}`}>
      <div className={`flex flex-col lg:flex-row ${isEven ? '' : 'lg:flex-row-reverse'}`}>
        
        {/* Padding kam kiya mobile ke liye (p-8 instead of p-20) */}
        <div className="flex-1 p-8 md:p-12 lg:p-20 flex flex-col justify-center order-2 lg:order-1">
          <div className="mb-6 md:mb-10">
            <span className={`text-xs uppercase tracking-widest font-bold ${theme.tag} mb-4 block leading-relaxed`}>
              {tags.length > 0 ? tags.join(' • ') : "Development"}
            </span>
            
            <h2 className="heading-serif text-3xl md:text-4xl lg:text-6xl mb-4 md:mb-6 leading-none">
              {project.title}
            </h2>
            <p className="text-base md:text-lg opacity-80 max-w-md leading-relaxed font-light mb-6 md:mb-8">
              {project.short_description}
            </p>

            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <a 
                href={project.live_demo_url || project.github_url}
                target="_blank" rel="noopener noreferrer" 
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold tracking-wide transition-all ${theme.btn}`}
              >
                View Live <ArrowUpRight size={18} />
              </a>
              <button 
                onClick={onReadMore} 
                className="group/btn flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:underline underline-offset-4 decoration-2"
              >
                Read More <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Image Section: Mobile par height fix kari */}
        <div className="flex-1 relative h-[250px] md:h-auto min-h-[250px] lg:min-h-[500px] cursor-pointer order-1 lg:order-2" onClick={onReadMore}>
          <img 
            src={imageUrl} 
            alt={project.title} 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            onError={(e) => { e.target.src = "https://placehold.co/800x600?text=Project"; }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${theme.bg.replace('bg-', 'from-')} to-transparent opacity-40 lg:opacity-20`}></div>
        </div>
      </div>
    </div>
  );
};

// ... ProjectModal code same rahega ...
const ProjectModal = ({ project, onClose }) => {
    const imageUrl = getImageUrl(project.image);
    const tags = parseTechStack(project.tech_stack);
    
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>
        <div className="relative bg-[#ECEBE9] w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-fadeIn scale-100">
          <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full hover:bg-black hover:text-white transition-colors shadow-lg">
            <X size={20} />
          </button>
  
          <div className="overflow-y-auto custom-scrollbar flex flex-col h-full">
            <div className="w-full h-[250px] md:h-[400px] relative shrink-0">
              <img src={imageUrl} alt={project.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#ECEBE9] via-transparent to-transparent opacity-80"></div>
            </div>
  
            <div className="px-6 md:px-12 pb-12 -mt-16 relative z-10">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div>
                    <h2 className="heading-serif text-3xl md:text-5xl text-dark-text mb-2">{project.title}</h2>
                    <p className="text-soft-text font-medium text-sm md:text-base">{project.short_description}</p>
                  </div>
                  {/* Icons row */}
                  <div className="flex gap-3 shrink-0">
                    {project.github_url && <a href={project.github_url} className="p-3 bg-stone-100 rounded-full"><Github size={20} /></a>}
                    {project.live_demo_url && <a href={project.live_demo_url} className="p-3 bg-stone-100 rounded-full"><ExternalLink size={20} /></a>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tech, i) => (
                    <span key={i} className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold border border-stone-200 uppercase tracking-wide">{tech}</span>
                  ))}
                </div>
              </div>
              <div className="prose prose-lg max-w-none text-soft-text leading-relaxed whitespace-pre-line text-sm md:text-base">
                <h3 className="heading-serif text-2xl md:text-3xl text-dark-text mb-4">Project Overview</h3>
                {project.description}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default Work;