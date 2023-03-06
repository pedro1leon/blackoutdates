import { Router } from '../node_modules/itty-router'
import ControlError from "./classes/error.class"

import avHandler from "./handlers/avianca"
import syHandler from "./handlers/sun-country"
import f9Handler from "./handlers/frontier"
import f8Handler from "./handlers/flair"

const router = Router()

router.get('/', () => new Response('Welcome to EveryMundo Cloudflare !!'))  //Root route

router.options("*", () => {
  return new Response("OK", {
    headers: {
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*"
    }
  });
});

router.post('/av', (request, env, ctx) => avHandler(request, env, ctx))
router.post('/sy', (request, env, ctx) => syHandler(request, env, ctx))
router.post('/f9', (request, env, ctx) => f9Handler(request, env, ctx))
router.post('/f8', (request, env, ctx) => f8Handler(request, env, ctx))

router.all('*', (request) => {
  const pathname = new URL(request.url).pathname
  throw new ControlError(`BlackoutDates are no implemented for Cliente ${pathname}`, 422)
}) 

export default {
  fetch: (request, env, ctx) => router
    .handle(request, env, ctx)
    .then(response => {
      // can modify response here before final return, e.g. CORS headers
      return response
    })
    .catch(err => {
      const statusError = err instanceof ControlError ? err.code : 500
      return new Response(err.message, { 
        status: `${statusError}`, 
        headers: { 
          'content-type': 'application/json;charset=UTF-8'
        }  
      })
    })
}
