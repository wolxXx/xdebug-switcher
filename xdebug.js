class XdebugHelper {
    #enabled = false;
    #cookieName = 'XDEBUG_SESSION';
    #variations = {
        'XDEBUG_ECLIPSE': 'eclipse',
        'netbeans-xdebug': 'netbeans',
        'macgdbp': 'macgdbp',
        'PHPSTORM': 'PHPStorm',
    };
    #currentVariation = this.#variations.PHPSTORM;
    #handlerDomElement = null;
    #menuElement = null;
    #currentValue = null;
    #positionCookieName = 'XDEBUG_HELPER_POS';
    #compactCookieName = 'XDEBUG_HELPER_COMPACT';
    #compactMode = false;
    #isDragging = false;
    #dragStartX = 0;
    #dragStartY = 0;
    #dragInitialX = 0;
    #dragInitialY = 0;
    #dragMoved = false;
    #resizeObserver = null;

    constructor() {
        this.#checkIfEnabled();
        this.#loadCompactMode();
        this.#createHandlerDomElement();
        this.#show();
        this.#addHandlers();
        this.#setupResizeHandler();
    }

    #checkIfEnabled() {
        const val = this.#getCookie(this.#cookieName);
        this.#enabled = val !== null && val !== '';
        this.#currentValue = val;

        return this;
    }

    #createHandlerDomElement() {
        this.#handlerDomElement = document.createElement('div');
        document.body.appendChild(this.#handlerDomElement);
        this.#handlerDomElement.style = 'display: block; position: fixed; background: #000; color: #fff; font-size: 12px; text-align: left; padding: 2px; cursor: pointer; z-index: 10000;';
        this.#handlerDomElement.classList.add('xdebug-helper');

        this.#handlerDomElement.style.bottom = '0';
        this.#handlerDomElement.style.left = '0';

        return this;
    }

    #addHandlers() {
        this.#handlerDomElement.addEventListener('mousedown', (e) => {
            if (e.button !== 0) {
                return;
            }
            this.#isDragging = true;
            this.#dragMoved = false;
            this.#dragStartX = e.clientX;
            this.#dragStartY = e.clientY;
            const rect = this.#handlerDomElement.getBoundingClientRect();
            this.#dragInitialX = rect.left;
            this.#dragInitialY = rect.top;

            const onMouseMove = (e) => {
                if (!this.#isDragging) {
                    return;
                }
                const dx = e.clientX - this.#dragStartX;
                const dy = e.clientY - this.#dragStartY;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    this.#dragMoved = true;
                }

                let nextX = this.#dragInitialX + dx;
                let nextY = this.#dragInitialY + dy;

                // Constrain to viewport
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const rect = this.#handlerDomElement.getBoundingClientRect();

                nextX = Math.max(0, Math.min(nextX, vw - rect.width));
                nextY = Math.max(0, Math.min(nextY, vh - rect.height));

                // Snap to edges
                const distLeft = nextX;
                const distRight = vw - (nextX + rect.width);
                const distTop = nextY;
                const distBottom = vh - (nextY + rect.height);

                const minDist = Math.min(distLeft, distRight, distTop, distBottom);

                if (minDist === distLeft) {
                    nextX = 0;
                } else if (minDist === distRight) {
                    nextX = vw - rect.width;
                } else if (minDist === distTop) {
                    nextY = 0;
                } else if (minDist === distBottom) {
                    nextY = vh - rect.height;
                }

                this.#handlerDomElement.style.left = nextX + 'px';
                this.#handlerDomElement.style.top = nextY + 'px';
                this.#handlerDomElement.style.bottom = 'auto';
            };

            const onMouseUp = () => {
                this.#isDragging = false;
                if (this.#dragMoved) {
                    this.#savePosition();
                }
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        this.#handlerDomElement.addEventListener('click', (e) => {
            if (this.#dragMoved) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            this.#enabled = !this.#enabled;
            if (true === this.#enabled) {
                this.#setCookie(this.#cookieName, this.#currentVariation);
                this.#currentValue = this.#currentVariation;
            }
            if (false === this.#enabled) {
                this.#unsetCookie(this.#cookieName);
                this.#currentValue = null;
            }
            this
                .#checkIfEnabled()
                .#show()
            ;
        });

        this.#handlerDomElement.addEventListener('contextmenu', (e) => {
            this.#onContextMenu(e);
        });

        document.addEventListener('click', (e) => {
            if (this.#menuElement && !this.#menuElement.contains(e.target) && e.target !== this.#handlerDomElement) {
                this.#closeMenu();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.#closeMenu();
            }
        });

        return this;
    }

    #show() {
        let message = 'Xdebug is enabled';
        let color = '#32a309';
        const hint = 'click right for context menu';

        if (false === this.#enabled) {
            message = 'Xdebug is disabled';
            color = '#d50e0e';
        } else if (this.#currentValue) {
            message += ' (' + this.#currentValue + ')';
        }


        if (this.#compactMode) {
            this.#handlerDomElement.innerHTML = 'XD';
            this.#handlerDomElement.title = message + ' (' + hint + ')';
        } else {
            this.#handlerDomElement.innerHTML = message + '.';
            this.#handlerDomElement.title = hint;
        }
        this.#handlerDomElement.style.color = color;

        // If the size changed, we might need to adjust the position to keep it relative
        if (this.#getCookie(this.#positionCookieName)) {
            this.#loadPosition();
        }

        return this;
    }

    #loadCompactMode() {
        this.#compactMode = this.#getCookie(this.#compactCookieName) === '1';
    }

    #saveCompactMode() {
        this.#setCookie(this.#compactCookieName, this.#compactMode ? '1' : '0');
    }

    #savePosition() {
        const rect = this.#handlerDomElement.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Store relative position as percentages (0-100)
        // We use the top/left position relative to the viewport size minus element size
        const rangeX = vw - rect.width;
        const rangeY = vh - rect.height;

        let relX = rangeX > 0 ? (rect.left / rangeX) * 100 : 0;
        let relY = rangeY > 0 ? (rect.top / rangeY) * 100 : 0;

        // Clamp values
        relX = Math.max(0, Math.min(100, relX));
        relY = Math.max(0, Math.min(100, relY));

        const pos = relX.toFixed(2) + ',' + relY.toFixed(2);
        this.#setCookie(this.#positionCookieName, pos);
    }

    #loadPosition() {
        const pos = this.#getCookie(this.#positionCookieName);
        if (pos) {
            const [relX, relY] = pos.split(',').map(Number);
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = this.#handlerDomElement.getBoundingClientRect();

            const rangeX = vw - rect.width;
            const rangeY = vh - rect.height;
            const x = rangeX > 0 ? (relX / 100) * rangeX : 0;
            const y = rangeY > 0 ? (relY / 100) * rangeY : 0;

            this.#handlerDomElement.style.left = Math.round(x) + 'px';
            this.#handlerDomElement.style.top = Math.round(y) + 'px';
            this.#handlerDomElement.style.bottom = 'auto';
            this.#constrainToViewport();
        }
    }

    #setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.#loadPosition();
        });
    }

    #constrainToViewport() {
        if (!this.#handlerDomElement) {
            return;
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = this.#handlerDomElement.getBoundingClientRect();

        let nextX = rect.left;
        let nextY = rect.top;

        // Ensure it's within bounds
        nextX = Math.max(0, Math.min(nextX, vw - rect.width));
        nextY = Math.max(0, Math.min(nextY, vh - rect.height));

        // Re-snap to nearest edge if window size changed
        const distLeft = nextX;
        const distRight = vw - (nextX + rect.width);
        const distTop = nextY;
        const distBottom = vh - (nextY + rect.height);

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        if (minDist === distLeft) {
            nextX = 0;
        } else if (minDist === distRight) {
            nextX = vw - rect.width;
        } else if (minDist === distTop) {
            nextY = 0;
        } else if (minDist === distBottom) {
            nextY = vh - rect.height;
        }

        this.#handlerDomElement.style.left = nextX + 'px';
        this.#handlerDomElement.style.top = nextY + 'px';
        this.#handlerDomElement.style.bottom = 'auto';
    }

    #setCookie(name, value) {
        const date = new Date();
        date.setTime(date.getTime() + (666 * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";

        return this;
    }

    #unsetCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        return this;
    }

    #getCookie(name) {
        const cname = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie || '');
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(cname) === 0) {
                return c.substring(cname.length, c.length);
            }
        }
        return null;
    }

    #onContextMenu(e) {
        e.preventDefault();
        this.#openMenu(e.clientX, e.clientY);
    }

    #createMenu() {
        if (this.#menuElement) {
            // rebuild content but reuse element
            this.#menuElement.innerHTML = '';
        } else {
            this.#menuElement = document.createElement('div');
            this.#menuElement.classList.add('xdebug-helper-menu');
            Object.assign(this.#menuElement.style, {
                position: 'absolute',
                background: '#111',
                color: '#fff',
                border: '1px solid #444',
                padding: '4px 0',
                fontSize: '12px',
                minWidth: '160px',
                zIndex: '99999',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            });
            document.body.appendChild(this.#menuElement);
        }

        // Build options from variations
        const addItem = (label, value, isActive = false) => {
            const item = document.createElement('div');
            item.textContent = label;
            Object.assign(item.style, {
                padding: '6px 10px',
                cursor: 'pointer',
                background: isActive ? '#1f6feb' : 'transparent',
                color: isActive ? '#fff' : '#fff'
            });
            item.addEventListener('mouseenter', () => {
                item.style.background = '#333';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = isActive ? '#1f6feb' : 'transparent';
            });
            item.addEventListener('click', () => {
                if (value === null) {
                    this.#unsetCookie(this.#cookieName);
                    this.#enabled = false;
                    this.#currentValue = null;
                } else {
                    this.#setCookie(this.#cookieName, value);
                    this.#enabled = true;
                    this.#currentValue = value;
                    this.#currentVariation = value;
                }
                this.#closeMenu();
                this.#checkIfEnabled().#show();
            });
            this.#menuElement.appendChild(item);
        };

        // Variation options
        Object.entries(this.#variations).forEach(([cookieValue, label]) => {
            addItem(label, cookieValue, this.#currentValue === cookieValue);
        });

        // Separator
        const sep = document.createElement('div');
        Object.assign(sep.style, {height: '1px', background: '#333', margin: '4px 0'});
        this.#menuElement.appendChild(sep);

        // Disable item
        addItem('Disable', null, this.#enabled === false);

        // Separator
        const sep2 = document.createElement('div');
        Object.assign(sep2.style, {height: '1px', background: '#333', margin: '4px 0'});
        this.#menuElement.appendChild(sep2);

        // Compact Mode toggle
        const compactItem = document.createElement('div');
        compactItem.textContent = this.#compactMode ? 'Standard Mode' : 'Compact Mode';
        Object.assign(compactItem.style, {
            padding: '6px 10px',
            cursor: 'pointer',
            background: 'transparent',
            color: '#fff'
        });
        compactItem.addEventListener('mouseenter', () => {
            compactItem.style.background = '#333';
        });
        compactItem.addEventListener('mouseleave', () => {
            compactItem.style.background = 'transparent';
        });
        compactItem.addEventListener('click', () => {
            this.#compactMode = !this.#compactMode;
            this.#saveCompactMode();
            this.#show();
            this.#loadPosition(); // Recalculate position based on new size
            this.#closeMenu();
        });
        this.#menuElement.appendChild(compactItem);

        return this.#menuElement;
    }

    #openMenu(x, y) {
        this.#createMenu();
        // Position within viewport
        const menu = this.#menuElement;
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        // Adjust if going out of viewport
        const rect = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left = x;
        let top = y;
        if (rect.right > vw) {
            left = Math.max(0, vw - rect.width - 4);
        }
        if (rect.bottom > vh) {
            top = Math.max(0, vh - rect.height - 4);
        }
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
    }

    #closeMenu() {
        if (this.#menuElement) {
            this.#menuElement.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new XdebugHelper();
});