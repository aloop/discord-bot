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
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    route(method, path, handler, constraints = {}) {
        const lowerCased = method.toLowerCase();
        if (this.#routes.hasOwnProperty(lowerCased))
            this.#routes[lowerCased].push({
                path,
                handler,
                constraints,
                isRegex: path instanceof RegExp,
            });
    }

    /**
     * Add a route to the router bound to the HTTP OPTIONS method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    options(path, handler, constraints = {}) {
        this.route("options", path, handler, constraints);
    }

    /**
     * Add a route to the router bound to the HTTP HEAD method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    head(path, handler, constraints = {}) {
        this.route("head", path, handler, constraints);
    }

    /**
     * Add a route to the router bound to the HTTP GET method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    get(path, handler, constraints = {}) {
        this.route("get", path, handler, constraints);
    }

    /**
     * Add a route to the router bound to the HTTP POST method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    post(path, handler, constraints = {}) {
        this.route("post", path, handler, constraints);
    }

    /**
     * Add a route to the router bound to the HTTP PUT method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    put(path, handler, constraints = {}) {
        this.route("put", path, handler, constraints);
    }

    /**
     * Add a route to the router bound to the HTTP PATCH method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    patch(path, handler, constraints = {}) {
        this.route("patch", path, handler, constraints);
    }

    /**
     * Add a route to the router bound to the HTTP DELETE method
     *
     * @param {string|RegExp} path The path to match against
     * @param {(req, res, url: URL, params?: Object) => void} handler The Route handler
     * @param {{ [paramName: string]: (param: string) => bool  }} constraints An object containing constraint functions for route param values
     */
    delete(path, handler, constraints = {}) {
        this.route("delete", path, handler, constraints);
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

                    const constraints = Object.entries(route.constraints);

                    for (const [paramName, constraint] of constraints) {
                        if (
                            paramName in params.groups &&
                            !constraint(params.groups[paramName])
                        ) {
                            return Router.handlers.badRequest(
                                request,
                                response
                            );
                        }
                    }

                    return await route.handler(
                        request,
                        response,
                        url,
                        params.groups
                    );
                } else if (route.path === url.pathname) {
                    // We don't apply any constraints to string path handlers
                    // because there are no params.
                    return await route.handler(request, response, url);
                }
            }
        }

        return await this.#defaultHandler(request, response, url);
    }
}
