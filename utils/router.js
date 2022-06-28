/**
 * A basic router to let me use regex matching for requests
 */
export default class Router {
    static handlers = {
        status(code, message, request, response) {
            response.writeHead(code, {
                "Content-Type": "text/plain",
                "Cache-Control": "no-cache, no-store",
            });

            response.end(`${code}: ${message}`);
        },
        badRequest(request, response) {
            Router.handlers.status(400, "Bad Request", request, response);
        },
        unauthorized(request, response) {
            Router.handlers.status(401, "Unauthorized", request, response);
        },
        forbidden(request, response) {
            Router.handlers.status(403, "Forbidden", request, response);
        },
        notFound(request, response) {
            Router.handlers.status(404, "Not Found", request, response);
        },
        serverError(request, response) {
            Router.handlers.status(
                500,
                "Internal Server Error",
                request,
                response
            );
        },
    };

    #host = "";
    #defaultHandler = Router.handlers.notFound;
    #routes = {
        options: [],
        head: [],
        get: [],
        post: [],
        put: [],
        patch: [],
        delete: [],
    };

    /**
     * Set the hostname required to respond to a request
     *
     * @param {string} host A valid scheme://hostname or scheme://hostname:port
     */
    setHost(host) {
        try {
            this.#host = new URL(host).host;
        } catch (e) {
            console.error("Failed to convert given hostname to URL object");
        }
    }

    /**
     * Add a route to the router
     *
     * @param {string} method The HTTP method to match against
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    route(method, path, handler) {
        const lowerCased = method.toLowerCase();
        if (this.#routes.hasOwnProperty(lowerCased))
            this.#routes[lowerCased].push({
                path,
                handler,
                isRegex: path instanceof RegExp,
            });
    }

    /**
     * Add a route to the router bound to the HTTP OPTIONS method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    options(path, handler) {
        this.route("options", path, handler);
    }

    /**
     * Add a route to the router bound to the HTTP HEAD method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    head(path, handler) {
        this.route("head", path, handler);
    }

    /**
     * Add a route to the router bound to the HTTP GET method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    get(path, handler) {
        this.route("get", path, handler);
    }

    /**
     * Add a route to the router bound to the HTTP POST method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    post(path, handler) {
        this.route("post", path, handler);
    }

    /**
     * Add a route to the router bound to the HTTP PUT method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    put(path, handler) {
        this.route("put", path, handler);
    }

    /**
     * Add a route to the router bound to the HTTP PATCH method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    patch(path, handler) {
        this.route("patch", path, handler);
    }

    /**
     * Add a route to the router bound to the HTTP DELETE method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => {}} handler
     */
    delete(path, handler) {
        this.route("delete", path, handler);
    }

    /**
     * Add a route to the router
     *
     * @param {(url: URL, request, response) => {}} handler
     */
    default(handler) {
        this.#defaultHandler = handler;
    }

    /**
     * Run the router on a request and try to match it to
     * one of our routes
     *
     * @param {http.IncomingMessage} request
     * @param {http.ServerResponse} response
     */
    async run(request, response) {
        const url = new URL(request.url, `https://${request.headers.host}`);

        if (url.host !== this.#host) {
            console.error(
                "HTTP Server: bad request, host name and port do not match configured host"
            );
            Router.handlers.badRequest(request, response);
            return;
        }

        const method = request.method.toLowerCase();

        if (this.#routes.hasOwnProperty(method)) {
            for (const route of this.#routes[method]) {
                if (route.isRegex) {
                    const params = url.pathname.match(route.path);

                    if (!params) {
                        continue;
                    }

                    return await route.handler(
                        request,
                        response,
                        url,
                        params.groups
                    );
                } else if (route.path === url.pathname) {
                    return await route.handler(request, response, url);
                }
            }
        }

        return await this.#defaultHandler(request, response, url);
    }
}
