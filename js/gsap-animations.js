document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------------------
    // 1. Loader Animation with GSAP Timeline
    // -----------------------------------------
    
    // Set initial transform origin for spins
    gsap.set([".spin-slow", ".spin-mid", ".spin-fast"], {
        transformOrigin: "405px 2000px"
    });

    // Rise animation
    gsap.to(".squircle-rise", {
        y: -200,
        duration: 8,
        ease: "power2.inOut"
    });

    // Spin animations matching original speeds
    gsap.to(".spin-slow", {
        rotation: 360,
        duration: 7,
        repeat: -1,
        ease: "none"
    });
    gsap.to(".spin-mid", {
        rotation: 360,
        duration: 9,
        repeat: -1,
        ease: "none"
    });
    gsap.to(".spin-fast", {
        rotation: 360,
        duration: 12,
        repeat: -1,
        ease: "none"
    });

    // -----------------------------------------
    // 2 & 3. Hero Animations on Page Load
    // -----------------------------------------
    const siteLoader = document.getElementById('siteLoader');
    let heroAnimated = false;
    
    const playHeroAnimation = () => {
        if (heroAnimated) return;
        heroAnimated = true;
        window.gsapIsAnimatingHero = true;

        const tlHero = gsap.timeline({
            onComplete: () => {
                window.gsapIsAnimatingHero = false;
            }
        });

        // Hero headline text reveal character-by-character
        const heroTitle = new SplitType('.about-content h1', { types: 'chars, words' });
        
        // Add perspective to parent for 3D rotation effect
        gsap.set('.about-content h1', { perspective: 400 });
        
        // Hide characters initially
        gsap.set(heroTitle.chars, { opacity: 0, y: 50, rotationX: -90 });

        tlHero.to(heroTitle.chars, {
            opacity: 1,
            y: 0,
            rotationX: 0,
            stagger: 0.02,
            duration: 0.8,
            ease: "back.out(1.7)"
        });

        // Staggered reveal for hero calligraphy layers - start very early, right after text starts
        tlHero.fromTo('.layer-wrapper', {
            opacity: 0,
            y: 100,
            scale: 0.95
        }, {
            opacity: 1,
            y: 0,
            scale: 1,
            stagger: 0.2,
            duration: 1.2,
            ease: "power3.out"
        }, "<0.3"); // Starts 0.3s after the text animation begins
        
        // Also fade in the social proof and button
        tlHero.fromTo('.social-proof, .start-project-btn-mobile', {
            opacity: 0,
            y: 20
        }, {
            opacity: 1,
            y: 0,
            stagger: 0.2,
            duration: 0.8,
            ease: "power2.out"
        }, "<0.2"); // Starts 0.2s after the layers animation begins
    };

    // Watch for the loader to be hidden by main.js
    if (siteLoader) {
        if (siteLoader.classList.contains('hidden')) {
            playHeroAnimation();
        } else {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class' && siteLoader.classList.contains('hidden')) {
                        playHeroAnimation();
                        observer.disconnect();
                    }
                });
            });
            observer.observe(siteLoader, { attributes: true });
        }
    } else {
        playHeroAnimation();
    }

    // -----------------------------------------
    // 4. Scroll-triggered section reveals
    // -----------------------------------------
    gsap.registerPlugin(ScrollTrigger);
    
    // The site uses a custom scroll container
    ScrollTrigger.defaults({
        scroller: '.scroller'
    });



    // Reveal headers and content for other sections
    const sectionsToReveal = document.querySelectorAll('section:not(#home)');
    sectionsToReveal.forEach(section => {
        // Animate headers
        gsap.fromTo(section.querySelectorAll('.outcomes-header, .projects-header-wrapper, .category-title, .real-about-content h2'), {
            opacity: 0,
            y: 50
        }, {
            scrollTrigger: {
                trigger: section,
                start: "top 85%",
            },
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out"
        });

        // Animate grid items / cards / columns within each section
        const itemsToReveal = section.querySelectorAll('.project-card, .outcome-card, .testimonial-card, .real-about-col');
        if (itemsToReveal.length > 0) {
            gsap.fromTo(itemsToReveal, {
                opacity: 0,
                y: 60,
                scale: 0.95
            }, {
                scrollTrigger: {
                    trigger: itemsToReveal[0], // trigger when the first item comes into view
                    start: "top 85%",
                },
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: "back.out(1.2)"
            });
        }
    });

    // -----------------------------------------
    // 5. Project cards hover animations
    // -----------------------------------------
    const projectCards = document.querySelectorAll('.project-card');
    
    // Set initial transform perspective for 3D effect if desired, or just use scale
    projectCards.forEach(card => {
        const img = card.querySelector('img');
        
        // Ensure the card has overflow hidden for the ink-brush scale effect to look clean inside
        card.style.overflow = 'hidden';
        if (img) {
            img.style.transition = 'none'; // remove CSS transitions to let GSAP handle it
        }

        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                scale: 1.02,
                boxShadow: "0 10px 30px rgba(201, 168, 76, 0.4)", // gold glow matching var(--gold) which is usually #c9a84c
                duration: 0.4,
                ease: "power2.out"
            });
            
            if (img) {
                gsap.to(img, {
                    scale: 1.08,
                    duration: 0.6,
                    ease: "power2.out"
                });
            }
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                scale: 1,
                boxShadow: "none",
                duration: 0.4,
                ease: "power2.out"
            });
            
            if (img) {
                gsap.to(img, {
                    scale: 1,
                    duration: 0.6,
                    ease: "power2.out"
                });
            }
        });
    });

    // -----------------------------------------
    // 6. Premium Magnetic Hover Animations 
    // -----------------------------------------
    const magneticElements = document.querySelectorAll('.right-nav a, .left-socials a, .see-more-btn, .start-project-btn, .start-project-btn-mobile, .see-all-header-btn');
    
    magneticElements.forEach(elem => {
        // Prevent default transitions from fighting GSAP
        elem.style.transition = 'none';
        
        // Ensure inline elements can be transformed
        if (window.getComputedStyle(elem).display === 'inline') {
            elem.style.display = 'inline-block';
        }

        // --- Rolling Text Setup (Only for text links, not buttons with SVGs/complex HTML) ---
        const isPureTextLink = elem.classList.contains('active') || elem.closest('.right-nav') || elem.closest('.left-socials');
        if (isPureTextLink && !elem.querySelector('.char-wrapper')) {
            const text = elem.innerText;
            elem.innerHTML = ''; // Clear original text
            
            const splitTextArray = text.split('');
            splitTextArray.forEach((char) => {
                if (char === ' ') {
                    const space = document.createElement('span');
                    space.innerHTML = '&nbsp;';
                    elem.appendChild(space);
                    return;
                }

                const wrapper = document.createElement('span');
                wrapper.className = 'char-wrapper';
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.overflow = 'hidden';

                const char1 = document.createElement('span');
                char1.innerText = char;
                char1.style.display = 'inline-block';
                char1.className = 'char-normal';

                const char2 = document.createElement('span');
                char2.innerText = char;
                char2.style.display = 'inline-block';
                char2.style.position = 'absolute';
                char2.style.left = '0';
                char2.style.top = '100%';
                char2.style.color = '#c9a84c'; // Gold color for hover state
                char2.className = 'char-hover';

                wrapper.appendChild(char1);
                wrapper.appendChild(char2);
                elem.appendChild(wrapper);
            });
        }

        // Magnetic pull effect
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            // Calculate distance from center of the element
            const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
            const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
            
            gsap.to(elem, {
                x: x,
                y: y,
                duration: 0.4,
                ease: "power2.out"
            });
        });

        // Enter effect (scale, color, and staggered text roll)
        elem.addEventListener('mouseenter', () => {
            gsap.to(elem, {
                scale: 1.1,
                duration: 0.3,
                ease: "power2.out"
            });

            // Trigger staggered roll if it has char wrappers
            if (elem.querySelector('.char-wrapper')) {
                const normals = elem.querySelectorAll('.char-normal');
                const hovers = elem.querySelectorAll('.char-hover');
                
                gsap.to(normals, { yPercent: -100, stagger: 0.02, duration: 0.3, ease: "power2.out" });
                gsap.to(hovers, { yPercent: -100, stagger: 0.02, duration: 0.3, ease: "power2.out" });
            } else {
                gsap.to(elem, { color: "#c9a84c", duration: 0.3 });
            }
        });

        // Snap back to origin and roll down
        elem.addEventListener('mouseleave', () => {
            gsap.to(elem, {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.7,
                ease: "elastic.out(1, 0.3)"
            });

            if (elem.querySelector('.char-wrapper')) {
                const normals = elem.querySelectorAll('.char-normal');
                const hovers = elem.querySelectorAll('.char-hover');
                
                gsap.to(normals, { yPercent: 0, stagger: 0.02, duration: 0.3, ease: "power2.out" });
                gsap.to(hovers, { yPercent: 0, stagger: 0.02, duration: 0.3, ease: "power2.out" });
            } else {
                gsap.to(elem, { color: "", duration: 0.3 });
            }
        });
    });

    // -----------------------------------------
    // 7. Orchestrated Mobile Menu (Drawer)
    // -----------------------------------------
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    const menuCloseBtn = document.getElementById('menuCloseBtn');
    const menuLinksList = document.querySelectorAll('.menu-links a');
    const menuSocialsList = document.querySelectorAll('.menu-socials a');

    if (mobileMenuBtn && mobileMenuOverlay && mobileMenuBackdrop) {
        // Initial hidden states for staggered elements
        gsap.set(menuLinksList, { y: 30, opacity: 0 });
        gsap.set(menuSocialsList, { y: 20, opacity: 0 });
        gsap.set(menuCloseBtn, { rotation: -90, opacity: 0 });

        // Create the orchestrated timeline (paused by default)
        const menuTl = gsap.timeline({ paused: true, reversed: true });

        // 1. Un-hide the containers
        menuTl.set([mobileMenuOverlay], { display: 'flex' }, 0);
        menuTl.set([mobileMenuBackdrop], { display: 'block' }, 0);

        // 2. Animate backdrop fade and drawer slide
        menuTl.to(mobileMenuBackdrop, { opacity: 1, duration: 0.4, ease: "power2.inOut" }, 0);
        menuTl.to(mobileMenuOverlay, { x: "0%", duration: 0.5, ease: "power3.out" }, 0);

        // 3. Stagger the links and animate close button
        menuTl.to(menuLinksList, { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out" }, "-=0.2");
        menuTl.to(menuCloseBtn, { rotation: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }, "<");
        
        // 4. Stagger the socials
        menuTl.to(menuSocialsList, { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out" }, "-=0.3");

        // Toggle function
        const toggleMenu = () => {
            menuTl.reversed() ? menuTl.play() : menuTl.reverse();
        };

        // Bind events
        mobileMenuBtn.addEventListener('click', toggleMenu);
        menuCloseBtn.addEventListener('click', toggleMenu);
        mobileMenuBackdrop.addEventListener('click', toggleMenu); // Click outside to close

        menuLinksList.forEach(link => {
            link.addEventListener('click', () => {
                menuTl.reverse();
            });
        });
    }
});
