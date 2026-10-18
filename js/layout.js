// Load the shared header and footer on every page.
async function loadLayout() {
    const sections = [
        { id: 'site-header', file: 'components/header.html' },
        { id: 'site-footer', file: 'components/footer.html' }
    ];

    for (const section of sections) {
        const target = document.getElementById(section.id);

        if (!target) {
            continue;
        }

        try {
            const response = await fetch(section.file);

            if (!response.ok) {
                throw new Error(`Unable to load ${section.file}`);
            }

            target.innerHTML = await response.text();
        } catch (error) {
            console.error('Shared layout error:', error);
            target.textContent = 'Unable to load website navigation.';
        }
    }
}

loadLayout();
