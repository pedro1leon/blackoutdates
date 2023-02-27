import DatesConfig from "../classes/reponse.class"
import ControlError from "../classes/error.class"
import utils from "../helpers/utils"
import objectHelpers from "../helpers/object.helpers"
import cacheHelpers from "../helpers/cache.helpers"

const CLIENT = 'f9'
const TOKEN_IN_KV_AGE = 0
const SAVE_RESPONSE_IN_CACHE = true
const CACHE_MAX_AGE = 1800
const CLIENT_REQUEST_METHOD = "GET"
const MAKE_2_TRY = false

let CLIENTINFO

export const clientHandler = async (request, env, ctx) => {
  try {
    CLIENTINFO = JSON.parse(env[CLIENT.toLocaleUpperCase()])
    const url = request && request.url
    const requestPayload = await utils.validatePayload(request)

    const cache = caches.default
    let cacheKey;
    
    if (SAVE_RESPONSE_IN_CACHE) { // get response from cache
      cacheKey = await cacheHelpers.getCacheKey(url, requestPayload)
      const cachedRes = await cache.match(cacheKey)
      if (cachedRes) {
        return cachedRes 
      }
    }

    const responseFromClient = await getResponseFromClient(requestPayload, env)
    let transformedResponse = await transformResponseFromClient(responseFromClient)

    const options = cacheHelpers.getResponseOptions(CLIENT, requestPayload, SAVE_RESPONSE_IN_CACHE, CACHE_MAX_AGE)
    const response = new Response(JSON.stringify(transformedResponse), options)

    if (SAVE_RESPONSE_IN_CACHE) { // save response in cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()))
    }

    return response          
  } catch (error) {
    throw error      
  }
}

const getResponseFromClient = async (requestPayload, env) => {
  const { origin, destination, roundtrip } = requestPayload
  const responseFromClient = []

  const reqHeader = await getHeadersForRequestToClient(env)
  const reqParametersD = await getQueryParametersForRequestToClient(origin, destination)
  const reqBody = await getBodyForRequestToClient()
  
  const responseDeparture = await sendRequestToClient(reqHeader, reqParametersD, reqBody)  //get client data
  responseFromClient.push(responseDeparture)  

  if ((typeof(roundtrip)==='boolean' && roundtrip===true) || 
      (typeof(roundtrip)==='string' && 
      (roundtrip.toUpperCase()==='RT' || roundtrip.toUpperCase()==='TRUE'))) {
        const reqParametersR = await getQueryParametersForRequestToClient(destination, origin)
        const responseReturn = await sendRequestToClient(reqHeader, reqParametersR, reqBody) 
    responseFromClient.push(responseReturn)
  }
  responseFromClient.push({})

  return responseFromClient
}

//-Build the headers to be used in the request to the client. 
const getHeadersForRequestToClient = async (env) => {
  return {
    ...CLIENTINFO.clientRequestHeaders,
  }
}

//-Build the query parameters to be used in the request to the client. 
const getQueryParametersForRequestToClient = async (origin, destination) => {
  return { 'calendarSelectableDays.origin': `${origin}`, 'calendarSelectableDays.destination': `${destination}`, _: '1583877704636'}
}

//-Build the request body to be used in the request to the client. 
const getBodyForRequestToClient = async () => {
  return undefined
}

const sendRequestToClient = async (reqHeader, reqParameters, reqBody) => {
  const url = new URL(CLIENTINFO.clientRequestUrl)
  const reqMethod = CLIENT_REQUEST_METHOD

  url.search = new URLSearchParams(reqParameters).toString()
  const options = {
    headers: reqHeader,
    body: reqBody,
    method: reqMethod
  }

  let clientResponse = await getClientResponse(url.toString(), options)
  const { errorRes, statusRes } = clientResponse

  if (MAKE_2_TRY && statusRes && statusRes != 200) {
    // todo if any action is needed
    clientResponse = await getClientResponse(url.toString(), options)
    const { errorRes, statusRes } = clientResponse  
    if (statusRes && statusRes != 200) throw new ControlError(errorRes, statusRes)
  }
  
  if (statusRes && statusRes != 200) throw new ControlError(errorRes, statusRes)

  return clientResponse 
}
const getClientResponse = async (url, options) => utils.fetchClient(url, options)

//-Transforms the client response to a final response format
const transformResponseFromClient = async (clientResponse) => {
  const datesConfig = new DatesConfig();
  let dateFrom = '';

  const getRouteDates = (data, route, sendValidDate) => {
    if (Array.isArray(data.calendarSelectableDays.disabledDates) && data.calendarSelectableDays.disabledDates.length) {
      datesConfig[route].minDate = new Date().toJSON().slice(0,10)
      datesConfig[route].maxDate = new Date(data.calendarSelectableDays.lastAvailableDate).toJSON().slice(0,10)
      datesConfig[route].excludedDates = data.calendarSelectableDays.disabledDates.map(day => {
        const vd = day.split("/")
        return vd[2] + '-' + vd[0].padStart(2,0) + '-' + vd[1].padStart(2,0)
      })  
    }
  }
  
  const resDataDeparture = await clientResponse[0] 
  const resDataReturn = await clientResponse[1]

  try {
    const resDeparture = JSON.parse(resDataDeparture);
    getRouteDates(resDeparture, 'departure', false);
    if (!objectHelpers.isEmpty(resDataReturn)) {
      const resReturn = JSON.parse(resDataReturn);
      getRouteDates(resReturn, 'return', false);
    }
    objectHelpers.cleanObject(datesConfig)
    return datesConfig
  } catch (e) {
    throw new ControlError(`Response transformation failed. ${e && e.message}.`, 412)
  }
}

export default clientHandler
