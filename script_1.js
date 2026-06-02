        window.onerror = function(msg, url, line, col, error) {
            var errorBox = document.getElementById('global-error-box');
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML += '<div><strong>Error:</strong> ' + msg + '<br><small>' + url + ':' + line + '</small></div><hr style="margin:5px 0;border-color:rgba(255,255,255,0.3)">';
            }
            console.error("Global Error:", msg, error);
            // Hide loading screen if error occurs so we can see the error
            var loader = document.getElementById('app-loading');
            if(loader) loader.style.display = 'none';
            return false;
        };
    </script>

    <!-- CRITICAL CSS: Inline styles for Loading Screen & Error Box (No Tailwind Dependency) -->
    <style>
        /* Spinner Animation */
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Loading Overlay - Pure CSS to ensure it renders before external scripts */
        #app-loading {
            position: fixed;
            inset: 0;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #f3f4f6;
            z-index: 2147483647; /* Max Z-Index */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: sans-serif;
            color: #4b5563;
            transition: opacity 0.3s ease-out;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb; /* Light grey */
            border-top: 4px solid #3b82f6; /* Blue */
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        /* Error Box Style */
        #global-error-box {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #ef4444;
            color: white;
            padding: 1rem;
            z-index: 2147483648; /* Above loading screen */
            font-family: monospace;
            font-size: 14px;
            max-height: 50vh;
            overflow: auto;
            border-bottom: 2px solid #7f1d1d;
        }
    </style>

    <!-- Load Tailwind CSS -->
