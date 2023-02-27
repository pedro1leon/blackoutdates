import ControlError from "../classes/error.class"
import utils from "../helpers/utils"

const CLIENT = 'av'
const SAVE_RESPONSE_IN_CACHE = 0
const CACHE_MAX_AGE = 300
const CLIENT_REQUEST_METHOD = "GET"
const MAX_RETRY_ATTEMPS = 0

export const clientHandler = async (request, env, ctx) => {
  try {
    const CLIENTINFO = JSON.parse(env.AV);

    const url = request && request.url
    const requestPayload = await utils.validatePayload(request)  
    const { origin, destination, roundtrip } = requestPayload

    const response = new Response(`Avianca ${origin} ${destination} ${roundtrip}`)

    return response          
  } catch (error) {
    throw error      
  }
}

export default clientHandler