# airmodules-blackout-dates-worker
Cloudflare worker for handling blackout dates info from clients

# Local development
## Add new client handler 
In order to add new handler for a specific client follow these steps:

1. Create a new file [clientName].js in ./src/handlers/
2. Import <client>Handler from "./handlers/[clientName]"
3. Add the route router.post('/<client>', (request, env, ctx) => <client>Handler(request, env, ctx))
4. Develop the corresponding handler.
