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

    constructor() {
        this.#checkIfEnabled();
        this.#createHandlerDomElement();
        this.#addHandlers();
        this.#show();
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
        this.#handlerDomElement.style = 'display: block; position: fixed; bottom: 0; left: 0; background: #000; color: #fff; font-size: 12px; text-align: left; padding: 2px; cursor: pointer;';
        this.#handlerDomElement.classList.add('xdebug-helper');

        return this;
    }

    #addHandlers() {
        this.#handlerDomElement.addEventListener('click', () => {
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

        this.#handlerDomElement.addEventListener('contextmenu', (e) => this.#onContextMenu(e));

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

        if (false === this.#enabled) {
            message = 'Xdebug is disabled';
            color = '#d50e0e';
        } else if (this.#currentValue) {
            message += ' (' + this.#currentValue + ')';
        }

        this.#handlerDomElement.innerHTML = message + '.';
        this.#handlerDomElement.style.color = color;

        return this;
    }

    #setCookie(name, value) {
        const date = new Date();
        date.setTime(date.getTime() + (666 * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
        console.log('enabled xdebug cookie: ' + value);

        return this;
    }

    #unsetCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        console.log('disabled xdebug cookie');

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
    console.log('loading xdebug helper');
    new XdebugHelper();
    console.log('loaded xdebug helper');
});