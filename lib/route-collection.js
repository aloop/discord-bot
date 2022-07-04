const regex = {
    hasParam: /.*\/:.*/gu,
    paramName: /^[a-zA-Z0-9\-_]+$/g,
};

// Helper functions
const notEmpty = (str) => str !== "";
const isParam = (segment) => segment.startsWith(":");

class ParamSegment {
    name = null;
    constructor(name) {
        this.name = name;
    }
}

export class RouteCollection {
    #routes = new Set();

    add(route, data = null) {
        const processedRoute = [];
        const segments = route.split("/").filter(notEmpty);

        for (const segment of segments) {
            // Route parameter
            if (isParam(segment)) {
                const param = segment.slice(1);

                if (!param.match(regex.paramName)) {
                    throw new Error(
                        `Invalid route parameter name: ":${param}". Only letters, numbers, _, and - are allowed`
                    );
                }

                processedRoute.push(new ParamSegment(param));
            } else {
                processedRoute.push(segment);
            }
        }

        this.#routes.add({
            path: processedRoute,
            data,
        });

        return this;
    }

    find(path) {
        const segments = path.split("/").filter(notEmpty);

        for (const route of this.#routes) {
            if (Array.isArray(route.path)) {
                // if we don't have the same number of segments, we aren't going to match
                if (route.path.length !== segments.length) {
                    continue;
                }

                let params;
                let i = 0;
                for (const routeSegment of route.path) {
                    if (routeSegment instanceof ParamSegment) {
                        if (!params) {
                            params = {};
                        }

                        params[routeSegment.name] = segments[i];
                    } else if (routeSegment !== segments[i]) {
                        params = null;
                        break;
                    }

                    i++;
                }

                if (!params) {
                    continue;
                }

                return route.data !== null
                    ? {
                          data: route.data,
                          params,
                      }
                    : {
                          params,
                      };
            } else if (route.path === path) {
                return route.data !== null
                    ? {
                          data: route.data,
                      }
                    : {};
            }
        }

        return false;
    }
}
