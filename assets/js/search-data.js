// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "About",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "Blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-publications",
          title: "Publications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "post-how-language-models-retrieve-bound-entities-in-context",
      
        title: "How Language Models Retrieve Bound Entities In-Context",
      
      description: "To reason, LMs must bind together entities in-context. How they do this is more complicated than was first thought.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/mixing-mechs2/";
        
      },
    },{id: "post-how-language-models-retrieve-bound-entities-in-context",
      
        title: "How Language Models Retrieve Bound Entities In-Context",
      
      description: "To reason, LMs must bind together entities in-context. How they do this is more complicated than was first thought.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/mixing-mechs/";
        
      },
    },{id: "post-enhancing-automated-interpretability-pipelines-with-output-centric-feature-descriptions",
      
        title: "Enhancing Automated Interpretability Pipelines with Output-Centric Feature Descriptions",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/enhancing-interp/";
        
      },
    },{id: "post-using-sparse-autoencoders-for-knowledge-erasure",
      
        title: "Using Sparse Autoencoders for Knowledge Erasure",
      
      description: "Can we leverage SAEs to effectively erase knowledge from LLMs in a targeted way?",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/sae-knowledge-erasure/";
        
      },
    },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
