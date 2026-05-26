document.addEventListener('DOMContentLoaded', () => {
    
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //             MOBILE MENU TOGGLE
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const menuOverlay = document.getElementById('mobileMenuOverlay');
    const menuCloseBtn = document.getElementById('menuCloseBtn');

    if (menuBtn && menuOverlay) {
        menuBtn.addEventListener('click', () => {
            menuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (menuCloseBtn && menuOverlay) {
        menuCloseBtn.addEventListener('click', () => {
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Smooth scroll to certificate
    const btnScrollToCert = document.getElementById('btnScrollToCert');
    const certSection = document.getElementById('licenseCertificate');
    if (btnScrollToCert && certSection) {
        btnScrollToCert.addEventListener('click', () => {
            certSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Set today's date by default on inputs
    const contractDateInput = document.getElementById('contractDate');
    const designerSigDate = document.getElementById('designerSigDate');
    const clientSigDate = document.getElementById('clientSigDate');
    const certDate = document.getElementById('certDate');

    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; // Months start at 0
    let dd = today.getDate();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    const formattedISO = `${yyyy}-${mm}-${dd}`;
    const formattedDisplay = `${dd} / ${mm} / ${yyyy}`;

    if (contractDateInput) contractDateInput.value = formattedISO;
    if (designerSigDate) designerSigDate.value = formattedDisplay;
    if (clientSigDate) clientSigDate.value = formattedDisplay;
    if (certDate) certDate.textContent = formattedDisplay;

    // Generate dynamic Certificate reference number
    const certRefNumber = document.getElementById('refNumber');
    const certRefDisplay = document.getElementById('certRefNumber');
    if (certRefDisplay) {
        const randomHex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
        const refCode = `LIC – ${yyyy}${mm}${dd} – ${randomHex}`;
        certRefDisplay.textContent = refCode;
    }


    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //         INPUT MIRRORING & TWO-WAY SYNC
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    const designerName = document.getElementById('designerName');
    const clientName = document.getElementById('clientName');
    const projectName = document.getElementById('projectName');

    const certDesignerName = document.getElementById('certDesignerName');
    const certClientName = document.getElementById('certClientName');
    const certProjectName = document.getElementById('certProjectName');

    const designerPrintName = document.getElementById('designerPrintName');
    const clientPrintName = document.getElementById('clientPrintName');
    const certDesignerPrintName = document.getElementById('certDesignerPrintName');
    const certClientPrintName = document.getElementById('certClientPrintName');

    // Sync input value directly to textNode elements
    function syncValue(input, elementsToSync, fallback = '') {
        input.addEventListener('input', () => {
            const val = input.value.trim() || fallback;
            elementsToSync.forEach(el => {
                if (el.tagName === 'INPUT') {
                    el.value = input.value;
                } else {
                    el.textContent = val;
                }
            });
        });
    }

    if (designerName && certDesignerName) {
        syncValue(designerName, [certDesignerName, designerPrintName, certDesignerPrintName], 'Huroof Studio');
    }
    if (clientName && certClientName) {
        syncValue(clientName, [certClientName, clientPrintName, certClientPrintName], '[Client Name]');
    }
    if (projectName && certProjectName) {
        syncValue(projectName, [certProjectName], '[Project Name]');
    }
    if (designerPrintName && certDesignerPrintName) {
        syncValue(designerPrintName, [certDesignerPrintName], 'Huroof Studio');
    }
    if (clientPrintName && certClientPrintName) {
        syncValue(clientPrintName, [certClientPrintName], '[Client Name]');
    }

    // Mirror date changes from Contract Date to Certificate Date
    if (contractDateInput && certDate) {
        contractDateInput.addEventListener('change', () => {
            if (contractDateInput.value) {
                const parts = contractDateInput.value.split('-');
                if (parts.length === 3) {
                    const formatted = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
                    certDate.textContent = formatted;
                    
                    // Update signature dates as well
                    if (designerSigDate) designerSigDate.value = formatted;
                    if (clientSigDate) clientSigDate.value = formatted;
                }
            } else {
                certDate.textContent = '[DD / MM / YYYY]';
            }
        });
    }

    // Sync from Certificate ContentEditable back to inputs
    function setupEditableSync(editable, input, fallback = '') {
        editable.addEventListener('input', () => {
            const text = editable.textContent.trim();
            input.value = text === fallback ? '' : text;
            
            // Trigger input event programmatically to fire other dependencies
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        });
        
        // Select all text on click for better UX
        editable.addEventListener('focus', () => {
            document.execCommand('selectAll', false, null);
        });
    }

    if (certDesignerName && designerName) {
        setupEditableSync(certDesignerName, designerName, 'Huroof Studio');
    }
    if (certClientName && clientName) {
        setupEditableSync(certClientName, clientName, '[Client Name]');
    }
    if (certProjectName && projectName) {
        setupEditableSync(certProjectName, projectName, '[Project Name]');
    }


    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //         DIGITAL SIGNATURE CANVAS LOGIC
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    
    // Keeps track of signature states (drawn image data URLs)
    const signatureData = {
        designer: {
            mode: 'draw', // 'draw' or 'type'
            drawnData: null,
            typedText: 'Huroof Studio'
        },
        client: {
            mode: 'draw',
            drawnData: null,
            typedText: ''
        }
    };

    function setupSignaturePad(canvasId, clearBtnClass, party) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        // Scale canvas coordinates for Retina display sharp rendering
        function scaleCanvas() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            // Set styles (must be reset after resizing)
            ctx.strokeStyle = '#c9a84c'; // Gold color
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Redraw signature if one existed
            if (signatureData[party].drawnData) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, rect.width, rect.height);
                };
                img.src = signatureData[party].drawnData;
            }
        }

        // Initialize and bind scale
        scaleCanvas();
        window.addEventListener('resize', scaleCanvas);

        // Core draw helper
        function draw(e) {
            if (!isDrawing) return;
            
            // Support touch + mouse
            let clientX, clientY;
            if (e.touches && e.touches[0]) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();

            lastX = x;
            lastY = y;
        }

        // Draw Listeners (Mouse)
        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            lastX = e.clientX - rect.left;
            lastY = e.clientY - rect.top;
        });

        canvas.addEventListener('mousemove', draw);
        
        const stopDrawing = () => {
            if (isDrawing) {
                isDrawing = false;
                // Save path
                signatureData[party].drawnData = canvas.toDataURL();
                updateCertificateSignature(party);
            }
        };

        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);

        // Draw Listeners (Touch)
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches[0]) {
                isDrawing = true;
                const rect = canvas.getBoundingClientRect();
                lastX = e.touches[0].clientX - rect.left;
                lastY = e.touches[0].clientY - rect.top;
                e.preventDefault(); // Prevents scroll overlay while signing
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            draw(e);
            e.preventDefault();
        });

        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);

        // Clear button
        const clearBtn = document.querySelector(`.clear-sig-btn[data-party="${party}"]`);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                signatureData[party].drawnData = null;
                updateCertificateSignature(party);
            });
        }

        return canvas;
    }

    // Initialize signature canvases
    setupSignaturePad('designerSigCanvas', 'clear-sig-btn', 'designer');
    setupSignaturePad('clientSigCanvas', 'clear-sig-btn', 'client');


    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //         SIGNATURE METHOD TOGGLING (DRAW vs TYPE)
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    const tabBtns = document.querySelectorAll('.sig-tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const party = btn.getAttribute('data-party');
            const type = btn.getAttribute('data-type');
            
            // Toggle tab buttons active state
            document.querySelectorAll(`.sig-tab-btn[data-party="${party}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show/hide correct containers
            const drawContainer = document.getElementById(`${party}DrawContainer`);
            const typeContainer = document.getElementById(`${party}TypeContainer`);

            if (type === 'draw') {
                drawContainer.classList.remove('hidden');
                typeContainer.classList.add('hidden');
                signatureData[party].mode = 'draw';
            } else {
                drawContainer.classList.add('hidden');
                typeContainer.classList.remove('hidden');
                signatureData[party].mode = 'type';
            }

            updateCertificateSignature(party);
        });
    });

    // Handle Typed Signature Changes
    const designerTypeInput = document.getElementById('designerSigTypeInput');
    const clientTypeInput = document.getElementById('clientSigTypeInput');
    const designerTypePreview = document.getElementById('designerSigTextPreview');
    const clientTypePreview = document.getElementById('clientSigTextPreview');

    if (designerTypeInput && designerTypePreview) {
        designerTypeInput.addEventListener('input', () => {
            const val = designerTypeInput.value || 'Huroof Studio';
            designerTypePreview.textContent = val;
            signatureData.designer.typedText = val;
            updateCertificateSignature('designer');
        });
    }

    if (clientTypeInput && clientTypePreview) {
        clientTypeInput.addEventListener('input', () => {
            const val = clientTypeInput.value || 'Client Signature';
            clientTypePreview.textContent = val;
            signatureData.client.typedText = val;
            updateCertificateSignature('client');
        });
    }

    // Update Signatures rendering on the certificate based on current modes
    const certDesignerSigImg = document.getElementById('certDesignerSigImage');
    const certDesignerSigTyped = document.getElementById('certDesignerSigTyped');
    const certClientSigImg = document.getElementById('certClientSigImage');
    const certClientSigTyped = document.getElementById('certClientSigTyped');

    function updateCertificateSignature(party) {
        const mode = signatureData[party].mode;
        
        if (party === 'designer') {
            if (mode === 'draw') {
                certDesignerSigTyped.classList.add('hidden');
                if (signatureData.designer.drawnData) {
                    certDesignerSigImg.src = signatureData.designer.drawnData;
                    certDesignerSigImg.classList.remove('hidden');
                } else {
                    certDesignerSigImg.classList.add('hidden');
                }
            } else {
                certDesignerSigImg.classList.add('hidden');
                certDesignerSigTyped.textContent = signatureData.designer.typedText;
                certDesignerSigTyped.classList.remove('hidden');
            }
        } else if (party === 'client') {
            if (mode === 'draw') {
                certClientSigTyped.classList.add('hidden');
                if (signatureData.client.drawnData) {
                    certClientSigImg.src = signatureData.client.drawnData;
                    certClientSigImg.classList.remove('hidden');
                } else {
                    certClientSigImg.classList.add('hidden');
                }
            } else {
                certClientSigImg.classList.add('hidden');
                certClientSigTyped.textContent = signatureData.client.typedText || 'Client Signature';
                certClientSigTyped.classList.remove('hidden');
            }
        }
    }


    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //         LOGO ATTACHMENT / FILE UPLOADER
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    const uploadZone = document.getElementById('logoUploadZone');
    const fileInput = document.getElementById('logoFileSelect');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('logoPreviewContainer');
    const previewImg = document.getElementById('logoPreviewImg');
    const btnRemoveLogo = document.getElementById('btnRemoveLogo');

    if (uploadZone && fileInput) {
        // Trigger select file click
        uploadZone.addEventListener('click', (e) => {
            if (e.target !== btnRemoveLogo && !btnRemoveLogo.contains(e.target)) {
                fileInput.click();
            }
        });

        // Drag & drop highlight
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
            }, false);
        });

        // Handle Dropped file
        uploadZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleLogoFile(files[0]);
            }
        });

        // Handle Browsed file
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleLogoFile(fileInput.files[0]);
            }
        });
    }

    function handleLogoFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please attach an image file (PNG, JPG, SVG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            placeholder.classList.add('hidden');
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // Remove Logo Button
    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering file chooser dialog
            previewImg.src = '';
            fileInput.value = '';
            previewContainer.classList.add('hidden');
            placeholder.classList.remove('hidden');
        });
    }


    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //             PDF PRINT ACTIONS
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    const btnExportFull = document.getElementById('btnExportFull');
    const btnExportCert = document.getElementById('btnExportCert');

    if (btnExportFull) {
        btnExportFull.addEventListener('click', () => {
            window.print();
        });
    }

    if (btnExportCert) {
        btnExportCert.addEventListener('click', () => {
            // Apply class to body to hide everything but certificate, trigger print, then restore
            document.body.classList.add('print-only-cert');
            
            // Let the layout update in the browser stack
            setTimeout(() => {
                window.print();
                
                // Remove class on complete/cancellation
                setTimeout(() => {
                    document.body.classList.remove('print-only-cert');
                }, 500);
            }, 100);
        });
    }

    // Fallback: Listen to afterprint event to clean up print-only styles reliably
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('print-only-cert');
    });

});
