import DatesConfig from "../classes/reponse.class"
import ControlError from "../classes/error.class"
import utils from "../helpers/utils"
import objectHelpers from "../helpers/object.helpers"
import cacheHelpers from "../helpers/cache.helpers"

const CLIENT = 'av'
const TOKEN_IN_KV_AGE = 3000
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
  const { authorizationToken, statusCode } = await getToken(env)
  if (objectHelpers.isUndefined(authorizationToken)) {
    throw new ControlError('Invalid authorization token', statusCode)
  }
  return {
    ...CLIENTINFO.clientRequestHeaders,
    Authorization: authorizationToken,
  }
}

/**
* Get Token Using Client Credentials
* @returns {}
*/
const getToken = async (env) => { 
  let statusCode = 200
  let authorizationToken = await env.KVBD.get(CLIENT+`#authToken`)

  console.log('KV Search', authorizationToken)

  if (authorizationToken===null) {
    try {
      const { url, client_id, client_secret, resource, grant_type = 'client_credentials' } = CLIENTINFO.authAPIConfig || {}
      const params = new URLSearchParams({
          grant_type,
          client_id,
          client_secret,
          resource
      })

      const req = new Request(url, {
        method: 'POST',
        body: params.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }) 

      console.log('Pidio Token Req', JSON.stringify(CLIENTINFO.authAPIConfig,null,2))
      
      const authResponse = await fetch(req, { cf: { cacheTtl: 0 } })

      console.log('Pidio Token Res', JSON.stringify(authResponse,null,2))
  
      if (!authResponse.ok) {
        statusCode = 407
        authorizationToken = undefined
      } else {
        const authResData = await authResponse.json()    
        authorizationToken = authResData && authResData.access_token || undefined
        if (authorizationToken)  {
          await env.KVBD.put(CLIENT+"#authToken",authorizationToken,{expirationTtl: TOKEN_IN_KV_AGE})
        }
      }
    } catch (e) {
      statusCode = 499
      authorizationToken = undefined
    }  
  }
  
  return { authorizationToken, statusCode }
}

//-Build the query parameters to be used in the request to the client. 
const getQueryParametersForRequestToClient = async (origin, destination) => {
  return { routes: `${origin}-${destination}` }
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
    let validDates = [];
    Object.keys(data.dateYears).forEach(year => {
      Object.keys(data.dateYears[year]).forEach(month => {
        const vdays = data.dateYears[year][month].map(day => year+'-'+month.padStart(2,0)+'-'+String(day).padStart(2,0));
        validDates = [...validDates, ...vdays];
      });
    });
    validDates = validDates.sort();
    dateFrom = (route === 'departure') ? validDates[0] : dateFrom;
    if (sendValidDate) datesConfig[route].includedDates = validDates 
    else {
      const allDates = utils.fullRangeDates(dateFrom, validDates[validDates.length-1]);
      datesConfig[route].excludedDates = allDates.filter(d=>!validDates.includes(d));
    }
    datesConfig[route].minDate = dateFrom; 
    datesConfig[route].maxDate = validDates[validDates.length-1];
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
