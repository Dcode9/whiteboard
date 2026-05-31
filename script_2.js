        // Check if Tailwind loaded
        window.onload = function() {
            if (!window.tailwind) {
                console.warn("Tailwind CSS failed to load via CDN.");
            }
        }
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                },
