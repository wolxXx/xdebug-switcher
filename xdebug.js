class XdebugHelper {
    constructor() {
        this.enabled = false;
        this.cookieName = 'XDEBUG_SESSION';
        this.variations = {
            'XDEBUG_ECLIPSE': 'eclipse',
            'netbeans-xdebug': 'netbeans',
            'macgdbp': 'macgdbp',
            'PHPSTORM': 'PHPStorm',
        };
        this.handler = null;
        this.checkIfEnabled();
    }

    checkIfEnabled() {
        this.enabled = false;
        if (document.cookie.indexOf(this.cookieName) > -1) {
            this.enabled = true;
        }
        return this;
    }

    show() {
        if (null === this.handler) {
            this.handler = document.createElement('div');
            document.body.appendChild(this.handler);
            this.handler.style = 'display: block; position: fixed; bottom: 0; left: 0; background: #000; color: #fff; font-size: 12px; text-align: left; padding: 2px; cursor: pointer;';
            this.handler.classList.add('xdebug-helper');
            this.handler.addEventListener('click', () => {
                this.enabled = !this.enabled;
                if (true === this.enabled) {
                    this.setCookie(this.cookieName, 'PHPSTORM');
                }
                if (false === this.enabled) {
                    this.unsetCookie(this.cookieName);
                }
                this
                    .checkIfEnabled()
                    .show()
                ;
            });
        }
        if (true === this.enabled) {
            this.handler.innerHTML = 'Xdebug is enabled.'
            this.handler.style.color = '#32a309'
        }
        if (false === this.enabled) {
            this.handler.innerHTML = 'Xdebug is disabled.'
            this.handler.style.color = '#d50e0e'
        }
        return this;
    }

    setCookie(name, value) {
        const date = new Date();
        date.setTime(date.getTime() + (666 * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
        return this;
    }

    unsetCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        return this;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new XdebugHelper()
        .show()
    ;
});