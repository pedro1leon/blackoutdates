import ControlError from '../classes/error.class'
import validateRequest from '../schemas/request.validate' 
import objectHelpers from './object.helpers'

/**
* Fetch client and return text response
* @returns {}
*/
const fetchClient = async (url, options) => {
  const req = new Request(url, options)
  const letCodes = [400, 401, 403, 404, 405,407, 408, 429]
  const response = await fetch(req, { cf: { cacheTtl: 0 } })
  if (!response.ok) {
    const stsError = letCodes.includes(response.status) ? response.status : 424 
    return  { "errorRes": 'Client API responded with error', "statusRes":  `${stsError}` }
  }
  return response.text()
}

/**
* Get Token Using Client Credentials
* @returns {}
*/
const getTokenWithCredentials = async (CLIENT, CLIENTINFO, env, TOKEN_IN_KV_AGE) => { 
  let statusCode = 200
  let authorizationToken = await env.KVBD.get(CLIENT+`#authToken`)

  if (authorizationToken===null) {
    try {
      const { url, subscriptionKey } = CLIENTINFO.authAPIConfig || {}
      const oHeaders = new Headers();
      oHeaders.append("Ocp-Apim-Subscription-Key", `${subscriptionKey}`);
      oHeaders.append("Content-Type", "application/json");
      oHeaders.append("User-Agent", "em-blackoutdate/1.0.0");
  
      const req = new Request(url, {
        method: 'POST',
        headers: oHeaders
      }) 
  
      const authResponse = await fetch(req, { cf: { cacheTtl: 0 } })
  
      if (!authResponse.ok) {
        statusCode = 407
        authorizationToken = undefined
      } else {
        const authResData = await authResponse.json()      
        authorizationToken = authResData && authResData.data && authResData.data.token || undefined
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

/*
* Gets the payload of a Http request and validate it
* @param request
* @returns {Promise<*>}
*/
const validatePayload = async (request) => {
  let payload
  try {
    payload = await request.json();      
  } catch (e) {
    throw new ControlError(`Invalid Request payload. ${e && e.message}`, 413)
  }
  const validationResult = {
    true: false,
    errors: 'Invalid schema for validation'
  }
  try {
    validationResult.valid = validateRequest(payload)
    validationResult.valid = objectHelpers.isUndefined(validationResult.valid) || validationResult.valid
    validationResult.errors = validateRequest.errors  
  } catch (e) {
    throw new ControlError(`Failed Request Validation. ${e && e.message}`, 413)
  }
  if (!validationResult.valid) {
    const errorMessage = `Request Validation Failed. ${validationResult.errors ? ` ${JSON.stringify(validationResult.errors)}` : ''}`
    throw new ControlError(`${errorMessage}`, 413)
  }
  return payload
}

/**
* Returns array of dates 
* @returns {*[]}
*/
const fullRangeDates = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const aDates = [];
  for(var dt=start; dt<=end; dt.setDate(dt.getDate()+1)){
    aDates.push(dt.toISOString().slice(0,10));
  }
  return aDates;
}

export default {
  fetchClient,
  getTokenWithCredentials,
  validatePayload,
  fullRangeDates
}
