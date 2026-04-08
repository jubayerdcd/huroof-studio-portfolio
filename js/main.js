const animWrapper = document.getElementById('animWrapper');
const sections = document.querySelectorAll('section[data-pos]');
const navLinks = document.querySelectorAll('.right-nav a');

// ── Site Loader ──
const siteLoader = document.getElementById('siteLoader');
const animLayers = [
    document.querySelector('.layer-bottom'),
    document.querySelector('.layer-center'),
    document.querySelector('.layer-top')
];

if (siteLoader) {
    let loadedCount = 0;
    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount === animLayers.filter(Boolean).length || loadedCount >= 3) {
            setTimeout(() => {
                siteLoader.classList.add('hidden');
            }, 600); // 600ms grace period to enjoy the loader and let JS/CSS settle
        }
    };

    const validLayers = animLayers.filter(Boolean);
    if (validLayers.length > 0) {
        validLayers.forEach(img => {
            if (img.complete) {
                checkAllLoaded();
            } else {
                img.addEventListener('load', checkAllLoaded);
                img.addEventListener('error', checkAllLoaded); 
            }
        });
    } else {
        window.addEventListener('load', () => {
            siteLoader.classList.add('hidden');
        });
    }
}

// ── Outcomes Dynamic Rendering ──
const outcomeItems = [
    { serial: 4, type: 'video', src: 'assets/final-outcome-carholder-images/boite-verte.mp4' },
    { serial: 5, type: 'video', src: 'assets/final-outcome-carholder-images/mobile-cover.mp4' },
    { serial: 1, type: 'video', src: 'assets/final-outcome-carholder-images/tableware.mp4' },
    { serial: 2, type: 'image', src: 'assets/final-outcome-carholder-images/the-lantern-1.webp' },
    { serial: 3, type: 'image', src: 'assets/final-outcome-carholder-images/chandeliear.webp' },
    { serial: 7, type: 'image', src: 'assets/final-outcome-carholder-images/packaging.webp' },
    { serial: 6, type: 'image', src: 'assets/final-outcome-carholder-images/panjabi.webp' },
    { serial: 8, type: 'image', src: 'assets/final-outcome-carholder-images/tableware.webp' }
];

function renderOutcomes() {
    const carousel = document.getElementById('outcomesCarousel');
    const indicators = document.getElementById('outcomesIndicators');
    if (!carousel || !indicators) return;

    // Sort by serial number
    const sortedItems = [...outcomeItems].sort((a, b) => a.serial - b.serial);

    carousel.innerHTML = sortedItems.map(item => {
        if (item.type === 'video') {
            return `<div class="outcome-card"><video src="${item.src}" autoplay loop muted playsinline></video></div>`;
        } else {
            return `<div class="outcome-card"><img src="${item.src}" alt="Outcome"></div>`;
        }
    }).join('');

    indicators.innerHTML = sortedItems.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('');

    // Re-bind dots
    const dots = indicators.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            const maxScroll = carousel.scrollWidth - carousel.clientWidth;
            const targetScroll = (i / (dots.length - 1)) * maxScroll;
            carousel.scrollTo({ left: targetScroll, behavior: 'smooth' });
        });
    });
}
renderOutcomes();

// ── SCROLL CONTROL VARIABLES ──
let activePos = 'home';
let targetWorksScroll = 0; // Added globally to sync across triggers
const carousel = document.getElementById('outcomesCarousel');
const scroller = document.querySelector('.scroller');

// ✨ PLAY WITH THIS VALUE TO ADJUST THE CAROUSEL SIDE-SCROLL TIME (in milliseconds) ✨
const AUTO_SLIDE_TIME_MS = 2000; // 2 seconds

let autoSlideInterval;
const startAutoSlide = () => {
    if (!carousel) return;
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        let nextScroll = carousel.scrollLeft + 340;
        if (nextScroll > maxScroll + 10) nextScroll = 0;
        carousel.scrollTo({ left: nextScroll, behavior: 'smooth' });
    }, AUTO_SLIDE_TIME_MS);
};
const stopAutoSlide = () => clearInterval(autoSlideInterval);

// ── Section Intersection Observer ──
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const pos = entry.target.dataset.pos;

        // Handle Nested Entry Direction for Works Section
        if (pos === 'works' && activePos !== 'works') {
            const worksGrid = document.querySelector('.works-content');
            if (worksGrid) {
                if (activePos === 'outcomes' || activePos === 'contact') {
                    // Entered from Below (Scroll UP) -> Start at the BOTTOM of the nested grid
                    worksGrid.scrollTop = worksGrid.scrollHeight;
                    targetWorksScroll = worksGrid.scrollHeight;
                } else {
                    // Entered from Above (Scroll DOWN) -> Start at the TOP of the nested grid
                    worksGrid.scrollTop = 0;
                    targetWorksScroll = 0;
                }
            }
        }

        activePos = pos;
        const id = entry.target.id;

        // Update animation position class
        if (animWrapper) {
            animWrapper.className = 'pos-' + pos;
        }

        // Update nav active state
        navLinks.forEach(a => {
            a.classList.toggle('active', a.dataset.target === id);
        });

        // Carousel auto-slide control has been moved to a dedicated observer below
    });
}, { threshold: 0.25 });

sections.forEach(s => observer.observe(s));

// ── Dedicated Carousel Visibility Observer ──
let isCarouselVisible = false;
if (carousel) {
    let carouselObserver;
    // Desktop starts early (0.1), Mobile waits for 80% visibility (0.8)
    let currentThreshold = window.innerWidth > 1024 ? 0.1 : 0.8;

    const setupCarouselObserver = () => {
        if (carouselObserver) carouselObserver.disconnect();
        carouselObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isCarouselVisible = entry.isIntersecting;
                if (isCarouselVisible) {
                    startAutoSlide();
                } else {
                    stopAutoSlide();
                }
            });
        }, { threshold: currentThreshold });
        carouselObserver.observe(carousel);
    };

    setupCarouselObserver();

    window.addEventListener('resize', () => {
        const newThreshold = window.innerWidth > 1024 ? 0.1 : 0.8;
        if (currentThreshold !== newThreshold) {
            currentThreshold = newThreshold;
            setupCarouselObserver();
        }
    });
}

// ── Scroll Position Persistence (sessionStorage) ──
if (scroller) {
    try {
        const savedScroll = sessionStorage.getItem('scrollerPos');
        if (savedScroll !== null && parseInt(savedScroll) > 0) {
            // 1. Hide scroller INSTANTLY so user never sees the home page flash
            scroller.style.visibility = 'hidden';
            
            // 2. Temporarily disable scroll-snap so the browser doesn't fight us
            scroller.style.scrollSnapType = 'none';
            
            // 3. Set position silently
            scroller.scrollTop = parseInt(savedScroll);
            
            // 4. Reveal after a micro-delay to let the browser settle
            requestAnimationFrame(() => {
                scroller.scrollTop = parseInt(savedScroll);
                // Re-enable snap and reveal
                setTimeout(() => {
                    scroller.style.scrollSnapType = '';
                    scroller.style.visibility = '';
                }, 50);
            });
        }

        // Save scroll position on every scroll (debounced)
        let saveTimeout;
        scroller.addEventListener('scroll', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                try { sessionStorage.setItem('scrollerPos', scroller.scrollTop); } catch(e) {}
            }, 150);
        }, { passive: true });

        // Also save immediately before page unload
        window.addEventListener('beforeunload', () => {
             try { sessionStorage.setItem('scrollerPos', scroller.scrollTop); } catch(e) {}
        });
    } catch (e) {
        console.warn('SessionStorage blocked by local file:// policy. Scroll persistence disabled.');
    }
}

// ── Tab switching ──
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ── Service pill toggle ──
document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
        pill.classList.toggle('active');
    });
});

// ── Nav click Direct Animation Transit ──
let isDirectTransit = false;
let transitStart = null;
let transitEnd = null;
let transitProgress = 0;

const menuLinks = document.querySelectorAll('.right-nav a, .menu-links a');
menuLinks.forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        
        let targetId = a.dataset.target;
        if (!targetId) {
            const href = a.getAttribute('href');
            if (href) targetId = href.replace('#', '');
        }
        
        const target = document.getElementById(targetId);
        if (target && targetId !== activePos) {
            // Close mobile menu if open
            const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
            if (mobileMenuOverlay && mobileMenuOverlay.classList.contains('active')) {
                mobileMenuOverlay.classList.remove('active');
            }

            // 1. Capture exact currently rendered animation frame from the lerp engine
            const startIndex = Math.floor(smoothScrollIndex);
            const MathFraction = smoothScrollIndex - startIndex;
            const endIndex = Math.min(animStops.length - 1, startIndex + 1);
            
            transitStart = {
                left: lerp(animStops[startIndex].left, animStops[endIndex].left, MathFraction),
                top: lerp(animStops[startIndex].top, animStops[endIndex].top, MathFraction),
                scale: lerp(animStops[startIndex].scale, animStops[endIndex].scale, MathFraction),
                opacity: lerp(animStops[startIndex].opacity, animStops[endIndex].opacity, MathFraction),
                xOffset: lerp(animStops[startIndex].xOffset, animStops[endIndex].xOffset, MathFraction),
                yOffset: lerp(animStops[startIndex].yOffset, animStops[endIndex].yOffset, MathFraction)
            };

            // 2. Determine targeted destination frame
            let targetIndex = Array.from(sections).indexOf(target);
            if (targetIndex === -1) targetIndex = 0;
            transitEnd = animStops[targetIndex];

            // 3. Initiate Straight-Line Transit Engine override
            isDirectTransit = true;
            transitProgress = 0;
            
            // 4. Trigger native smooth page scroll, eliminating the "average" black fade out screen
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Removed Horizontal Scroll Interception for Outcomes so mouse wheel scrolls normally

// ── Outcomes Carousel Indicators Update ──
if (carousel) {
    carousel.addEventListener('scroll', () => {
        const dots = document.querySelectorAll('#outcomesIndicators .dot');
        if (dots.length === 0) return;

        const scrollLeft = carousel.scrollLeft;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        let dotIndex = 0;
        if (maxScroll > 0) {
            dotIndex = Math.round((scrollLeft / maxScroll) * (dots.length - 1));
        }
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === dotIndex);
        });
    });

    // ── Mouse Drag-to-Scroll & Pause Logic ──
    let isDragging = false;
    let startX;
    let initialScrollLeft;

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        // Disable scroll sorting physics natively so dragging isn't jittery
        carousel.style.scrollSnapType = 'none';
        carousel.style.cursor = 'grabbing';
        
        startX = e.pageX - carousel.offsetLeft;
        initialScrollLeft = carousel.scrollLeft;
        stopAutoSlide();
    });

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        // Restore browser snap
        carousel.style.scrollSnapType = '';
        carousel.style.cursor = '';
        
        if (isCarouselVisible) startAutoSlide();
    };

    carousel.addEventListener('mouseleave', endDrag);
    carousel.addEventListener('mouseup', endDrag);

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 1; // True 1:1 tracking matching mobile physically
        carousel.scrollLeft = initialScrollLeft - walk;
    });

    // Prevent native image dragging from ruining the drag experience
    carousel.addEventListener('dragstart', (e) => e.preventDefault());

    // For touch devices, pause on interaction
    carousel.addEventListener('touchstart', stopAutoSlide, { passive: true });
    carousel.addEventListener('touchend', () => {
        if (isCarouselVisible) startAutoSlide();
    });

    // Arrow controls (Hidden in latest requested layout but logic kept)
    const prevBtn = document.getElementById('prevCard');
    const nextBtn = document.getElementById('nextCard');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            carousel.scrollTo({ left: carousel.scrollLeft - 340, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            const maxScroll = carousel.scrollWidth - carousel.clientWidth;
            let nextScroll = carousel.scrollLeft + 340;
            if (nextScroll > maxScroll + 10) nextScroll = 0;
            carousel.scrollTo({ left: nextScroll, behavior: 'smooth' });
        });
    }
}

// ── Mobile Menu Toggle ──
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const menuCloseBtn = document.getElementById('menuCloseBtn');
const mobileMenuLinks = document.querySelectorAll('.menu-links a');

if (mobileMenuBtn && mobileMenuOverlay && menuCloseBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuOverlay.classList.add('active');
    });
    menuCloseBtn.addEventListener('click', () => {
        mobileMenuOverlay.classList.remove('active');
    });
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('active');
        });
    });
}

// ── Interactive Parallax Animation ──
const layerWrappers = document.querySelectorAll('.layer-wrapper');
const parallaxIntensities = [4, 8, 14];

window.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;

    const deltaX = (clientX - innerWidth / 2) / (innerWidth / 2);
    const deltaY = (clientY - innerHeight / 2) / (innerHeight / 2);

    layerWrappers.forEach((wrapper, index) => {
        const intensity = parallaxIntensities[index];
        const x = deltaX * intensity;
        const y = deltaY * intensity;
        wrapper.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// ── Form Pill Toggle Logic ──
const formPills = document.querySelectorAll('.form-pill');
formPills.forEach(pill => {
    pill.addEventListener('click', function () {
        this.classList.toggle('active');
    });
});

// ── Budget Slider Logic ──
const budgetRange = document.querySelector('.budget-range');
const budgetFill = document.querySelector('.budget-fill');
const budgetLabels = document.querySelectorAll('.budget-labels span');
const budgetDots = document.querySelectorAll('.budget-dot');

if (budgetRange && budgetFill && budgetLabels.length > 0) {
    const updateSlider = () => {
        const val = parseFloat(budgetRange.value);
        const max = parseFloat(budgetRange.max);
        const roundedVal = Math.round(val);

        // Update track fill
        const percentage = val / max;
        budgetFill.style.width = `${12.5 + (percentage * 75)}%`;

        // Update active label styling
        budgetLabels.forEach((label, index) => {
            if (index === roundedVal) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });

        // Update dots state
        if (budgetDots && budgetDots.length > 0) {
            budgetDots.forEach((dot, index) => {
                if (index <= roundedVal) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    };

    budgetRange.addEventListener('input', updateSlider);
    
    // Snap properly on release
    budgetRange.addEventListener('change', () => {
        budgetRange.value = Math.round(budgetRange.value);
        updateSlider();
    });

    // Also allow clicking labels directly to snap the slider to that budget
    budgetLabels.forEach((label, index) => {
        label.addEventListener('click', () => {
            budgetRange.value = index;
            updateSlider();
        });
    });

    // Allow clicking budget dots to jump to values
    if (budgetDots && budgetDots.length > 0) {
        budgetDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                budgetRange.value = index;
                updateSlider();
            });
        });
    }

    const budgetInner = document.querySelector('.budget-slider-inner');
    if (budgetInner) {
        budgetInner.addEventListener('click', (e) => {
            if (e.target.classList.contains('budget-dot') || e.target.tagName.toLowerCase() === 'span' || e.target.classList.contains('budget-range')) return;
            const rect = budgetInner.getBoundingClientRect();
            // inner width fully maps to percentages now without thumb offsets
            let x = e.clientX - rect.left;
            let percentage = Math.max(0, Math.min(1, x / rect.width));
            budgetRange.value = Math.round(percentage * parseInt(budgetRange.max));
            updateSlider();
        });
    }

    // Initialize state on load
    updateSlider();
}

// ── Smooth Scrolling for Works Section Inner Grid ──
const worksContent = document.querySelector('.works-content');
if (worksContent) {
    let isWorksScrolling = false;
    let isTransitioning = false;

    worksContent.addEventListener('wheel', (e) => {
        if (activePos !== 'works' || window.innerWidth <= 800 || isTransitioning) return;

        const maxScroll = worksContent.scrollHeight - worksContent.clientHeight;
        const atTop = targetWorksScroll <= 0 && e.deltaY < 0;
        const atBottom = targetWorksScroll >= maxScroll && e.deltaY > 0;

        // Instantly break the nested scroll trap if trying to scroll out of bounds
        if (atTop) {
            e.preventDefault();
            isTransitioning = true;
            // Native snap command pointing strictly to previous height
            scroller.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            setTimeout(() => { isTransitioning = false; }, 1200);
            return;
        }
        if (atBottom) {
            e.preventDefault();
            isTransitioning = true;
            // Native snap command pointing strictly to next height
            scroller.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
            setTimeout(() => { isTransitioning = false; }, 1200);
            return;
        }

        // Custom smooth scroll interpolation
        e.preventDefault();
        targetWorksScroll += e.deltaY * 1.5;
        targetWorksScroll = Math.max(0, Math.min(maxScroll, targetWorksScroll));

        if (!isWorksScrolling) {
            isWorksScrolling = true;
            updateWorksScroll();
        }
    }, { passive: false });

    function updateWorksScroll() {
        const currentWorksScroll = worksContent.scrollTop;
        const nextScroll = currentWorksScroll + (targetWorksScroll - currentWorksScroll) * 0.08;

        if (Math.abs(targetWorksScroll - currentWorksScroll) < 1.0) {
            worksContent.scrollTop = targetWorksScroll;
            isWorksScrolling = false;
        } else {
            worksContent.scrollTop = nextScroll;
            requestAnimationFrame(updateWorksScroll);
        }
    }

    worksContent.addEventListener('scroll', () => {
        if (!isWorksScrolling) targetWorksScroll = worksContent.scrollTop;
    }, { passive: true });
}

// ── Contact Form File Manager & AJAX Submit ──
const contactForm = document.getElementById('contactForm');
const fileUpload = document.getElementById('designUpload');
const fileTagsContainer = document.getElementById('fileTagsContainer');
const submitBtn = document.getElementById('submitFormBtn');

if (contactForm && fileUpload && fileTagsContainer) {
    let selectedFiles = [];

    // Sync physical files from input
    fileUpload.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        newFiles.forEach(file => {
            // Prevent exact duplicates
            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        });
        renderFileTags();
        syncFileInput();
    });

    function renderFileTags() {
        fileTagsContainer.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const tag = document.createElement('div');
            tag.className = 'file-tag';

            // Clean length if filename is too long
            const maxLen = 22;
            let displayName = file.name;
            if (displayName.length > maxLen) {
                const extIndex = displayName.lastIndexOf(".");
                const ext = extIndex > -1 ? displayName.slice(extIndex) : '';
                displayName = displayName.substring(0, maxLen - ext.length - 3) + '...' + ext;
            }

            tag.innerHTML = `
                <span>${displayName}</span>
                <button type="button" class="remove-btn" data-index="${index}">&times;</button>
            `;
            fileTagsContainer.appendChild(tag);
        });

        // Add delete listeners
        const removeBtns = fileTagsContainer.querySelectorAll('.remove-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                selectedFiles.splice(idx, 1);
                renderFileTags();
                syncFileInput();
            });
        });
    }

    function syncFileInput() {
        // Use DataTransfer object to sync JS file array to HTML input element securely
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        fileUpload.files = dt.files;
    }

    // Handle AJAX FormSubmit
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Sync visual pills and budget into hidden text inputs before payload shipment
        const activePills = Array.from(document.querySelectorAll('.pill-group .form-pill.active'))
            .map(p => p.textContent.trim())
            .join(', ');
        const hiddenServices = document.getElementById('hiddenServices');
        if (hiddenServices) hiddenServices.value = activePills || 'None';

        const activeBudget = document.querySelector('.budget-labels span.active');
        const hiddenBudget = document.getElementById('hiddenBudget');
        if (hiddenBudget && activeBudget) hiddenBudget.value = activeBudget.textContent.trim();

        // Prepare full form boundary data
        const formData = new FormData(contactForm);

        // Update UI button state
        const originalBtnHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = 'SENDING...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.pointerEvents = 'none';

        fetch('https://formsubmit.co/ajax/jubayerdcd@gmail.com', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    submitBtn.innerHTML = 'SENT ✔';
                    submitBtn.style.backgroundColor = 'rgba(201, 168, 76, 0.2)';
                    submitBtn.style.borderColor = 'var(--gold)';
                    submitBtn.style.color = 'var(--gold)';
                    submitBtn.style.opacity = '1';

                    // Clear form entirely
                    contactForm.reset();
                    selectedFiles = [];
                    renderFileTags();
                    syncFileInput();

                    // If there are pill groups, visually reset them? Optional.

                    // Revert success msg after 5s
                    setTimeout(() => {
                        submitBtn.innerHTML = originalBtnHTML;
                        submitBtn.style = ''; // clear inline overrides
                    }, 5000);
                } else {
                    throw new Error('FormSubmit rejected transmission');
                }
            })
            .catch(error => {
                console.error(error);
                submitBtn.innerHTML = 'ERROR ⚠';
                submitBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                submitBtn.style.borderColor = 'red';
                submitBtn.style.color = '#ff4a4a';
                setTimeout(() => {
                    submitBtn.innerHTML = originalBtnHTML;
                    submitBtn.style = '';
                }, 3000);
            });
    });
}

// ── ADVANCED SMOOTH SCROLL-LINKED ANIMATION ──
const layerCenter = document.querySelector('.layer-center');
const layerTop = document.querySelector('.layer-top');

const animStops = [
    { left: 50, top: 50, scale: 1, opacity: 1, xOffset: -50, yOffset: -50 },       // 0: Home
    { left: 50, top: 110, scale: 1.4, opacity: 1, xOffset: -50, yOffset: -50 },     // 1: About Hero
    { left: -20, top: 50, scale: 1, opacity: 1, xOffset: 0, yOffset: -50 },         // 2: Works
    { left: 100, top: 50, scale: 1, opacity: 1, xOffset: -65, yOffset: -50 },       // 3: Outcomes
    { left: 50, top: 50, scale: 0.8, opacity: 0, xOffset: -50, yOffset: -50 },      // 4: Real About
    { left: 50, top: 50, scale: 0.8, opacity: 0, xOffset: -50, yOffset: -50 }       // 5: Contact
];

let smoothScrollIndex = 0;
let centerRotation = 0;
let topRotation = 0;

// Initialize smoothScrollIndex to correct position on refresh (avoid lerp-from-0 swoosh)
try {
    if (scroller && sessionStorage.getItem('scrollerPos')) {
        const scrollY = parseInt(sessionStorage.getItem('scrollerPos'));
        const sectionOffsets = Array.from(sections).map(s => s.offsetTop);
        for (let i = 0; i < sectionOffsets.length - 1; i++) {
            if (scrollY >= sectionOffsets[i] && scrollY < sectionOffsets[i + 1]) {
                const range = sectionOffsets[i + 1] - sectionOffsets[i];
                smoothScrollIndex = i + (range > 0 ? (scrollY - sectionOffsets[i]) / range : 0);
                break;
            }
        }
        if (scrollY >= sectionOffsets[sectionOffsets.length - 1]) {
            smoothScrollIndex = sectionOffsets.length - 1;
        }
    }
} catch (e) {
    // sessionStorage blocked by local security policy
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

function renderScrollAnimation() {
    // Continuous rotation
    centerRotation += (360 / (500 * 60));
    topRotation -= (360 / (500 * 60));
    if (layerCenter) layerCenter.style.transform = `rotate(${centerRotation}deg)`;
    if (layerTop) layerTop.style.transform = `rotate(${topRotation}deg)`;

    // Calculate exact section mappings based on their physical offsetTop
    const scrollY = scroller.scrollTop;
    const sectionOffsets = Array.from(sections).map(s => s.offsetTop);

    let targetScrollIndex = 0;
    for (let i = 0; i < sectionOffsets.length - 1; i++) {
        if (scrollY >= sectionOffsets[i] && scrollY < sectionOffsets[i + 1]) {
            const range = sectionOffsets[i + 1] - sectionOffsets[i];
            const fraction = range > 0 ? (scrollY - sectionOffsets[i]) / range : 0;
            targetScrollIndex = i + fraction;
            break;
        }
    }
    if (scrollY >= sectionOffsets[sectionOffsets.length - 1]) {
        targetScrollIndex = sectionOffsets.length - 1;
    }

    if (isDirectTransit) {
        // --- OVERRIDE DIRECT TRANSIT ---
        // Progress interpolates from 0 to 1
        transitProgress += 0.025; // Roughly 650ms duration matching standard browser smooth scroll
        
        let eased = transitProgress < 0.5 ? 4 * transitProgress * transitProgress * transitProgress : 1 - Math.pow(-2 * transitProgress + 2, 3) / 2;

        if (transitProgress >= 1) {
            isDirectTransit = false;
            eased = 1;
        }

        // Keep the underlying smooth engine completely synced dynamically so no jump occurs when we release override
        smoothScrollIndex = targetScrollIndex; 

        if (window.innerWidth > 800 && animWrapper) {
            const left = lerp(transitStart.left, transitEnd.left, eased);
            const top = lerp(transitStart.top, transitEnd.top, eased);
            const scale = lerp(transitStart.scale, transitEnd.scale, eased);
            const opacity = lerp(transitStart.opacity, transitEnd.opacity, eased);
            const xOffset = lerp(transitStart.xOffset, transitEnd.xOffset, eased);
            const yOffset = lerp(transitStart.yOffset, transitEnd.yOffset, eased);

            animWrapper.style.left = `${left}%`;
            animWrapper.style.top = `${top}%`;
            animWrapper.style.transform = `translate(${xOffset}%, ${yOffset}%) scale(${scale})`;
            animWrapper.style.opacity = Math.max(0, opacity);
            animWrapper.style.position = 'fixed';
        }
    } else {
        // --- REGULAR LERP ENGINE --- 
        smoothScrollIndex = lerp(smoothScrollIndex, targetScrollIndex, 0.08);

        if (window.innerWidth > 800 && animWrapper) {
            // Find adjacent stops
            const startIndex = Math.floor(smoothScrollIndex);
            const endIndex = Math.min(animStops.length - 1, startIndex + 1);
            const fraction = smoothScrollIndex - startIndex;

            const start = animStops[startIndex];
            const end = animStops[endIndex];

            // Interpolate properties
            const left = lerp(start.left, end.left, fraction);
            const top = lerp(start.top, end.top, fraction);
            const scale = lerp(start.scale, end.scale, fraction);
            const opacity = lerp(start.opacity, end.opacity, fraction);
            const xOffset = lerp(start.xOffset, end.xOffset, fraction);
            const yOffset = lerp(start.yOffset, end.yOffset, fraction);

            animWrapper.style.left = `${left}%`;
            animWrapper.style.top = `${top}%`;
            animWrapper.style.transform = `translate(${xOffset}%, ${yOffset}%) scale(${scale})`;
            animWrapper.style.opacity = Math.max(0, opacity);
            animWrapper.style.position = 'fixed';
        } else if (animWrapper) {
            // Mobile fallback
            animWrapper.style.left = '';
            animWrapper.style.top = '';
            animWrapper.style.transform = '';
            animWrapper.style.opacity = '1';
        }
    }

    requestAnimationFrame(renderScrollAnimation);
}
requestAnimationFrame(renderScrollAnimation);
