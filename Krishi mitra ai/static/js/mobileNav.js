document.addEventListener('DOMContentLoaded', () => {
  // Select all navigation items and sections
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section, .hero.section');

  // Function to handle navigation clicks
  function handleNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        // Remove active class from all sections
        sections.forEach(section => section.classList.remove('active'));

        // Add active class to the clicked nav item
        item.classList.add('active');

        // Determine the target section based on data-section attribute
        const sectionId = item.getAttribute('data-section');
        let targetSection = null;

        if (sectionId === 'home') {
          targetSection = document.querySelector('.hero.section');
        } else {
          targetSection = document.getElementById(sectionId);
        }

        // Activate and scroll to the target section if found
        if (targetSection) {
          targetSection.classList.add('active');
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Set initial active section based on the first active nav item or default to 'home'
  function setInitialActiveSection() {
    const initialActiveNav = document.querySelector('.nav-item.active');
    const initialSectionId = initialActiveNav ? initialActiveNav.getAttribute('data-section') : 'home';
    let initialTarget = null;

    if (initialSectionId === 'home') {
      initialTarget = document.querySelector('.hero.section');
    } else {
      initialTarget = document.getElementById(initialSectionId);
    }

    if (initialTarget) {
      initialTarget.classList.add('active');
    }
  }

  // Initialize navigation
  handleNavigation();
  setInitialActiveSection();

  // Optional: Reinitialize navigation if DOM changes (e.g., dynamic section addition)
  const observer = new MutationObserver(() => {
    handleNavigation();
    setInitialActiveSection();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});